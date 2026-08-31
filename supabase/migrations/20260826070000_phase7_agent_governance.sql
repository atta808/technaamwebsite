-- =================================================================================
-- PHASE 7A — OPENCLAW GOVERNANCE FOUNDATION
-- Additive Agent Write Boundary
-- =================================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Roles and Authenticator Mappings
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_contributor') THEN
        CREATE ROLE agent_contributor NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_reviewer') THEN
        CREATE ROLE agent_reviewer NOLOGIN;
    END IF;
END
$$;

GRANT agent_contributor TO authenticator;
GRANT agent_reviewer TO authenticator;

-- 2. Schema Definitions

-- Agent Proposals Staging Table
CREATE TABLE public.agent_proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL,
    proposal_type text NOT NULL CHECK (proposal_type IN ('suggest_technology', 'suggest_relationship', 'suggest_retail_observation')),
    status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'promoted', 'rejected', 'superseded', 'retracted')),
    payload jsonb NOT NULL,
    source_url text NOT NULL,
    confidence numeric(4,3) CHECK (confidence >= 0 AND confidence <= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamptz
);
CREATE INDEX idx_agent_proposals_status ON public.agent_proposals(status);

-- Technology Identifiers (Duplicate Detection)
CREATE TABLE public.technology_identifiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tech_entity_id uuid NOT NULL REFERENCES public.technology_entities(id) ON DELETE CASCADE,
    identifier_type text NOT NULL,
    identifier_value text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT technology_identifiers_type_val_key UNIQUE (identifier_type, identifier_value)
);
CREATE INDEX idx_technology_identifiers_type_val ON public.technology_identifiers(identifier_type, identifier_value);

-- Agent Audit Log
CREATE TABLE public.agent_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id uuid NOT NULL REFERENCES public.agent_proposals(id) ON DELETE RESTRICT,
    agent_id uuid NOT NULL,
    action text NOT NULL,
    canonical_table_affected text NOT NULL,
    canonical_record_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Grants and RLS Hardening

-- Baseline hardening (Optional but safe for new schemas to ensure explicit grants win out)
GRANT USAGE ON SCHEMA public TO agent_contributor, agent_reviewer;
GRANT USAGE ON SCHEMA commercial TO agent_contributor, agent_reviewer;

-- RLS Enforcement
ALTER TABLE public.agent_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technology_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_log ENABLE ROW LEVEL SECURITY;

-- Contributor SELECT logic (can only read own proposals + canonical data)
CREATE POLICY "Agent contributor can read own proposals" ON public.agent_proposals
    FOR SELECT TO agent_contributor USING (agent_id = auth.uid());
GRANT SELECT ON public.agent_proposals TO agent_contributor;
GRANT SELECT ON public.technology_entities, public.tech_relationships TO agent_contributor;
GRANT SELECT ON commercial.stores, commercial.sellers, commercial.retail_offers TO agent_contributor;

-- Reviewer SELECT logic
CREATE POLICY "Agent reviewer can read all proposals" ON public.agent_proposals
    FOR SELECT TO agent_reviewer USING (true);
CREATE POLICY "Agent reviewer can read identifiers" ON public.technology_identifiers
    FOR SELECT TO agent_reviewer USING (true);
CREATE POLICY "Agent reviewer can read audit log" ON public.agent_audit_log
    FOR SELECT TO agent_reviewer USING (true);

GRANT SELECT ON public.agent_proposals TO agent_reviewer;
GRANT SELECT ON public.technology_identifiers TO agent_reviewer;
GRANT SELECT ON public.agent_audit_log TO agent_reviewer;
GRANT SELECT ON public.technology_entities, public.tech_relationships TO agent_reviewer;
GRANT SELECT ON commercial.stores, commercial.sellers, commercial.retail_offers TO agent_reviewer;


-- 4. Governance Functions (RPCs)

-- Helper to safely get the current role claim
CREATE OR REPLACE FUNCTION public.get_jwt_role_claim() RETURNS text AS $$
BEGIN
  RETURN coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN '';
END;
$$ LANGUAGE plpgsql STABLE;

-- Submit Agent Proposal
CREATE OR REPLACE FUNCTION public.submit_agent_proposal(
    p_type text,
    p_payload jsonb,
    p_source text,
    p_confidence numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id uuid;
    caller_role text;
BEGIN
    caller_role := public.get_jwt_role_claim();
    IF caller_role != 'agent_contributor' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_type = 'suggest_retail_observation' THEN
        RAISE EXCEPTION 'Retail pilot disabled';
    END IF;

    IF p_type NOT IN ('suggest_technology', 'suggest_relationship') THEN
        RAISE EXCEPTION 'Invalid proposal type';
    END IF;

    INSERT INTO public.agent_proposals (agent_id, proposal_type, status, payload, source_url, confidence)
    VALUES (auth.uid(), p_type, 'pending_review', p_payload, p_source, p_confidence)
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

-- Approve Agent Proposal
CREATE OR REPLACE FUNCTION public.approve_agent_proposal(
    p_proposal_id uuid,
    p_target_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;


-- Promote Technology Proposal
CREATE OR REPLACE FUNCTION public.promote_technology_proposal(
    p_proposal_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prop record;
    caller_role text;
    new_tech_id uuid;
    src_id uuid;
    j_identifier jsonb;
    payload_name text;
    payload_slug text;
    payload_entity_type text;
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

    -- Insert Canonical (let DB trigger unique constraint on slug if exists)
    INSERT INTO public.technology_entities (entity_type, slug, name, is_published)
    VALUES (payload_entity_type, payload_slug, payload_name, true)
    RETURNING id INTO new_tech_id;

    -- Handle identifiers mapping if provided
    IF jsonb_typeof(prop.payload->'identifiers') = 'array' THEN
        FOR j_identifier IN SELECT * FROM jsonb_array_elements(prop.payload->'identifiers')
        LOOP
            -- This relies on UNIQUE(type, value) throwing error inherently if duplicates exist
            INSERT INTO public.technology_identifiers (tech_entity_id, identifier_type, identifier_value)
            VALUES (new_tech_id, j_identifier->>'type', j_identifier->>'value');
        END LOOP;
    END IF;

    -- Source Resolution
    SELECT id INTO src_id FROM public.sources WHERE url = prop.source_url LIMIT 1;
    IF src_id IS NULL THEN
        INSERT INTO public.sources (slug, name, url)
        VALUES (
            encode(digest(prop.source_url, 'sha256'), 'hex'),
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
$$;


-- Promote Relationship Proposal
CREATE OR REPLACE FUNCTION public.promote_relationship_proposal(
    p_proposal_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Validate Entity Exists
    IF NOT EXISTS (SELECT 1 FROM public.technology_entities WHERE id = src_tech_id) THEN
        RAISE EXCEPTION 'Source entity does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.technology_entities WHERE id = tgt_tech_id) THEN
        RAISE EXCEPTION 'Target entity does not exist';
    END IF;

    -- Source Resolution (Minimal, reuse logic)
    SELECT id INTO src_id FROM public.sources WHERE url = prop.source_url LIMIT 1;
    IF src_id IS NULL THEN
        INSERT INTO public.sources (slug, name, url)
        VALUES (
            encode(digest(prop.source_url, 'sha256'), 'hex'),
            coalesce(substring(prop.source_url from 'https?://([^/]+)'), 'Unknown Agent Source'),
            prop.source_url
        ) RETURNING id INTO src_id;
    END IF;

    -- Insert Relationship
    INSERT INTO public.tech_relationships (source_entity_id, target_entity_id, relationship_type, status, confidence)
    VALUES (src_tech_id, tgt_tech_id, rel_type, 'approved', prop.confidence)
    RETURNING id INTO new_rel_id;

    -- Insert Evidence (Optional graph evidence link)
    INSERT INTO public.evidence (entity_type, entity_id, tech_entity_id, source_id, field_name, observed_value, confidence)
    VALUES ('tech_relationships', new_rel_id, src_tech_id, src_id, 'relationship', rel_type, prop.confidence);

    -- Audit and Status Update
    UPDATE public.agent_proposals SET status = 'promoted' WHERE id = p_proposal_id;

    INSERT INTO public.agent_audit_log (proposal_id, agent_id, action, canonical_table_affected, canonical_record_id, reviewer_id)
    VALUES (p_proposal_id, prop.agent_id, 'insert', 'tech_relationships', new_rel_id, auth.uid());

END;
$$;


-- Promote Retail Observation
CREATE OR REPLACE FUNCTION public.promote_retail_observation(
    p_proposal_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
BEGIN
    caller_role := public.get_jwt_role_claim();
    IF caller_role != 'agent_reviewer' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RAISE EXCEPTION 'Retail pilot disabled';
END;
$$;

-- 5. Revoke and Grant RPC Access
REVOKE EXECUTE ON FUNCTION public.submit_agent_proposal(text, jsonb, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_agent_proposal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_technology_proposal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_relationship_proposal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_retail_observation(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_agent_proposal(text, jsonb, text, numeric) TO agent_contributor;
GRANT EXECUTE ON FUNCTION public.approve_agent_proposal(uuid, text) TO agent_reviewer;
GRANT EXECUTE ON FUNCTION public.promote_technology_proposal(uuid) TO agent_reviewer;
GRANT EXECUTE ON FUNCTION public.promote_relationship_proposal(uuid) TO agent_reviewer;
GRANT EXECUTE ON FUNCTION public.promote_retail_observation(uuid) TO agent_reviewer;
