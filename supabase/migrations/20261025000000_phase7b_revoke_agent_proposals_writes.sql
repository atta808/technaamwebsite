-- Phase 7B corrective migration: remove direct client write access to proposals.
--
-- Context
-- public.agent_proposals was created in Phase 7A without an explicit REVOKE.
-- Supabase applies schema-level default privileges that grant ALL table
-- privileges (INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER,
-- and, on PostgreSQL 17, MAINTAIN) to anon and authenticated for objects
-- created in `public` by postgres and supabase_admin.
--
-- All proposal writes are intended to flow through SECURITY DEFINER RPCs
-- (submit_agent_proposal, approve_agent_proposal, promote_technology_proposal,
-- promote_relationship_proposal), which execute as their owner (postgres) and
-- are unaffected by this migration.
--
-- Why not REVOKE ALL PRIVILEGES?
-- The API route performs a duplicate-proposal SELECT before invoking the
-- submit RPC. For an ordinary authenticated user that SELECT currently returns
-- no rows under RLS and the request then fails with a clean 403 at the RPC.
-- Revoking SELECT would make that lookup fail with a permission error instead,
-- causing the route to return 502 and changing the non-contributor contract.
-- SELECT is therefore intentionally retained on anon and authenticated; it is
-- inert because no SELECT policy exists for those roles.
--
-- Effect
-- anon and authenticated lose INSERT, UPDATE, DELETE, TRUNCATE, and the inert
-- REFERENCES, TRIGGER, and MAINTAIN privileges, removing the RLS-bypassing
-- TRUNCATE path while preserving the existing 403 flow. The agent roles keep
-- their SELECT grants and policies.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.agent_proposals
    FROM anon, authenticated;

GRANT SELECT ON TABLE public.agent_proposals
    TO agent_contributor, agent_reviewer;
