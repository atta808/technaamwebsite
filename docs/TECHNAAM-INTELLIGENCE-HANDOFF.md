# TechNaam Intelligence Engineering Handoff

> **Document role:** Living engineering handoff and current-state record for TechNaam Intelligence.
>
> **Update rule:** This document MUST be updated by the responsible coding agent (including Google Jules/Codex) after every completed phase or material milestone. It is not a historical snapshot. The latest committed version is the authoritative engineering handoff for the repository.
>
> **Strategic source of truth:** `docs/TECHNAAM_MASTER_ROADMAP.md`
>
> **Immediate execution gate:** `docs/TECHNAAM_PHASE6C_TO_PHASE7_READINESS_AUDIT.md`

---

## 1. Project Overview

TechNaam is a Next.js 16 website owned by TechNaam. The existing site contains marketing pages and LegalSphere/legal-tools content.

TechNaam Intelligence is the active technology-intelligence extension on `technaam-intelligence`.

Its long-term purpose is to become a **source-verified technology decision-intelligence platform** covering software, AI, hardware, operating systems, mobile devices, developer technology, cloud services, APIs, retailers/offers, compatibility, pricing, and related technology relationships.

The platform must make recommendations from verified facts, compatibility, requirements, quality, cost, and user fit.

Commercial opportunities may be attached to products and offers, but **commercial value must never silently determine the technical recommendation**.

Core business principle:

```text
TRUTH
  ↓
RECOMMENDATION
  ↓
MONETIZATION
```

Current delivered surfaces include:

- `/tools` — public product catalog
- `/tools/[slug]` — product intelligence detail
- `/compare/[comparison]` — reusable two-product comparison
- `/advisor` — deterministic stack recommendation
- `/api/advisor` — advisor endpoint
- `/api/advisor/explain` — server-only AI explanation layer
- Roast My Stack surfaces/API and AI explanation layer

The intended architecture is:

```text
Verified Sources
      ↓
Evidence / Provenance
      ↓
Normalized Technology Graph
      ↓
Deterministic Intelligence
      ↓
Recommendations / Comparisons / Compatibility
      ↓
AI Explanation / Personalization
      ↓
Commercial Opportunities
```

---

## 2. Documentation Hierarchy

TechNaam uses three important documentation layers.

### 2.1 Master Roadmap

`docs/TECHNAAM_MASTER_ROADMAP.md`

This describes the long-term business, product, technology, monetization, OpenClaw, and expansion strategy.

It is the strategic source of truth.

### 2.2 Engineering Handoff

`docs/TECHNAAM-INTELLIGENCE-HANDOFF.md`

This document describes the **current implementation state**, architecture, completed phases, active phase, known limitations, coding-agent rules, test status, and exact handoff state.

It is a **living document**.

### 2.3 Phase 6C → Phase 7 Readiness Audit

`docs/TECHNAAM_PHASE6C_TO_PHASE7_READINESS_AUDIT.md`

This is the immediate implementation gate before large-scale OpenClaw catalog expansion.

It identifies the foundation amendments required before Phase 7.

---

## 3. Living Handoff Protocol

After every completed phase or material milestone, the coding agent MUST:

1. Update this handoff.
2. Update the completed/current phase status.
3. Record the implementation actually present in the repository.
4. Record important files/routes/schema changes.
5. Record tests/build/lint results.
6. Record Supabase/schema status where relevant.
7. Record publication status.
8. Record Git commit/push status when performed.
9. Record known limitations introduced or resolved.
10. Update the next planned phase.
11. Never claim work is complete unless it is actually verified.
12. Keep historical completed-phase information; do not erase important implementation history.
13. Keep this document concise enough to remain useful to future agents.
14. Commit the updated handoff with the phase/milestone whenever appropriate.
15. Do not silently rewrite strategic policy; changes to business/recommendation policy require owner approval.

### Required phase-update block

At the end of every completed phase, add/update:

```text
## Current Phase Status

Completed:
- ...

Current:
- ...

Next:
- ...

Verification:
- Tests: ...
- Build: ...
- Lint: ...
- Supabase: ...
- Publication: ...
- Git: ...

Known limitations:
- ...

Updated:
- YYYY-MM-DD
```

---

## 4. Repository Structure

Important paths:

- `src/app` — Next.js App Router routes
- `src/components` — UI components
- `src/lib` — Supabase clients, queries, advisor domain logic
- `src/data/technaam-seed` — source-backed seed JSON
- `scripts` — validation, import, publication, and test scripts
- `supabase/migrations` — SQL migrations
- `docs` — strategic and engineering documentation
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
- `src/lib/advisor/ai` — AI explanation layer

---

## 5. Git / Branch Strategy

Active development branch:

`technaam-intelligence`

Rules:

- Development occurs on `technaam-intelligence`.
- Experimental work stays off `main`.
- Vercel Preview deployments are expected from `technaam-intelligence`.
- Do NOT merge into `main` unless explicitly instructed by the owner.
- Before substantial work, inspect `git status`.
- Before handoff, review `git diff`.
- Report the exact commit and push state.

The approved Master Roadmap has been committed to this branch.

---

## 6. Environment Variables / Secrets

Variable names used by the application include:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID`

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` is server/import-side only.
- Never expose it to browser/client code.
- Never commit `.env.local`, `.vercel-preview.env`, or other environment files.
- Never commit tokens, credentials, secret-bearing URLs, or API keys.
- No actual secret values belong in this document.

---

## 7. Supabase Architecture

The current schema includes:

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
- `product_models`
- `evidence`

Public-safe data includes:

- published/active products
- public pricing plans
- public product features
- public model relationships
- public hardware requirements
- published TechNaam scores
- approved public attribution

Private/internal data includes:

- `affiliate_programs`
- `sources`
- `pricing_history`
- `change_log`
- `evidence`

RLS/publication principles:

- Public read policies require published/active records.
- Deprecated/discontinued products must not appear publicly.
- Private/internal tables must not have unrestricted public read policies.
- Administrative writes use service-role/RLS-bypass mechanisms.
- Publication is controlled.

Known RPCs:

- `technaam_seed_import(jsonb)` — atomic seed import; service-role only
- `technaam_publish_product(jsonb)` — controlled product publication; service-role only

---

## 8. Tools Intelligence

Routes:

- `/tools`
- `/tools/[slug]`

Query files:

- `src/lib/queries/products.ts`
- `src/lib/queries/product-detail.ts`

Behavior:

- `/tools` reads published/active products.
- `/tools/[slug]` returns published product detail.
- Unknown/unpublished products do not become public detail pages.
- Public detail can include product, vendor, category, pricing, features, models, hardware, scores, and safe attribution.

---

## 9. Comparison Engine

Route:

- `/compare/[comparison]`

Relevant files:

- `src/lib/queries/comparisons.ts`
- `src/components/comparisons/ComparisonView.tsx`

Comparison slug:

```text
left-vs-right
```

Behavior:

- Product slugs support `-`/`_` normalization.
- Malformed comparisons are rejected.
- Same-product comparisons are rejected.
- Unknown/unpublished products produce controlled states.
- Only public-safe data is rendered.

---

## 10. Deterministic Advisor

Flow:

1. `AdvisorForm` collects client input.
2. Client posts to `/api/advisor`.
3. `request.ts` validates the request server-side.
4. `advisor-catalog.ts` loads public product data.
5. `recommendation.ts` runs the deterministic engine.
6. `AdvisorResult` is returned.
7. UI renders the result.

Important files:

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

---

## 11. Advisor Input

Current `AdvisorInput` includes:

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

Future expansion must be additive and controlled.

Future signals may include:

- hardware compatibility
- OS/version compatibility
- mobile/device compatibility
- regional availability
- effective usage cost
- exact product variant
- retailer/store quality
- support lifecycle

Do not break the existing contract without explicit approval and regression coverage.

---

## 12. Advisor Recommendation Contract

Current `Recommendation` includes:

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

Current `AdvisorResult` includes:

- `recommendations[]`
- `estimated_total_monthly_cost`
- `assumptions[]`
- `missing_information[]`
- `methodology_version`

---

## 13. Advisor Scoring Methodology

Current scoring version:

`v1`

Weights:

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

All dimensions normalize to 0–100.

Feature states:

- `supported`
- `partial`
- `not_supported`
- `unknown`

Unknown data is not treated as negative evidence.

Unknown data lowers confidence and is recorded as missing information.

Explicit `not_supported` remains negative.

### Non-negotiable recommendation rule

The deterministic intelligence layer remains authoritative.

AI explanations, sponsorship, affiliate commissions, vendor payments, and promotional placement must not silently alter the deterministic recommendation.

---

## 14. Advisor Pricing Semantics

`estimated_monthly_cost` means the recommended plan's normalized monthly cost.

Current normalization:

- Free → `0`
- Flat monthly → direct price
- Annual → `price / 12`
- Per-user → `price * team_size`
- Usage-based/custom → unknown

Plan selection currently prefers the cheapest viable paid plan when paid plans exist, while reporting a free alternative separately when available.

This is safe for the current MVP but is not the final TechNaam effective-cost system.

Future effective cost must be able to represent:

```text
subscription
+
expected usage
+
premium model usage
+
overage
+
infrastructure
+
team size
=
estimated effective cost
```

Assumptions and uncertainty must remain visible.

---

## 15. Missing Data / Confidence

Missing data does not equal negative evidence.

Current confidence behavior:

- starts at `1.0`
- subtracts `0.05` per unique missing signal
- subtracts an additional `0.10` when pricing is unknown
- floor `0.25`

The system must not fabricate compatibility, pricing, benchmarks, or capabilities.

---

## 16. Affiliate / Commercial Isolation

The current architecture guarantees:

- `affiliate_programs` is not queried by Advisor scoring.
- Advisor scoring has no affiliate commission fields.
- Affiliate commission/payout/sponsorship does not determine the recommendation.
- Sponsored placement does not equal recommendation.

This rule is permanent.

Future commercial intelligence may include:

- affiliate programs
- referral programs
- commission
- partner relationships
- reseller relationships
- advertisements
- sponsored listings
- featured placements
- launch placements
- API revenue
- licensing
- white-label opportunities

Commercial intelligence is a separate layer.

Business objective:

```text
Truth
  ↓
Recommendation
  ↓
Commercial opportunity
```

---

## 17. AI Explanation Layer — Phase 5C

Phase 5C adds a server-only DeepSeek explanation layer around the deterministic Advisor.

Provider abstraction:

- `AIProvider` interface
- `DeepSeekProvider`
- model identifier currently used by the implementation: `deepseek-v4-flash`

Endpoint:

- `POST /api/advisor/explain`

Behavior:

1. Browser sends validated `AdvisorInput`.
2. Server revalidates.
3. Server recomputes deterministic `AdvisorResult`.
4. Server sanitizes context.
5. Provider receives only approved context.
6. AI returns explanation.
7. Deterministic score/ranking/price/plan remain authoritative.

Sanitized context excludes:

- product IDs
- slugs
- internal IDs
- affiliate data
- evidence
- private sources
- pricing history
- change logs
- unpublished product data

Offline privacy requirement skips provider calls.

Provider failure must not prevent deterministic Advisor results.

Current AI rate limiting is lightweight in-memory and per serverless instance.

Test:

`npm run test:advisor-ai`

---

## 18. Roast My Stack

The repository contains a Roast My Stack intelligence layer with:

- request validation
- parsing
- scoring
- recommendation
- API
- AI explanation

Roast remains an intelligence/explanation feature and must not bypass the project's security, source, or commercial-isolation principles.

---

## 19. Seed / Catalog State

The repository contains a source-backed seed plan covering initial AI/developer tools.

The seed plan lists:

- Cursor
- GitHub Copilot
- Claude Code
- OpenAI Codex
- Windsurf
- Lovable
- Replit
- v0
- Bolt
- DigitalOcean
- Hostinger
- Make

The broader repository research dataset also contains the currently validated AI/local-AI seed set.

### Live state

Owner-confirmed current live seed:

> **Cursor only.**

Do not assume repository seed files equal live Supabase rows.

Before publication decisions, verify live Supabase state separately.

### Seed principle

```text
Verified fact → store
Unknown fact → null / unknown
Unverified claim → do not fabricate
```

---

## 20. Phase History

### Foundation / early intelligence work

Completed:

- Intelligence database foundation
- Schema v2 dataset compatibility
- atomic seed import RPC
- seed importer/validation
- controlled product publication
- `/tools` catalog
- product detail
- reusable comparison engine
- deterministic Advisor
- Advisor MVP UI/API
- Advisor pricing/unknown-scoring fixes

### Phase 5C — AI Explanation / Personalization

Completed:

- server-only AI provider abstraction
- DeepSeek provider
- sanitized AI context
- strict AI output contract
- offline privacy behavior
- provider failure isolation
- AI rate limiting
- AI tests

### Phase 6B / 6B.x

Completed repository work includes the multi-resolution / UX / parse robustness and related engineering changes present on `technaam-intelligence`.

The exact phase boundary must always be verified from Git history and current code rather than inferred from chat.

### Phase 6C

Current state:

- Phase 6C baseline is present.
- Master Roadmap has been approved and committed.
- Phase 6C → Phase 7 Readiness Audit has been produced.
- Large-scale OpenClaw catalog expansion is **not yet authorized**.
- Cursor remains the only owner-confirmed live seed.

---

## 21. Phase 6C → Phase 7 Readiness Gate

Before OpenClaw scale, TechNaam requires a foundation amendment.

The detailed audit is:

`docs/TECHNAAM_PHASE6C_TO_PHASE7_READINESS_AUDIT.md`

The primary required foundation areas are:

### P0

1. Extensible technology taxonomy.
2. General technology relationship graph.
3. OS/version/edition foundation.
4. Hardware entity foundation.
5. Scalable evidence/change workflow.
6. Commercial intelligence foundation separated from scoring.

### P1

7. Retail offer/price-comparison model.
8. Store/seller reputation model.
9. Effective-cost model.
10. Advisor/Compare/Compatibility integration.
11. OpenClaw ingestion and approval contract.

---

## 22. Technology Taxonomy Expansion

Current product typing is optimized for AI/developer tools.

Future TechNaam must represent broader technology categories, including:

- software
- AI service
- AI model
- application
- operating system
- OS version/edition
- laptop
- desktop
- workstation
- CPU
- GPU
- RAM
- storage
- smartphone
- tablet
- wearable
- cloud service
- hosting
- database
- API
- framework
- library
- developer platform
- retailer/store
- peripheral
- networking equipment
- other technology entities

Do not solve long-term taxonomy growth by repeatedly adding uncontrolled hard-coded constraints.

Use a controlled taxonomy architecture.

---

## 23. Technology Graph

TechNaam needs explicit relationships such as:

```text
supports
requires
runs_on
depends_on
integrates_with
compatible_with
alternative_to
replaces
part_of
powered_by
uses_model
requires_hardware
```

Examples:

```text
Software
  → runs_on → Operating System

Application
  → runs_on → Smartphone

AI Model
  → requires → GPU / VRAM

Technology A
  → alternative_to → Technology B
```

This graph is a core future intelligence asset.

Do not encode major compatibility relationships only in free text.

---

## 24. Operating System Intelligence

Current hardware requirements contain `operating_systems text[]`.

That remains useful as a compatibility input but is insufficient as the long-term model.

Future OS intelligence must distinguish:

- operating system
- version
- edition
- minimum supported
- recommended
- unsupported
- unknown
- end-of-support

Target families include:

- Windows
- macOS
- Linux distributions
- Android
- iOS

Do not publish compatibility claims without evidence.

---

## 25. Hardware Intelligence

`hardware_requirements` remains a requirements table.

It should not become the entire hardware catalog.

Future hardware entities should include:

- CPU
- GPU
- RAM
- VRAM
- storage
- chipset
- architecture
- laptop
- desktop
- workstation
- smartphone
- tablet
- peripheral

Separate:

```text
Hardware Product
```

from:

```text
Hardware Requirement
```

---

## 26. Mobile Intelligence

Mobile must eventually become a first-class technology domain.

Required concepts include:

- Android phones
- iPhones
- tablets
- manufacturers
- exact models
- generations
- RAM
- storage
- chipset
- GPU
- OS version
- update/support lifecycle
- app compatibility
- AI capabilities
- regional availability
- prices
- retailer offers

Example business behavior:

```text
Premium recommendation
    vs
Lower-cost compatible alternative
```

The system must judge based on user requirements and evidence, not merely brand prestige.

---

## 27. Retail Price Intelligence

Vendor subscription pricing and retailer product pricing are different domains.

Future retail offers must support:

- exact product
- exact model/variant
- RAM/storage where relevant
- seller/store
- region
- currency
- price
- tax
- shipping
- availability
- warranty
- return policy
- offer URL
- checked timestamp
- condition

Do not compare two offers merely because their marketing names look similar.

---

## 28. Store / Seller Reputation

Store quality is independent of product quality.

Future deal intelligence should distinguish:

- lowest price
- best deal
- most trusted seller

Potential signals:

- official seller status
- reputation
- warranty
- return policy
- availability
- price
- seller quality
- regional suitability

The system must explain why an offer is preferred.

---

## 29. Evidence / Provenance / Change Detection

The current evidence foundation should evolve for OpenClaw scale.

Future requirements:

- controlled entity types
- source priority
- evidence versioning
- conflict handling
- stale-data detection
- verification timestamps
- review status
- change detection
- audit trail
- approval workflow

OpenClaw must create evidence-backed proposals rather than silently making unsupported changes.

---

## 30. OpenClaw Operating Model

OpenClaw is intended to reduce repetitive research/catalog work.

Target flow:

```text
DISCOVER
   ↓
RESEARCH
   ↓
COLLECT EVIDENCE
   ↓
NORMALIZE
   ↓
DETECT CONFLICTS/CHANGES
   ↓
PROPOSE
   ↓
HUMAN APPROVAL
   ↓
PUBLISH / UPDATE
```

OpenClaw is not the final authority over TechNaam's recommendation methodology.

---

## 31. OpenClaw Authority Levels

### Level 1 — Automatic

Examples:

- discover candidate technology
- find changed source
- detect broken source URL
- flag stale record
- create research task
- propose non-public draft

### Level 2 — Human approval

Examples:

- new product publication
- pricing update
- compatibility update
- affiliate/commercial update
- store reputation update
- score-affecting fact
- sponsored placement

### Level 3 — Owner / human policy authority

Examples:

- recommendation methodology
- scoring weights
- benchmark methodology
- sponsorship policy
- commercial policy
- major architecture changes
- TechNaam-owned product strategy
- changing the source-of-truth principles

---

## 32. OpenClaw Catalog Expansion

Do not jump directly from a tiny verified catalog to uncontrolled scale.

Recommended progression:

```text
Cursor
  ↓
10 verified
  ↓
20 verified
  ↓
50 verified
  ↓
100+
  ↓
continuous OpenClaw-assisted catalog
```

Each expansion must validate:

- data quality
- evidence quality
- compatibility
- recommendation quality
- price accuracy
- commercial separation
- performance
- user usefulness

---

## 33. Definition of OpenClaw-Ready

TechNaam becomes OpenClaw-ready when:

- technology types are extensible;
- technology relationships are explicit;
- OS/version entities exist;
- hardware entities exist;
- evidence workflow scales;
- source priority is defined;
- commercial intelligence is isolated;
- retailer offers have a proper model;
- store/seller reputation has a proper model;
- publication requires appropriate approval;
- agent permissions are defined;
- conflicts have deterministic handling;
- stale facts can be detected;
- audit logs exist;
- existing Advisor/Compare/Roast pass regression tests.

---

## 34. Immediate Next Phase

### Phase 6C.1 — Technology Intelligence Foundation Amendment

Scope:

1. taxonomy expansion;
2. technology relationships;
3. OS/version foundation;
4. hardware entity foundation;
5. evidence/change workflow;
6. commercial intelligence foundation;
7. tests;
8. regression verification.

Do NOT build the complete retailer marketplace or full OpenClaw automation in this phase.

Build the foundation that makes those systems possible.

---

## 35. Later Phases

### Phase 6C.2

Retail price + store/seller intelligence foundation.

### Phase 6C.3

Effective-cost calculator.

### Phase 6C.4

Advisor / Compare / Compatibility integration.

### Phase 6C.5

OpenClaw ingestion + human-approval contract.

### Phase 6C.6

OpenClaw pilot with a small approved catalog.

### Phase 7

Continuous Technology Intelligence / OpenClaw operations.

---

## 36. Security Rules — DO NOT BREAK

1. Never expose `SUPABASE_SERVICE_ROLE_KEY`.
2. Never commit secrets or credential-bearing URLs.
3. Never expose private evidence, sources, pricing history, or change logs.
4. Never use affiliate commissions to influence recommendations.
5. Always validate user input server-side.
6. Never trust client-supplied scores.
7. Never trust client-supplied prices.
8. Do not bypass RLS for public features.
9. Do not expose unpublished products publicly.
10. Do not create unrestricted public write access.
11. Do not modify `main` without explicit approval.
12. Do not publish products without required approval.
13. Preserve source/provenance rules.
14. Do not fabricate unknown facts.
15. Do not let AI silently override deterministic decisions.

---

## 37. Coding Agent Rules

For Google Jules, Codex, OpenClaw coding tasks, and future agents:

1. Read `docs/TECHNAAM_MASTER_ROADMAP.md`.
2. Read this handoff.
3. Read the active phase audit/specification.
4. Inspect before editing.
5. Understand existing architecture before changing it.
6. Make minimal targeted changes.
7. Preserve existing behavior unless the phase explicitly changes it.
8. Do not modify LegalSphere unless explicitly requested.
9. Do not modify existing marketing pages unless explicitly requested.
10. Do not modify Supabase migrations unless the active phase requires them.
11. Do not publish products unless explicitly authorized.
12. Never expose secrets.
13. Run relevant tests.
14. Run build before committing substantial changes.
15. Review `git diff`.
16. Report exact files changed.
17. Report tests/build/lint results.
18. Report Supabase/schema status.
19. Report publication status.
20. Report Git commit/push status.
21. Update this handoff after completing the phase.
22. Record known limitations honestly.
23. Do not rewrite strategic policy without owner approval.
24. Stop and request clarification if requirements conflict with security or architectural rules.

---

## 38. Jules Phase Completion Procedure

At the beginning:

1. Sync `technaam-intelligence`.
2. Read Master Roadmap.
3. Read this handoff.
4. Read active phase specification/audit.
5. Inspect current code and Git state.

During implementation:

6. Make only approved scope changes.
7. Preserve public/private boundaries.
8. Preserve deterministic recommendation authority.
9. Preserve commercial isolation.
10. Add regression tests for changed behavior.

Before completion:

11. Run relevant tests.
12. Run build.
13. Run lint when applicable.
14. Review `git diff`.
15. Verify no secrets are included.
16. Verify publication state.
17. Verify Supabase changes if applicable.
18. Update this handoff.
19. Report exact changed files.
20. Commit/push according to the approved workflow.
21. Test Vercel Preview when applicable.

After completion:

22. Update the Current Phase Status block.
23. Set the next phase.
24. Record the exact commit.
25. Do not merge `main` without explicit owner approval.

---

## 39. Testing

Known commands include:

- `npm run test:advisor`
- `npm run test:advisor-api`
- `npm run test:advisor-ai`
- `npm run validate:seed`
- `npm run build`
- `npm run lint`

Full HTTP smoke testing can use:

```bash
npm run start
```

Then test:

```text
http://localhost:3000/api/advisor
```

Relevant phase-specific tests must be added as the architecture expands.

---

## 40. Known Limitations

Current known limitations include:

- Advisor catalog lookup may perform one detail lookup per published product.
- Advisor and AI rate limiting are lightweight in-memory limits and are not shared across serverless instances.
- Some Node/TypeScript test execution may emit non-fatal module-type warnings.
- Existing unrelated ESLint errors may exist outside the active intelligence scope.
- Live Supabase row state cannot be assumed from repository seed files.
- Current product taxonomy is not yet sufficient for the full hardware/mobile/OS technology universe.
- Retail offers/store reputation are not yet first-class intelligence domains.
- Full Technology Graph is not yet implemented.
- OpenClaw continuous ingestion is not yet authorized/implemented.

These limitations must be updated as they are resolved.

---

## 41. Current Phase Status

### Completed

- Phase 5C — AI Explanation / Personalization
- Phase 6C baseline and related repository work
- Approved Master Roadmap
- Phase 6C → Phase 7 Readiness Audit

### Current

**Phase 6C.1 — Technology Intelligence Foundation Amendment**

Status:

> **Ready for implementation; not yet implemented.**

### Next

- Phase 6C.2 — Retail Price + Store/Seller Intelligence
- Phase 6C.3 — Effective Cost
- Phase 6C.4 — Advisor/Compare/Compatibility Integration
- Phase 6C.5 — OpenClaw Ingestion + Approval Contract
- Phase 6C.6 — OpenClaw Pilot
- Phase 7 — Continuous Technology Intelligence

### Verification

- Tests: current repository test suite must be rerun before the next substantial implementation.
- Build: rerun before Phase 6C.1 commit.
- Lint: rerun and distinguish pre-existing unrelated failures.
- Supabase: live row state requires explicit verification.
- Publication: Cursor is the only owner-confirmed live seed.
- Git: `technaam-intelligence` is the active development branch; `main` remains protected.

### Known limitations

See Section 40 and the Phase 6C → Phase 7 Readiness Audit.

### Updated

`2026-08-29`

---

# FINAL HANDOFF PRINCIPLE

TechNaam should become:

> **A source-of-truth technology intelligence system, not merely a product list.**

The real asset is:

```text
FACTS
  +
SOURCES
  +
EVIDENCE
  +
RELATIONSHIPS
  +
COMPATIBILITY
  +
PRICES
  +
STORE TRUST
  +
COMMERCIAL OPPORTUNITIES
  +
USER REQUIREMENTS
  +
DETERMINISTIC METHODOLOGY
```

OpenClaw maintains the intelligence.

TechNaam's deterministic system reasons from it.

AI explains and personalizes it.

Humans govern the rules.

Commercial opportunities follow the truth; they do not redefine it.

---

## 42. Phase 6C.1 Implementation Log

### Completed
- Phase 6C.1 P0 Foundation implementation.

### Architecture Implemented
- `technology_entities` anchor introduced.
- `tech_relationships` with strict self-referencing and unique constraints.
- `hardware_entities` and `os_entities`.
- Non-destructive `evidence` schema updates (`tech_entity_id` backfill).
- RPC updates to `technaam_seed_import` for automatic anchor generation on seeded products.
- Strict defense-in-depth RLS separating public technologies from private evidence.

### Migrations Created
- `supabase/migrations/20260826040000_phase6c1_technology_foundation.sql`
- `supabase/migrations/20260826040001_phase6c1_rpc_updates.sql`

### Tests Executed
- `npm run test:advisor` - PASSED
- `npm run test:roast` - PASSED
- `npm run validate:seed` - PASSED
- `npm run test:phase6c1` - PASSED
- `npm run build` - PASSED

### Cursor Regression Result
- Cursor product mapping safely preserves all existing features.
- Advisor and Roast logic remain completely deterministic and unaffected.

### Known Limitations
- The `technology_entities` anchor is implemented at the DB level. UI/API currently still read from `products`.
- OpenClaw ingestion APIs and commercial marketplace schemas (Phase 6C.2/5) are explicitly excluded from this phase.

### Next Phase
- Phase 6C.2 — Retail Price + Store/Seller Intelligence

### Updated
`2026-08-29`
