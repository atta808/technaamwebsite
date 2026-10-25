-- Phase 7B Stage 1: harden default privileges for future public tables.
--
-- Supabase installs schema-level default privileges that grant FULL table
-- privileges (INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER,
-- MAINTAIN) to anon, authenticated, and service_role for objects created in
-- `public` by postgres. Phase 7B corrected the existing governance tables one
-- by one; this migration prevents future tables created by postgres (the
-- migration runner and Studio SQL editor role) from inheriting the same
-- unnecessary write surface, including the RLS-bypassing TRUNCATE path.
--
-- Scope: future TABLES only, schema `public`, creator `postgres`. anon and
-- authenticated keep SELECT (the established public-read pattern), and
-- service_role defaults are untouched. Sequence and function defaults are out
-- of scope, and existing table grants are unaffected (default privileges only
-- apply to objects created after this change).
--
-- Limitation: the matching supabase_admin default cannot be altered here
-- because the runner role (postgres) is not a superuser and is not a member of
-- supabase_admin; ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin requires a
-- superuser/supabase_admin session. User tables are created by postgres, so
-- this covers the migration and Studio SQL-editor workflows.
--
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLES FROM anon, authenticated;
