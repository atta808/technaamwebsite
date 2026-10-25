-- Phase 7B Batch 2: remove all direct anon/authenticated privileges from the
-- internal / RPC-only tables.
--
-- These tables are written only by SECURITY DEFINER functions (postgres owner)
-- or by service_role-invoker RPCs, and they deliberately define no
-- anon/authenticated RLS policies (the initial migration documents pricing_history
-- and change_log as server-only). The Supabase default privileges nevertheless
-- granted anon and authenticated full table privileges at creation time,
-- including the RLS-bypassing TRUNCATE path.
--
-- Revoke all direct anon/authenticated privileges. service_role and postgres
-- grants are untouched, so seed/import, publication, and promotion workflows
-- are unaffected.
--
REVOKE ALL PRIVILEGES
    ON TABLE public.affiliate_programs,
              public.change_log,
              public.evidence,
              public.pricing_history,
              public.sources
    FROM anon, authenticated;
