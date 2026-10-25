-- Phase 7B corrective migration: make public.tech_categories internal.
--
-- tech_categories is a technology taxonomy dimension created in Phase 6C.1. It
-- is not read by the application, not populated by technaam_seed_import, and not
-- written by any SECURITY DEFINER RPC; public.technology_entities.tech_category_id
-- is its only reference and remains nullable. RLS was left disabled while the
-- Supabase default privileges granted anon and authenticated full table
-- privileges (including the RLS-bypassing TRUNCATE path), so anonymous clients
-- could read and mutate the taxonomy.
--
-- Close the anonymous surface: enable RLS and remove all direct
-- anon/authenticated privileges. postgres (owner) and service_role (BYPASSRLS)
-- retain full access, so administrative and seed workflows are unaffected. No
-- function or application path references this table, so enabling RLS has no
-- other effect.

ALTER TABLE public.tech_categories ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
    ON TABLE public.tech_categories
    FROM anon, authenticated;
