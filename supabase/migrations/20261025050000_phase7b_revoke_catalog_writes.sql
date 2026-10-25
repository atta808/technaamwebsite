-- Phase 7B Batch 1: revoke direct write privileges on public-read catalog
-- tables from anon and authenticated.
--
-- These tables expose published rows to clients through SELECT-only RLS
-- policies. The Supabase default privileges nevertheless granted anon and
-- authenticated full table privileges at creation time, leaving INSERT,
-- UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, and MAINTAIN available even
-- though RLS has no write policies. TRUNCATE in particular bypasses RLS and is
-- a data-loss path.
--
-- All writes to these tables flow through SECURITY DEFINER functions owned by
-- postgres or through service_role-invoker RPCs (technaam_seed_import,
-- technaam_publish_product), none of which use anon/authenticated privileges.
-- SELECT is retained so public reads keep working; service_role and postgres
-- grants are untouched.
--
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.benchmarks,
              public.categories,
              public.features,
              public.hardware_entities,
              public.hardware_requirements,
              public.integrations,
              public.models,
              public.os_entities,
              public.pricing_plans,
              public.product_features,
              public.product_models,
              public.products,
              public.technaam_scores,
              public.tech_relationships,
              public.technology_entities,
              public.vendors
    FROM anon, authenticated;
