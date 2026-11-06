-- =================================================================================
-- PHASE 7B — GOVERNANCE HARDENING — ROLLBACK
-- Restores the exact pre-hardening definitions of the reviewer RPCs.
-- =================================================================================
--
-- How to roll back
--   1. Run this file against the local Supabase database as postgres, e.g.:
--        supabase db execute --file supabase/rollbacks/20261106000000_phase7b_governance_hardening.rollback.sql
--      or execute its contents through psql.
--   2. Re-run the Phase 7B reviewer-promotion test suite to confirm prior behavior.
--
-- What is restored
--   The original function bodies, SECURITY DEFINER, search_path, and the
--   original validation/status-transition logic. Function ownership (postgres)
--   and EXECUTE grants are preserved automatically by CREATE OR REPLACE because
--   the signatures are unchanged; no grant statements are required.
--
-- What is NOT touched
--   No proposal data, canonical records, tables, constraints, indexes, RLS
--   policies, or grants are dropped or modified.
--
-- REVIEW BEFORE ANY PRODUCTION USE. This rollback restores last-writer-wins
-- approval and status-guard-only promotion (the pre-hardening behavior).


CREATE OR REPLACE FUNCTION public.approve_agent_proposal(p_proposal_id uuid, p_target_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    curr_status text;
    caller_role text;
BEGIN
    caller_role := public.get_jwt_role_claim();
    IF caller_role != 'agent_reviewer' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_target_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid target status. Must be approved or rejected.';
    END IF;

    SELECT status INTO curr_status FROM public.agent_proposals WHERE id = p_proposal_id;
    IF curr_status IS NULL THEN
        RAISE EXCEPTION 'Proposal not found';
    END IF;
    IF curr_status != 'pending_review' THEN
        RAISE EXCEPTION 'Invalid state transition';
    END IF;

    UPDATE public.agent_proposals
    SET status = p_target_status,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_proposal_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.promote_technology_proposal(p_proposal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    prop record;
    caller_role text;
    new_tech_id uuid;
    src_id uuid;
    j_identifier jsonb;
    payload_name text;
    payload_slug text;
    payload_entity_type text;
    ident_type text;
    ident_val text;
BEGIN
    caller_role := public.get_jwt_role_claim();
    IF caller_role != 'agent_reviewer' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT * INTO prop FROM public.agent_proposals WHERE id = p_proposal_id;
    IF prop IS NULL THEN RAISE EXCEPTION 'Proposal not found'; END IF;
    IF prop.status != 'approved' THEN RAISE EXCEPTION 'Invalid state transition'; END IF;
    IF prop.proposal_type != 'suggest_technology' THEN RAISE EXCEPTION 'Invalid proposal type for this function'; END IF;

    -- Extract payload
    payload_name := prop.payload->>'name';
    payload_slug := prop.payload->>'slug';
    payload_entity_type := prop.payload->>'entity_type';

    IF payload_name IS NULL OR payload_slug IS NULL OR payload_entity_type IS NULL THEN
        RAISE EXCEPTION 'Payload missing required fields (name, slug, entity_type)';
    END IF;

    IF payload_entity_type NOT IN ('product', 'hardware', 'os', 'mobile', 'other') THEN
        RAISE EXCEPTION 'Invalid entity_type constraint';
    END IF;

    -- Insert Canonical - Set to unpublished explicitly to preserve human publication authority
    INSERT INTO public.technology_entities (entity_type, slug, name, is_published)
    VALUES (payload_entity_type, payload_slug, payload_name, false)
    RETURNING id INTO new_tech_id;

    -- Handle identifiers mapping if provided
    IF jsonb_typeof(prop.payload->'identifiers') = 'array' THEN
        FOR j_identifier IN SELECT * FROM jsonb_array_elements(prop.payload->'identifiers')
        LOOP
            ident_type := trim(j_identifier->>'type');
            ident_val := trim(j_identifier->>'value');

            IF ident_type IS NULL OR ident_type = '' OR ident_val IS NULL OR ident_val = '' THEN
                RAISE EXCEPTION 'Identifier type and value must be non-empty strings';
            END IF;

            -- This relies on UNIQUE(type, value) throwing error inherently if duplicates exist
            INSERT INTO public.technology_identifiers (tech_entity_id, identifier_type, identifier_value)
            VALUES (new_tech_id, ident_type, ident_val);
        END LOOP;
    END IF;

    -- Source Resolution
    SELECT id INTO src_id FROM public.sources WHERE url = prop.source_url LIMIT 1;
    IF src_id IS NULL THEN
        INSERT INTO public.sources (slug, name, url)
        VALUES (
            encode(extensions.digest(prop.source_url, 'sha256'), 'hex'),
            coalesce(substring(prop.source_url from 'https?://([^/]+)'), 'Unknown Agent Source'),
            prop.source_url
        ) RETURNING id INTO src_id;
    END IF;

    -- Insert Evidence
    INSERT INTO public.evidence (entity_type, entity_id, tech_entity_id, source_id, field_name, observed_value, confidence)
    VALUES ('technology_entities', new_tech_id, new_tech_id, src_id, 'existence', 'true', prop.confidence);

    -- Audit and Status Update
    UPDATE public.agent_proposals SET status = 'promoted' WHERE id = p_proposal_id;

    INSERT INTO public.agent_audit_log (proposal_id, agent_id, action, canonical_table_affected, canonical_record_id, reviewer_id)
    VALUES (p_proposal_id, prop.agent_id, 'insert', 'technology_entities', new_tech_id, auth.uid());

END;
$function$;


CREATE OR REPLACE FUNCTION public.promote_relationship_proposal(p_proposal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    prop record;
    caller_role text;
    src_tech_id uuid;
    tgt_tech_id uuid;
    rel_type text;
    src_id uuid;
    new_rel_id uuid;
BEGIN
    caller_role := public.get_jwt_role_claim();
    IF caller_role != 'agent_reviewer' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT * INTO prop FROM public.agent_proposals WHERE id = p_proposal_id;
    IF prop IS NULL THEN RAISE EXCEPTION 'Proposal not found'; END IF;
    IF prop.status != 'approved' THEN RAISE EXCEPTION 'Invalid state transition'; END IF;
    IF prop.proposal_type != 'suggest_relationship' THEN RAISE EXCEPTION 'Invalid proposal type for this function'; END IF;

    -- Extract payload
    src_tech_id := (prop.payload->>'source_entity_id')::uuid;
    tgt_tech_id := (prop.payload->>'target_entity_id')::uuid;
    rel_type := prop.payload->>'relationship_type';

    IF src_tech_id IS NULL OR tgt_tech_id IS NULL OR rel_type IS NULL THEN
         RAISE EXCEPTION 'Payload missing required fields (source_entity_id, target_entity_id, relationship_type)';
    END IF;

    IF rel_type NOT IN ('runs_on', 'requires', 'compatible_with', 'incompatible_with', 'depends_on', 'integrates_with', 'alternative_to', 'replaces', 'uses_model', 'requires_hardware', 'powered_by', 'contains') THEN
         RAISE EXCEPTION 'Invalid relationship type';
    END IF;

    -- Validate Entity Exists
    IF NOT EXISTS (SELECT 1 FROM public.technology_entities WHERE id = src_tech_id) THEN
        RAISE EXCEPTION 'Source entity does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.technology_entities WHERE id = tgt_tech_id) THEN
        RAISE EXCEPTION 'Target entity does not exist';
    END IF;

    -- Source Resolution
    SELECT id INTO src_id FROM public.sources WHERE url = prop.source_url LIMIT 1;
    IF src_id IS NULL THEN
        INSERT INTO public.sources (slug, name, url)
        VALUES (
            encode(extensions.digest(prop.source_url, 'sha256'), 'hex'),
            coalesce(substring(prop.source_url from 'https?://([^/]+)'), 'Unknown Agent Source'),
            prop.source_url
        ) RETURNING id INTO src_id;
    END IF;

    -- Insert Relationship
    INSERT INTO public.tech_relationships (source_entity_id, target_entity_id, relationship_type, status, confidence)
    VALUES (src_tech_id, tgt_tech_id, rel_type, 'approved', prop.confidence)
    RETURNING id INTO new_rel_id;

    -- Insert Evidence
    INSERT INTO public.evidence (entity_type, entity_id, tech_entity_id, source_id, field_name, observed_value, confidence)
    VALUES ('tech_relationships', new_rel_id, src_tech_id, src_id, 'relationship', rel_type, prop.confidence);

    -- Audit and Status Update
    UPDATE public.agent_proposals SET status = 'promoted' WHERE id = p_proposal_id;

    INSERT INTO public.agent_audit_log (proposal_id, agent_id, action, canonical_table_affected, canonical_record_id, reviewer_id)
    VALUES (p_proposal_id, prop.agent_id, 'insert', 'tech_relationships', new_rel_id, auth.uid());

END;
$function$;
