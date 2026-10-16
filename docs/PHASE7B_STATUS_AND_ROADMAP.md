# Phase 7B — Status, Verification Log, and Roadmap

**Repository:** `atta808/technaamwebsite`  
**Working branch:** `technaam-phase7b-repair`  
**Status:** Core local proposal flow verified; final regression and release checks remain  
**Last updated:** 2026-10-15

> This document records observed local test results separately from work that is still pending. It does not certify production readiness.

## 1. Scope and safety boundaries

Phase 7B adds a guarded API for agent proposals. The API authenticates the caller, validates the request, and submits through the `submit_agent_proposal` database function rather than directly writing canonical technology records.

Keep these boundaries in place:

- Do not merge this repair branch into `main` until the remaining checks and a deliberate branch review are complete.
- Do not modify the Phase 7A governance migration as part of this repair.
- Do not broaden database grants to make an API test pass.
- Keep local test configuration separate from hosted/production configuration.
- Never commit passwords, access tokens, service-role keys, or populated local environment files.
- Retail-observation proposals remain disabled for this pilot.

## 2. Implemented on the repair branch

The branch contains the Phase 7B API/auth implementation and a static contract-check script:

- `src/lib/agent/auth.ts` — extracts a Bearer token and validates it with Supabase Auth.
- `src/app/api/agent/proposals/route.ts` — Node.js API route with request validation, HTTPS source URL validation, confidence bounds, proposal-type checks, rate limiting, best-effort duplicate detection, and RPC submission.
- `scripts/test-agent-api.mjs` — static source/contract checks (not a full live integration suite).
- `package.json` — exposes the script as `npm run test:agent-api`.

The route submits through `submit_agent_proposal`; it should not directly create canonical records. Duplicate detection in the route is best-effort and is not an atomic, distributed idempotency guarantee. Its in-memory rate limiter is per process and is not a distributed production rate limiter.

## 3. Local verification log — 2026-10-15

The following outcomes were observed in the local Docker/Supabase + Next.js environment:

| Check | Observed result | Notes |
|---|---|---|
| Local Supabase password login for contributor test user | PASS | Login returned an access token. |
| API route responds to GET | PASS | `GET /api/agent/proposals` returned HTTP 405, as intended. |
| Valid technology proposal from contributor | PASS | HTTP 201; response status `pending_review`; `duplicate: false`. |
| Proposal persisted in local PostgreSQL | PASS | The returned proposal ID was found in `public.agent_proposals` with status `pending_review`. |
| Repeat of identical pending proposal | PASS | HTTP 200; same proposal ID; `duplicate: true`. |
| Ordinary authenticated user without an active agent role | PASS | User had no row in `public.agent_role_assignments`; API returned HTTP 403 after error mapping was updated. |
| Database function execution grants | INSPECTED | `submit_agent_proposal` had EXECUTE for `agent_contributor`, `postgres`, and `service_role`; no broad grant was added. |
| Retail-observation restriction | CODE INSPECTED | Route contains a rejection for `suggest_retail_observation` with HTTP 403. A live request test is still pending. |

**Important:** The ordinary-user authorization test initially produced HTTP 502 because PostgreSQL reported permission denied for `submit_agent_proposal`. The route error mapping was then changed to return HTTP 403 for permission/role errors, and the same ordinary-user test returned HTTP 403. This confirms the tested API response, but does not replace a broader security review.

The successful contributor proposal was a clearly labelled local test entry named `Phase 7B Local Test Technology`. Its local proposal ID was `21851478-432b-4b04-82ab-9ca467ea9a2f`. It is test data, not a canonical technology record.

## 4. Remaining Phase 7B work — in order

### P0 — Finish local verification

- [ ] Run `npm run test:agent-api`; record the actual output and fix failures.
- [ ] Live-test `suggest_retail_observation`; confirm HTTP 403 and confirm no proposal was inserted.
- [ ] Test malformed JSON, missing fields, invalid HTTPS source URL, invalid confidence, and unsupported proposal types.
- [ ] Test missing, malformed, and expired Bearer tokens; expected result is HTTP 401.
- [ ] Re-run the contributor submission and ordinary-user rejection tests after any code changes.
- [ ] Check that duplicate behavior is documented as best-effort, not guaranteed atomic idempotency.

### P1 — Type, build, and review

- [ ] Run the repository's available TypeScript check (if configured).
- [ ] Run `npm run build` in the local project and capture the actual result.
- [ ] Review `git diff` and `git status`; verify only intended Phase 7B files changed.
- [ ] Verify no Phase 7A migration, unrelated feature, secret, or populated environment file was changed or committed.
- [ ] Review API error logging and ensure responses do not expose database internals or credentials.
- [ ] Review rate limiting and duplicate detection for deployment requirements; the current in-memory implementations are not distributed.

### P2 — Branch and handoff

- [ ] Commit any remaining fixes to `technaam-phase7b-repair`.
- [ ] Compare the repair branch against `technaam-intelligence` and separately understand its relationship to `main`.
- [ ] Prepare a concise review summary with test evidence, known limitations, and changed-file list.
- [ ] Only after review, decide whether to open a pull request. Do not merge or deploy merely because the local smoke tests pass.

## 5. Future roadmap (proposed; not yet implemented or approved)

The sequence below is a planning proposal. Each item should be scoped and reviewed before implementation.

### Phase 7B completion — Governance API hardening
- Complete the remaining local tests and build checks above.
- Ensure the database function remains the authoritative permission/governance boundary.
- Decide whether production needs shared/distributed rate limiting and stronger atomic idempotency.
- Document the required environment variables and safe local setup without publishing secret values.

### Next phase — Proposal review and controlled approval
- Define authorized reviewer roles and review transitions.
- Add or verify reviewer-facing listing/detail and approve/reject workflows only after the database policy and audit requirements are agreed.
- Record review decisions and reasons in an auditable manner.
- Test that contributors cannot approve their own proposals unless an explicit policy permits it.

### Following phase — Observability and operational safety
- Add structured, redacted logs and actionable error monitoring.
- Define limits, abuse controls, retry behavior, and safe failure modes.
- Add integration/regression tests for authentication, authorization, governance validation, duplicates, and disabled proposal types.

### Following phase — Deployment and release readiness
- Review hosted Supabase configuration and token-role assignment independently of local Docker results.
- Validate production secrets and environment variables without exposing them.
- Use a reviewed pull request, staging validation, rollback plan, and explicit release approval before deployment.
- Keep Phase 7A stable unless a separately reviewed migration is required.

## 6. Current conclusion

The local contributor proposal path, local persistence, duplicate response, and ordinary-user denial have been demonstrated. Retail rejection has been inspected in source but not yet exercised live. The automated test script, full build, final diff review, and release review remain outstanding. **Phase 7B is not yet declared complete or production-ready.**
