# TechNaam Intelligence Engineering Handoff

This document describes the current TechNaam Intelligence implementation in the
`technaam-web` repository. It is intended for future coding agents, including
Google Jules and Codex, so they can work on this branch without needing prior
chat history.

## 1. Project Overview

TechNaam is a Next.js 16 website owned by TechNaam. The existing site contains
marketing pages and LegalSphere/legal-tools content.

TechNaam Intelligence is the active extension on `technaam-intelligence`. Its
purpose is to provide source-verified product intelligence for AI coding,
local AI, and developer tools.

Current delivered surfaces:

- `/tools` — public product catalog
- `/tools/[slug]` — product intelligence detail
- `/compare/[comparison]` — reusable two-product comparison
- `/advisor` — deterministic stack recommendation MVP
- `/api/advisor` — server endpoint for advisor results

The intended long-term shape is a technology decision intelligence platform
backed by Supabase/PostgreSQL, with deterministic scoring as the authoritative
recommendation layer and a future LLM layer for explanation and personalization
only.

## 2. Repository Structure

Important paths:

- `src/app` — Next.js App Router routes
- `src/components` — UI components
- `src/lib` — Supabase clients, queries, and advisor domain logic
- `src/data/technaam-seed` — source-backed seed JSON
- `scripts` — validation, import, publication, and advisor test scripts
- `supabase/migrations` — SQL migrations
- `docs` — engineering handoff documents
- `package.json` — scripts and dependencies

Key subdirectories:

- `src/app/tools` — catalog and detail routes
- `src/app/compare` — comparison route
- `src/app/advisor` — advisor page
- `src/app/api/advisor` — advisor API
- `src/components/tools` — catalog UI
- `src/components/comparisons` — comparison UI
- `src/components/advisor` — advisor UI
- `src/lib/supabase` — browser/server/admin Supabase clients
- `src/lib/queries` — public product, detail, comparison, and advisor queries
- `src/lib/advisor` — deterministic recommendation engine

## 3. Git / Branch Strategy

Active development branch: `technaam-intelligence`.

Recent important commits verified from `git log`:

- `119dcda` — Build reusable comparison engine
- `f1fce5d` — Build TechNaam Stack Advisor MVP
- `f177547` — Fix advisor pricing and unknown scoring

Workflow:

- Development occurs on `technaam-intelligence`.
- Experimental work stays off `main`.
- Vercel Preview deploys are expected from `technaam-intelligence`.
- Do **not** merge into `main` unless explicitly instructed.

## 4. Environment Variables

Variable names used by the application:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID`

Important rules:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are used by server and public clients.
- `SUPABASE_SERVICE_ROLE_KEY` is server/import-side only.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser/client code.
- Never commit `.env.local`, `.vercel-preview.env`, or other env files.
- No actual values are recorded in this document.

## 5. Supabase Architecture

The migrations build the following domain model.

Initial migration:

- `vendors`
- `categories`
- `products`
- `features`
- `product_features`
- `integrations`
- `models`
- `pricing_plans`
- `pricing_history`
- `affiliate_programs`
- `sources`
- `hardware_requirements`
- `benchmarks`
- `technaam_scores`
- `change_log`

Schema v2 adds:

- `product_models`
- `evidence`
- additional columns for product type, pricing model, provider, and hardware

Public-safe data:

- Published/active products and their published dependencies
- Public pricing plans
- Public product features
- Public model relationships
- Public hardware requirements
- Published TechNaam scores

Private/internal data:

- `affiliate_programs`
- `sources`
- `pricing_history`
- `change_log`
- `evidence`

RLS:

- Public read policies require `is_published = true` and `is_active = true`.
- Products also exclude `status in ('deprecated','discontinued')`.
- Private/internal tables have no anon/authenticated policies.
- Administrative writes rely on `service_role`/RLS bypass.

RPC functions:

- `technaam_seed_import(jsonb)` — atomic seed import; service-role only
- `technaam_publish_product(jsonb)` — atomic controlled product publication; service-role only

## 6. Tools Intelligence

Routes:

- `/tools`
- `/tools/[slug]`

Query files:

- `src/lib/queries/products.ts`
- `src/lib/queries/product-detail.ts`

Behavior:

- `/tools` reads only published/active products.
- `/tools/[slug]` returns a published product detail.
- Unpublished or unknown slugs return `notFound()`.
- Public detail includes product, vendor, category, pricing, features, models,
  hardware, published scores, and public-safe source attribution.

## 7. Comparison Engine

Route:

- `/compare/[comparison]`

Query/UI files:

- `src/lib/queries/comparisons.ts`
- `src/components/comparisons/ComparisonView.tsx`

Comparison slug format: `left-vs-right`.

Behavior:

- Product slugs are resolved with `-`/`_` normalization.
- Malformed slugs return `notFound()`.
- Same-product comparisons return `notFound()`.
- Unpublished or unknown products produce a controlled “Comparison coming soon” state.
- Only public-safe data is rendered.

## 8. Advisor Architecture

Flow:

1. `AdvisorForm` collects client input.
2. The client posts to `/api/advisor`.
3. `request.ts` validates the request body server-side.
4. `advisor-catalog.ts` loads public product data with the anon-key client.
5. `recommendation.ts` runs the deterministic engine.
6. `AdvisorResult` is returned as JSON.
7. `AdvisorResults` renders the response.

Relevant files:

- `src/app/advisor/page.tsx`
- `src/components/advisor/AdvisorForm.tsx`
- `src/components/advisor/AdvisorResults.tsx`
- `src/app/api/advisor/route.ts`
- `src/lib/advisor/types.ts`
- `src/lib/advisor/request.ts`
- `src/lib/advisor/scoring.ts`
- `src/lib/advisor/recommendation.ts`
- `src/lib/advisor/index.ts`
- `src/lib/queries/advisor-catalog.ts`

## 9. Advisor Data Model

`AdvisorInput` fields:

- `industry`
- `team_size`
- `budget_monthly`
- `project_type`
- `primary_languages[]`
- `frameworks[]`
- `operating_systems[]`
- `deployment_preference`
- `ai_preference`
- `privacy_requirement`
- `local_ai_required`
- `collaboration_required`
- `agent_required`
- `codebase_size`
- `experience_level`

`Recommendation` fields:

- `product_id`
- `product_slug`
- `product_name`
- `recommended_plan`
- `plan_kind`
- `score`
- `reasons[]`
- `tradeoffs[]`
- `estimated_monthly_cost`
- `free_alternative`
- `free_alternative_plan`
- `category`
- `confidence`

`AdvisorResult` fields:

- `recommendations[]`
- `estimated_total_monthly_cost`
- `assumptions[]`
- `missing_information[]`
- `methodology_version`

## 10. Advisor Scoring Methodology

Current scoring version: `v1`.

Exact weights:

| Dimension | Weight |
|---|---:|
| requirement_match | 20 |
| feature_match | 15 |
| budget_fit | 15 |
| team_fit | 10 |
| privacy_fit | 10 |
| local_ai_fit | 10 |
| platform_fit | 5 |
| collaboration_fit | 5 |
| agent_fit | 5 |
| technical_fit | 5 |

All dimensions normalize to 0–100. Weighted dimension scores are summed and
divided by 100.

Feature states:

- `supported`
- `partial`
- `not_supported`
- `unknown`

Unknown data reduces confidence and is recorded as missing information. It is
not treated as negative evidence. Explicit `not_supported` remains negative.

## 11. Advisor Pricing Semantics

`estimated_monthly_cost` means the **recommended plan's normalized monthly
cost**, not the cheapest possible plan.

Plan selection:

- Paid plans are ranked by normalized monthly cost.
- If paid plans exist, the cheapest viable paid plan is recommended.
- A free plan is reported separately as `free_alternative` when available.
- Free is recommended only when no viable paid plan exists.
- Custom, usage-based, and unavailable plans produce `monthly_cost=null`.

Pricing normalization:

- Free → `0`
- Flat monthly → direct price
- Annual → `price / 12`
- Per-user → `price * team_size`
- Usage-based/custom → unknown

Example behavior when data supports it: Cursor has `Hobby` free and
`Individual` at `$20/month`; for a one-person project, the advisor recommends
`Individual` at `$20` and reports `Hobby` as the free alternative.

## 12. Missing Data and Confidence

Missing data does not equal negative evidence.

The engine records missing signals, lowers confidence, and avoids fabricating
compatibility.

Confidence starts at `1.0` and:

- subtracts `0.05` per unique missing signal
- subtracts an additional `0.10` when pricing is unknown
- has a floor of `0.25`

## 13. Affiliate Isolation

Current architecture guarantees:

- `affiliate_programs` is not queried by the advisor.
- Advisor scoring has no affiliate fields.
- Recommendations do not use affiliate commission, payout, or sponsorship.
- Sponsored placement does not equal recommendation.

## 14. Security Rules — DO NOT BREAK

# DO NOT BREAK THESE RULES

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser/client code.
- Never commit secrets, env files, tokens, or credential-bearing URLs.
- Never expose private evidence, sources, pricing history, or change log.
- Never use affiliate commissions to influence recommendations.
- Always validate advisor input server-side.
- Never trust client-supplied scores.
- Never trust client-supplied prices.
- Do not bypass RLS for public features.
- Do not expose unpublished products publicly.
- Do not create public write access to protected tables.
- Do not modify production/main without explicit approval.

## 15. API Contract

Endpoint: `POST /api/advisor`

Request body: JSON matching `AdvisorInput`.

Validation:

- Strict server-side validation.
- Rejects malformed, oversized, and invalid enum/boolean/number values.
- Returns `400` for invalid input.

Responses:

- `200` — `AdvisorResult`
- `400` — validation error
- `405` — unsupported method
- `429` — rate limit exceeded
- `500` — generic server failure, no internal details

Rate limiting:

- Lightweight in-memory sliding window.
- 20 requests per 60 seconds per client key.
- Per serverless instance; not a durable or shared production limiter.

## 16. Testing

Available commands:

- `npm run test:advisor` — deterministic scoring engine tests
- `npm run test:advisor-api` — request validation and API logic tests
- `npm run validate:seed` — seed JSON reference validation
- `npm run build` — production build
- `npm run lint` — ESLint

The advisor test scripts are lightweight Node scripts and do not use a heavy
test framework. Full HTTP route smoke testing requires a running server:

```bash
npm run start
```

Then post JSON to `http://localhost:3000/api/advisor`.

## 17. Current Known Limitations

Verified from the repository:

- `getAdvisorCatalog()` performs one detail lookup per published product.
- The advisor rate limiter is in-memory and not shared across serverless instances.
- Node advisor test scripts emit a non-fatal `MODULE_TYPELESS_PACKAGE_JSON` warning when importing TypeScript directly.
- Pre-existing ESLint errors exist in `src/app/about/page.tsx` and `src/app/contact/page.tsx`.

## 18. Current Product Publication Status

The repository enforces publication safety:

- Seed import defaults records to unpublished.
- The publication RPC publishes only the selected product and required public dependencies.
- Public detail links are created only for published products.

Live row-level publication state is stored in Supabase and cannot be fully
verified from the repository alone. Verify live state through the Supabase
dashboard or a read-only API query before publishing decisions.

## 19. Completed TechNaam Intelligence Phases

Completed work present in the repository:

- Intelligence database foundation
- Schema v2 dataset compatibility
- Atomic seed import RPC
- Seed importer and validation
- Product publication RPC
- `/tools` catalog
- `/tools/[slug]` detail pages
- Reusable comparison engine
- Deterministic advisor engine
- Advisor MVP UI and API
- Advisor pricing and unknown-scoring fix

## 20. Next Planned Work

Phase 5C — AI Explanation / Personalization Layer.

Architectural principle:

- Deterministic engine = authoritative decision.
- LLM = explanation/personalization layer.

The future LLM layer must not:

- silently override deterministic scores
- invent product capabilities
- invent prices
- use affiliate relationships to influence recommendations

## 21. Coding Agent Instructions

For Google Jules, Codex, and future coding agents:

1. Inspect before editing.
2. Make minimal targeted changes.
3. Preserve existing architecture.
4. Do not modify unrelated systems.
5. Do not modify LegalSphere unless explicitly requested.
6. Do not modify existing marketing pages unless explicitly requested.
7. Do not modify Supabase migrations unless explicitly requested.
8. Do not publish products unless explicitly requested.
9. Never expose secrets.
10. Run relevant tests after changes.
11. Run build before committing substantial changes.
12. Do not merge into `main` without explicit approval.
13. Keep development work on `technaam-intelligence` unless instructed otherwise.
14. Report exact files changed.
15. Report tests/build/lint results.
16. Report Supabase status.
17. Report publication status.
18. Report Git commit/push status.
19. Stop and ask for clarification if requirements conflict with existing architecture or security rules.

## 22. Jules Handoff Procedure

1. Checkout/sync `technaam-intelligence`.
2. Read this handoff document.
3. Inspect relevant files before editing.
4. Understand the existing architecture.
5. Make only requested changes.
6. Run tests.
7. Run build.
8. Review `git diff`.
9. Report changes.
10. Commit only after approval when required.
11. Push to `technaam-intelligence`.
12. Test Vercel Preview.
13. Do not merge `main` without explicit approval.

## 23. Handoff Checklist

- [ ] Read this handoff document.
- [ ] Inspect the current branch.
- [ ] Inspect relevant implementation files.
- [ ] Check `git status`.
- [ ] Understand the Supabase/RLS boundary.
- [ ] Preserve secrets and env files.
- [ ] Preserve publication rules.
- [ ] Run tests.
- [ ] Run build.
- [ ] Review diff.
- [ ] Report results.
- [ ] Keep `main` protected.

## 24. Last Verified State

- Current branch: `technaam-intelligence`
- Latest relevant commits:
  - `f177547` — Fix advisor pricing and unknown scoring
  - `f1fce5d` — Build TechNaam Stack Advisor MVP
  - `119dcda` — Build reusable comparison engine
- Current routes include `/tools`, `/tools/[slug]`, `/compare/[comparison]`,
  `/advisor`, and `/api/advisor`.
- Advisor scoring version: `v1`.
- Advisor pricing fix is present after `f177547`.
- Comparison engine is present after `119dcda`.
- Tools catalog/detail routes are present.
- Known tests: `test:advisor`, `test:advisor-api`, and `validate:seed`.
- Known limitations are listed in section 17.
- Live Supabase row state: not verified from repository.

## 25. Phase 5C — AI Explanation / Personalization Layer

Phase 5C adds a server-only DeepSeek explanation layer around the deterministic
Advisor. The deterministic engine remains authoritative.

### Provider

- Provider abstraction: `AIProvider` interface in
  `src/lib/advisor/ai/types.ts`
- DeepSeek implementation: `DeepSeekProvider` in
  `src/lib/advisor/ai/provider.ts`
- Exact model identifier: `deepseek-v4-flash`

### Endpoint

- `POST /api/advisor/explain`
- The browser sends validated `AdvisorInput` only.
- The server revalidates input, recomputes the deterministic
  `AdvisorResult`, sanitizes context, and calls DeepSeek.
- The client cannot supply `AdvisorResult`.

### Sanitized Context

- Explicit whitelist in `src/lib/advisor/ai/context.ts`.
- Only approved input fields and the top 3 recommendations enter AI context.
- No product IDs, slugs, internal IDs, affiliate data, evidence, private
  sources, pricing history, change logs, or unpublished product data are sent.

### Output Contract

DeepSeek returns only:

```json
{
  "summary": "string",
  "product_explanations": [
    { "why_it_fits": "string", "considerations": "string" }
  ],
  "uncertainty_note": "string"
}
```

Score, ranking, price, plan, product ID, slug, and URL remain authoritative in
the deterministic UI response.

### Privacy

- `privacy_requirement === "offline"` skips the provider call and returns
  `{ available: false, reason: "offline" }`.
- No Advisor data is persisted or stored in Supabase.

### Failure Behavior

- DeepSeek timeout, 4xx/5xx, malformed JSON, invalid schema, empty response, and
  provider unavailability return `{ available: false, reason: "provider_unavailable" }`.
- Deterministic Advisor results render independently of AI availability.

### Rate Limiting

- Lightweight in-memory sliding window for `/api/advisor/explain`.
- 10 requests per 60 seconds per client key.
- Per serverless instance; replaceable later.

### Tests

- `npm run test:advisor-ai`
- Tests exercise the actual sanitizer, provider, output validator, and rate
  limiter with mocked `fetch`. No live DeepSeek key is required.

### Known Limitations

- DeepSeek availability is external and may be unavailable.
- The explanation layer is not persisted or cached.
- The rate limiter is not shared across serverless instances.
