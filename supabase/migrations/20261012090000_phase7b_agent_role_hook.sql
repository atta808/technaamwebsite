-- Phase 7B — controlled JWT role assignment for agent governance.
-- This migration is intentionally additive. It does not enable the Auth Hook
-- in the Supabase Dashboard and does not assign any user a role.

CREATE TABLE public.agent_role_assignments (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    role text NOT NULL
        CHECK (role IN ('agent_contributor', 'agent_reviewer')),
    -- Fail closed: a new row grants no role until an administrator activates it.
    is_active boolean NOT NULL DEFAULT false,
    grant_reason text NOT NULL
        CHECK (length(btrim(grant_reason)) > 0),
    granted_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
    granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_role_assignments ENABLE ROW LEVEL SECURITY;

-- No client-facing role may read or mutate the allowlist. Provisioning is
-- deliberately administrative-only through a trusted database administrator.
REVOKE ALL PRIVILEGES ON TABLE public.agent_role_assignments
    FROM PUBLIC, anon, authenticated, service_role,
         agent_contributor, agent_reviewer, supabase_auth_admin;

-- Supabase Auth runs the hook as supabase_auth_admin. It needs read-only access
-- to the assignment table, constrained by this RLS policy.
GRANT SELECT ON TABLE public.agent_role_assignments TO supabase_auth_admin;

CREATE POLICY "supabase_auth_admin can read agent role assignments"
    ON public.agent_role_assignments
    FOR SELECT
    TO supabase_auth_admin
    USING (true);

CREATE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $function$
DECLARE
    claims jsonb;
    assigned_role text;
    subject_id uuid;
BEGIN
    claims := event -> 'claims';

    IF jsonb_typeof(claims) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Custom access token hook expected an object-valued claims property';
    END IF;

    IF COALESCE(event ->> 'user_id', '') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        RAISE EXCEPTION 'Custom access token hook expected a valid user_id';
    END IF;

    subject_id := (event ->> 'user_id')::uuid;

    SELECT assignment.role
      INTO assigned_role
      FROM public.agent_role_assignments AS assignment
     WHERE assignment.user_id = subject_id
       AND assignment.is_active = true;

    -- Only explicitly allowlisted, active users have their database role changed.
    -- Everyone else keeps the role supplied by Supabase Auth (normally
    -- "authenticated"), so this hook does not grant agent privileges broadly.
    IF assigned_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{role}', to_jsonb(assigned_role), true);
    END IF;

    RETURN jsonb_build_object('claims', claims);
END;
$function$;

-- Use invoker permissions rather than SECURITY DEFINER. Supabase Auth has only
-- schema usage, EXECUTE on this hook, and SELECT via the RLS policy.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
    TO supabase_auth_admin;

REVOKE ALL PRIVILEGES ON FUNCTION public.custom_access_token_hook(jsonb)
    FROM PUBLIC, anon, authenticated, service_role,
         agent_contributor, agent_reviewer;
