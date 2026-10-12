# Phase 7B — Agent Role Hook Rollout

## Status

**Implemented on the phase7b repair branch for review only. Not applied to the production database and not enabled in the Supabase Dashboard.**

The migration adds:
- `public.agent_role_assignments`, an administrative allowlist keyed to `auth.users.id`;
- a Custom Access Token Hook function named `public.custom_access_token_hook(event jsonb)`;
- least-privilege grants so `supabase_auth_admin` can execute the function and read the allowlist, but client-facing roles cannot read or mutate role assignments.

The function is deliberately **not** `SECURITY DEFINER`. It preserves the claims supplied by Supabase Auth for users without an active allowlist row. For a user with an active row, it changes the JWT `role` claim to the explicitly assigned value: `agent_contributor` or `agent_reviewer`.

A new assignment defaults to **inactive**. An administrator must explicitly activate it. A row must be deliberately created and activated by a database administrator; no Auth user automatically receives either role.

## Important current-state note

During investigation, a SQL query against `auth.users` returned `0`, while the Authentication → Users page displayed a conflicting estimated-count footer. Reconcile that discrepancy and confirm the intended project before provisioning any account or enabling the hook.

Phase 7A governance is documented as **NOT VERIFIED**. Static checks and a successful application build do not substitute for real database-role and RLS tests.

## Review and rollout sequence

Do not perform these steps automatically as part of a deployment. Review each step and verify the target environment.

1. **Review the migration** `supabase/migrations/20261012090000_phase7b_agent_role_hook.sql` and this document. It is additive; it does not enable a Dashboard hook or write any assignment row.
2. **Apply the migration first in a non-production/test environment** and verify the table, RLS policy, grants, and function privileges. Keep the production hook disabled until the entire test sequence succeeds.
3. **Resolve the Auth user count discrepancy.** Confirm the correct Supabase project/environment and confirm a real intended agent user exists in `auth.users`.
4. **Create or invite the intended Auth user through an approved administrative process.** Do not enable unrestricted public signup just to provision an agent.
5. **Assign and activate a role explicitly using the SQL Editor as a trusted database administrator.** Replace the placeholder UUID with the verified Auth user UUID; never run this example unchanged:

   ```sql
   INSERT INTO public.agent_role_assignments
       (user_id, role, is_active, grant_reason)
   VALUES
       ('<verified-auth-user-uuid>', 'agent_contributor', true,
        'Approved Phase 7B pilot access');
   ```

   Only one role is allowed per user. Change a role only through a reviewed administrative operation. Client/API roles intentionally have no write access to this table.
6. **Configure the hook in Authentication → Auth Hooks** only after the migration is applied and verified. Add a Custom Access Token Hook using the Postgres function `public.custom_access_token_hook`. Do not create a second hook with a conflicting purpose.
7. **Test a controlled non-production account.** After signing in again/refreshing its token:
   - an active contributor allowlist row yields JWT `role = agent_contributor`;
   - an active reviewer row yields JWT `role = agent_reviewer`;
   - a user without an active assignment keeps the original Supabase `role` claim;
   - deactivate an assignment, obtain a fresh token, and verify the original role returns;
   - the contributor can submit only through `submit_agent_proposal`, and cannot directly write canonical entities;
   - the reviewer can only exercise reviewer-granted permissions/RPCs;
   - anon and ordinary authenticated users cannot execute the hook or write the allowlist.
8. Only after all tests pass in the intended environment should an administrator schedule a reviewed production rollout. Do not paste JWTs, service keys, passwords, or environment files into tickets or chat.

## Verification

Run the static contract checks from the project root:

```cmd
npm run test:agent-api
npm run test:agent-role-hook
npx tsc --noEmit
npm run build
```

The role-hook test checks migration source patterns only. It does **not** execute PostgreSQL, enable the Auth Hook, confirm a JWT claim, or prove RLS behavior. The actual governance integration test, `npm run test:phase7-governance`, must run against a test database with Phase 7A applied and complete successfully before claiming database-level verification.

## Rollback guidance

If not yet enabled in the Dashboard, the migration can remain unapplied while code review continues. If the hook has been enabled in a test environment, disable it in the Dashboard before any rollback. Do not drop role assignments or revert grants in production without a separate review and backup. Removing a role assignment takes effect for new/refreshed tokens; already-issued JWTs may remain valid until expiration.
