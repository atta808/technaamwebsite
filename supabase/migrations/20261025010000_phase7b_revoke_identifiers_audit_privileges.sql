-- Phase 7B corrective migration: remove direct client access to technology
-- identifiers and the agent audit log.
--
-- Context
-- public.technology_identifiers and public.agent_audit_log were created in
-- Phase 7A without an explicit REVOKE. As with public.agent_proposals,
-- Supabase applies schema-level default privileges that grant ALL table
-- privileges (INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER,
-- and, on PostgreSQL 17, MAINTAIN) to anon and authenticated for objects
-- created in `public` by postgres and supabase_admin.
--
-- Intended write paths
-- All writes to these two tables flow through SECURITY DEFINER RPCs owned by
-- postgres, which execute as the function owner and are unaffected by
-- privileges revoked from anon and authenticated:
--   - promote_technology_proposal inserts into technology_identifiers and
--     agent_audit_log.
--   - promote_relationship_proposal inserts into agent_audit_log.
-- Those RPCs remain EXECUTE-granted to agent_reviewer only.
--
-- Why SELECT is revoked here
-- Unlike public.agent_proposals, no application code performs a direct SELECT
-- against these tables as anon or authenticated, and no SELECT policy exists
-- for those roles. SELECT is therefore an unnecessary direct privilege and is
-- revoked alongside the write privileges.
--
-- Reviewer read access is preserved
-- agent_reviewer keeps its SELECT grants, and its FOR SELECT USING (true) RLS
-- policies on both tables are untouched.
--
-- Effect
-- anon and authenticated lose all direct table privileges on
-- public.technology_identifiers and public.agent_audit_log, closing the
-- RLS-bypassing TRUNCATE path and removing the direct read/write surface.
-- SECURITY DEFINER write paths and agent_reviewer SELECT are unaffected.

REVOKE ALL PRIVILEGES
    ON TABLE public.technology_identifiers
    FROM anon, authenticated;

REVOKE ALL PRIVILEGES
    ON TABLE public.agent_audit_log
    FROM anon, authenticated;

-- Defensive re-assertion of the only intended client-facing grant.
GRANT SELECT ON TABLE public.technology_identifiers TO agent_reviewer;
GRANT SELECT ON TABLE public.agent_audit_log TO agent_reviewer;
