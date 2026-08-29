# TECHNAAM MASTER ROADMAP

**Document status:** Master execution roadmap  
**Baseline:** `technaam-intelligence` branch, Phase 6C checkpoint  
**Code baseline:** ZIP supplied on 2026-08-29  
**Database seed policy:** Cursor is the only intentionally seeded/verified live proof-of-concept product at this checkpoint  
**Protected branch:** `main`  
**Purpose:** Permanent source of truth for TechNaam execution, architecture, policies, agent handoff, and future business expansion.

---

# 1. Executive Status

TechNaam has moved beyond being only a marketing website.

The current repository already contains a real Technology Intelligence foundation:

**Supabase/PostgreSQL intelligence database → verified seed system → public tools catalog → product detail → comparison engine → deterministic Advisor → Advisor AI explanation → Roast My Stack → Roast AI explanation.**

The current architecture is deliberately conservative:

- deterministic recommendation logic remains authoritative;
- AI explains/personalizes but does not decide;
- source/provenance is part of the data model;
- private intelligence is separated from public data;
- affiliate data is isolated from recommendation scoring;
- unpublished products are protected;
- `main` remains protected;
- development remains on `technaam-intelligence`.

The existing handoff explicitly defines the deterministic engine as the authoritative decision layer and the LLM as an explanation/personalization layer only. It also states that affiliate relationships must not influence recommendations. 

---

# 2. Current Verified Baseline

## Git / Branch

- Active branch: `technaam-intelligence`
- `main`: protected and intentionally untouched
- Development work stays on `technaam-intelligence`
- Vercel Preview is expected from the intelligence branch
- No merge to `main` without explicit approval

## Phase 6C checkpoint

The ZIP contains the completed Roast AI layer, including:

- `src/lib/roast/ai/context.ts`
- `src/lib/roast/ai/index.ts`
- `src/lib/roast/ai/provider.ts`
- `src/lib/roast/ai/types.ts`
- `src/app/api/roast/explain/route.ts`
- `src/components/roast/RoastResults.tsx`
- `src/app/roast/page.tsx`
- `scripts/test-roast-ai.mjs`

The repository also contains the deterministic Roast engine, API, parsing, normalization, scoring and recommendation layers.

## Existing product surfaces

- `/tools`
- `/tools/[slug]`
- `/compare/[comparison]`
- `/advisor`
- `/api/advisor`
- `/api/advisor/explain`
- `/roast`
- `/api/roast`
- `/api/roast/explain`

The existing handoff confirms the Tools, Compare and deterministic Advisor architecture and routes.

---

# 3. What Has Actually Been Built

## Phase 0 — Foundation / Product Strategy

**Status: COMPLETE**

Strategic direction established:

- TechNaam as a technology intelligence platform
- technology discovery
- technology comparison
- personalized recommendations
- future monetization
- future automation
- future API/SaaS
- eventual TechNaam-owned products

---

# 4. Phase 1 — TechNaam Architecture / Next.js Foundation

**Status: COMPLETE**

Current repository confirms:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- App Router
- existing TechNaam marketing/application structure
- intelligence functionality added without replacing the existing site
- dedicated `technaam-intelligence` development branch

The intelligence layer is an extension of the existing TechNaam application rather than a separate throwaway project.

---

# 5. Phase 2 — Supabase Intelligence Database

**Status: COMPLETE**

The current migration set establishes the intelligence foundation.

Core domains include:

- vendors
- categories
- products
- features
- product_features
- integrations
- models
- pricing_plans
- pricing_history
- affiliate_programs
- sources
- hardware_requirements
- benchmarks
- technaam_scores
- change_log

Schema v2 additionally introduces:

- `product_models`
- `evidence`
- richer product/pricing/hardware fields

The current architecture therefore already supports source-backed product intelligence, pricing, features, models, hardware requirements, benchmarks, scores, change history and affiliate-program records.

## Security model

The repository establishes:

- public reads only for published/active public data;
- private/internal protection for affiliate programs, sources, pricing history, change logs and evidence;
- service-role access for administrative/import operations;
- controlled seed import;
- controlled product publication;
- no public write access to protected intelligence.

These are core architectural assets and must be preserved.

---

# 6. Phase 3 — Dataset / Validation / Import / Publication

**Status: COMPLETE as an engineering capability**

The repository contains:

- source-backed JSON seed files;
- seed validation;
- seed import tooling;
- deterministic ID mapping;
- atomic seed import RPC;
- controlled product publication RPC.

The publication system intentionally defaults products to unpublished and publishes only the selected product and its required public dependencies.

## Important current state

The repository contains a **10-product research/seed dataset**, but that does NOT mean 10 products are live.

The seed files contain:

1. Cursor
2. GitHub Copilot
3. Claude Code
4. Windsurf
5. Replit
6. Lovable
7. Bolt.new
8. v0
9. Ollama
10. Aider

**Only Cursor is the intentionally seeded live proof-of-concept product.**

The other nine are research/seed candidates and must remain unseeded/unpublished until the final architecture and policy review is complete.

The seed README currently says the dataset itself is not connected to Supabase. Therefore, live Supabase state must be treated as the authority for actual publication/seed status, not the README.

---

# 7. Phase 4A — Tools Intelligence Catalog

**Status: COMPLETE**

Implemented:

- `/tools`
- `/tools/[slug]`
- public-safe queries
- published/active filtering
- controlled `notFound()` behavior
- product/vendor/category/pricing/features/models/hardware/public score data
- public-safe source attribution

The catalog is database-backed rather than hardcoded marketing content.

---

# 8. Phase 4B — Product Intelligence Pages

**Status: COMPLETE**

Product detail architecture is implemented.

A product page can represent:

- product identity
- vendor
- category
- pricing
- features
- models
- hardware
- published scores
- source attribution

Unpublished products are not exposed publicly.

---

# 9. Phase 4C — Comparison Engine

**Status: COMPLETE**

Implemented:

- `/compare/[comparison]`
- `left-vs-right` comparison model
- product slug normalization
- controlled handling of malformed comparisons
- unpublished/unknown-product handling
- public-safe comparison data

This establishes the foundation for future comparisons across software, AI, hardware, mobile, operating systems and other technology categories.

---

# 10. Phase 5A — Deterministic Advisor

**Status: COMPLETE**

The Advisor is the authoritative decision engine.

Current flow:

User input  
→ server validation  
→ public catalog  
→ deterministic scoring  
→ ranked recommendations  
→ result

Current input model already includes:

- industry
- team size
- budget
- project type
- languages
- frameworks
- operating systems
- deployment preference
- AI preference
- privacy requirement
- local AI requirement
- collaboration requirement
- agent requirement
- codebase size
- experience level

Current scoring v1 uses:

| Dimension | Weight |
|---|---:|
| requirement match | 20 |
| feature match | 15 |
| budget fit | 15 |
| team fit | 10 |
| privacy fit | 10 |
| local AI fit | 10 |
| platform fit | 5 |
| collaboration fit | 5 |
| agent fit | 5 |
| technical fit | 5 |

Unknown data is not treated as negative evidence; it reduces confidence and is surfaced as missing information.

---

# 11. Phase 5B — Advisor UI / API

**Status: COMPLETE**

Implemented:

- `/advisor`
- `/api/advisor`
- strict server-side request validation
- deterministic result generation
- pricing normalization
- confidence handling
- controlled error responses
- rate limiting

The current pricing engine distinguishes free, paid, annual, per-user, custom and usage-based situations.

---

# 12. Phase 5B.2 — Advisor Pricing / Scoring Quality Fix

**Status: COMPLETE**

The repository documents the corrected semantics:

- `estimated_monthly_cost` represents the recommended plan's normalized monthly cost;
- paid plans are ranked by normalized cost;
- free plans can be reported separately as a free alternative;
- usage-based/custom pricing may remain unknown;
- unknown information lowers confidence rather than becoming false negative evidence.

This is important for future usage-based AI products.

---

# 13. Phase 5C — Advisor AI Explanation / Personalization

**Status: COMPLETE**

Architecture:

**Deterministic Advisor → sanitized context → DeepSeek → explanation**

The deterministic engine remains authoritative.

The AI:

- explains why recommendations fit;
- provides considerations;
- provides uncertainty;
- does not supply the authoritative score;
- does not supply authoritative pricing;
- cannot replace the deterministic recommendation.

The implementation uses server-side validation and sanitized AI context.

The existing handoff explicitly prohibits:

- silently overriding deterministic scores;
- inventing capabilities;
- inventing prices;
- using affiliate relationships to influence recommendations.

---

# 14. Phase 6 — Roast My Stack

**Status: COMPLETE**

Implemented deterministic Roast functionality:

- stack input parsing
- technology normalization
- technology resolution
- finding detection
- stack scoring
- recommendations/improvements
- unresolved technology handling
- API validation
- UI

Conceptually:

**User Stack → Resolve → Detect Problems → Score → Improve**

This creates the second major user-facing intelligence product.

---

# 15. Phase 6C — Roast AI Explanation Layer

**Status: COMPLETE**

The current repository contains the AI explanation layer for Roast.

Architecture:

**User stack → deterministic Roast → sanitized context → AI explanation**

The AI layer is separate from the deterministic Roast engine.

The current code includes:

- provider abstraction
- DeepSeek provider
- sanitized context builder
- output types
- output validation
- rate limiting
- `/api/roast/explain`
- Roast UI integration
- dedicated tests

The deterministic Roast result remains the authoritative technical result.

---

# 16. Current Engineering Test Surface

The repository contains scripts for:

- Advisor engine
- Advisor API
- Advisor AI
- seed validation
- Roast engine
- Roast API
- Roast AI
- Roast parsing
- production build
- lint

The documented known limitations include:

- advisor catalog performs a detail lookup per published product;
- current rate limiting is in-memory/per serverless instance;
- Node test scripts can emit a non-fatal module-type warning;
- pre-existing ESLint errors exist in unrelated About/Contact pages.

These should not be confused with Phase 6C failures.

---

# 17. What We Have Versus What We Have Not Yet Built

## Already built

- intelligence database foundation
- provenance/source model
- pricing model
- pricing history
- affiliate-program table
- hardware requirements
- benchmarks
- scores
- change log
- seed validation
- seed import
- publication controls
- Tools catalog
- product intelligence pages
- comparison engine
- deterministic Advisor
- Advisor API
- Advisor AI explanation
- Roast engine
- Roast API
- Roast AI explanation
- security/RLS boundaries
- controlled publication model

## Not yet built

The following are strategic requirements from the expanded TechNaam vision and are **not currently complete implementations in the supplied repository**:

- full technology relationship graph
- rich hardware catalog
- CPUs/GPUs/RAM/SSD/device entities
- mobile-device catalog
- Android/iOS version intelligence
- Windows/macOS/Linux edition/version intelligence
- app-to-device compatibility engine
- software-to-OS compatibility matrix
- exact retailer/store offer model
- price-comparison engine across web stores
- store/seller reputation model
- warranty/return/shipping comparison model
- price-history user-facing intelligence
- comprehensive commercial opportunity model beyond the current affiliate table
- advertising inventory model
- sponsored/featured placement system
- formal separation of paid placement and recommendation presentation
- YouTube/content distribution system
- audience analytics/intelligence system
- TechNaam public API
- API authentication/billing/quotas
- OpenClaw production research/monitoring system
- automated evidence/change workflow
- human approval workflow UI
- large-scale catalog operations
- TechNaam-owned product platform
- SaaS/enterprise product
- white-label platform
- mature revenue analytics

These are **future work**, not claims that the current system is broken.

---

# 18. CRITICAL PRE-PHASE-7 AMENDMENT PROGRAM

Before handing large-scale catalog population to OpenClaw, TechNaam should make a controlled architecture/policy review.

This is the most important next step.

## Amendment A — Technology Graph

The database should eventually represent relationships such as:

- software → supported OS
- software → required OS version
- software → compatible hardware
- AI model → RAM requirement
- AI model → VRAM requirement
- AI model → CPU/GPU architecture
- app → Android version
- app → iOS version
- phone → OS version
- laptop → CPU/GPU/RAM
- product → integration
- product → model
- product → alternative
- product → dependency
- product → compatibility restriction

The objective is to answer:

> "Will this technology work with my technology?"

rather than merely:

> "What does this product do?"

---

# 19. Hardware Intelligence Expansion

TechNaam should evolve from a basic hardware-requirement table into a broader technology/hardware intelligence model.

Eventually support:

- CPU
- GPU
- RAM
- VRAM
- storage
- architecture
- chipset
- display
- network capability
- device class
- laptop
- desktop
- workstation
- server
- phone
- tablet
- wearable
- peripherals

Hardware should be usable as an input to the Advisor and compatibility engine.

---

# 20. Operating-System Intelligence

TechNaam should treat operating systems as technology entities, not merely text fields.

Examples:

- Windows
- Windows 11 editions
- Windows 10 editions
- older Windows versions where relevant
- macOS versions
- Linux distributions
- Android versions
- iOS versions
- future OS releases

For each relevant technology:

**minimum supported version → recommended version → unsupported versions → known limitations → source → verification date**

This enables real compatibility recommendations.

---

# 21. Mobile Intelligence

Mobile must become a first-class technology category.

The catalog should eventually cover:

- Android phones
- iPhones
- tablets
- major manufacturers
- models
- generations
- OS versions
- RAM/storage
- chipsets
- GPU capability
- app compatibility
- AI capability
- update/support lifecycle
- regional availability
- price
- retailer offers

Example:

> Samsung flagship → premium recommendation  
> Tecno model → lower-cost alternative

The system must compare according to user requirements, not simply brand prestige.

---

# 22. Price Intelligence

Current `pricing_plans` primarily represent product/service plans.

That is **not the same thing** as retailer price comparison.

A future price intelligence layer should represent:

- exact product variant
- model number
- storage
- RAM
- region
- condition
- seller
- retailer
- currency
- price
- tax
- shipping
- availability
- warranty
- return policy
- timestamp
- source
- confidence

Then TechNaam can answer:

> Cheapest verified offer

and separately:

> Best overall deal

These must not be confused.

---

# 23. Store / Seller Reputation Intelligence

The lowest price is not automatically the best recommendation.

Future deal evaluation should consider:

- store reputation
- seller reputation
- warranty
- return policy
- shipping
- authenticity signals
- availability
- customer-service signals
- regional reliability

The system should be able to distinguish:

**Lowest Price**

from:

**Best Deal**

from:

**Most Trusted Store**

This protects users from misleading "cheapest" results.

---

# 24. Commercial Intelligence Layer

Commercial opportunity must be tracked separately from technical/user-fit scoring.

Current database already contains `affiliate_programs`.

Future commercial intelligence should expand to:

- affiliate
- commission
- referral
- partner
- reseller
- lead generation
- advertising
- sponsorship
- featured placement
- vendor partnership
- premium service
- API revenue
- SaaS revenue
- licensing
- white-label
- TechNaam-owned products

**Permanent rule:**

> Every legitimate commercial opportunity should be identified and considered, but commercial value must not silently corrupt technical truth.

---

# 25. Recommendation Integrity Policy

This is a permanent TechNaam principle.

## Technical truth

Determines:

- compatibility
- requirements
- user fit
- quality
- performance
- value
- reliability
- suitability

## Commercial intelligence

Determines:

- whether money can be earned;
- how money can be earned;
- whether a commercial relationship exists;
- what disclosure is required.

These are separate dimensions.

A product paying TechNaam $0 can be the #1 recommendation.

A product paying TechNaam $100 can be the #1 recommendation **only if it actually wins for that user**.

Sponsored placement can be sold.

The recommendation itself cannot be secretly sold.

---

# 26. Sponsored / First-Listing Policy

TechNaam may eventually accept payment for:

- launch exposure
- featured listing
- sponsored placement
- advertising
- promotional campaigns

But paid visibility must not automatically become a technical recommendation.

A vendor may purchase:

**Featured / Sponsored**

without purchasing:

**Best / Recommended**

If a sponsored product genuinely wins the independent evaluation, it can also receive a recommendation.

This distinction should be visible to users.

---

# 27. TechNaam-Owned Products

TechNaam should eventually move from:

**understanding technology**

to:

**creating technology.**

When TechNaam repeatedly discovers a user problem that existing products do not solve adequately:

**Intelligence → opportunity → validation → build → test → TechNaam product**

TechNaam-owned products should be held to the same or higher quality standards as external products.

The long-term standard is:

> **A+ TechNaam product**

Potential areas:

- AI utilities
- developer tools
- compatibility tools
- stack analysis
- technology monitoring
- intelligence dashboards
- APIs
- enterprise tools
- SaaS

---

# 28. YouTube / Audience Strategy

YouTube should be treated as a distribution and monetization channel for TechNaam.

Potential content:

- product comparisons
- AI tool reviews
- hardware recommendations
- mobile comparisons
- compatibility demonstrations
- price comparisons
- new technology discoveries
- "best for this user" analysis
- Stack Advisor examples
- Roast My Stack examples

Flow:

**YouTube → TechNaam page/tool → interaction → recommendation → commercial opportunity**

Revenue opportunities:

- YouTube advertising when eligible
- sponsorship
- affiliate/referral
- leads
- vendor partnerships
- traffic to TechNaam products

Content quality and trust remain more important than raw publishing volume.

---

# 29. AI as a Distribution Channel

AI systems are not assumed to be direct paying customers.

They can become an important discovery/distribution channel.

Long-term objective:

**AI/search system → discovers TechNaam intelligence → human/business user reaches TechNaam**

A separate B2B/API path can become:

**Developer/business/AI application → TechNaam API → subscription/usage revenue**

TechNaam therefore serves:

1. humans;
2. businesses/developers;
3. AI/search discovery ecosystems.

---

# 30. OpenClaw — Future Operating Layer

OpenClaw should not be treated as a generic article generator.

Its role should become:

**Research + monitoring + discovery + maintenance + opportunity detection**

Potential responsibilities:

### Research

- discover new products
- discover new models
- discover new hardware
- discover new mobile devices
- discover new operating systems
- discover new apps
- discover new integrations

### Monitoring

- pricing changes
- features
- models
- integrations
- OS support
- hardware requirements
- retailer prices
- store status
- affiliate programs
- partner programs
- broken links
- source changes

### Opportunity discovery

- new comparison opportunities
- new search demand
- underserved technologies
- emerging products
- commercial opportunities
- product gaps
- audience opportunities

### Maintenance

- stale data
- outdated sources
- missing products
- inconsistent records
- changed availability

---

# 31. OpenClaw Approval Levels

OpenClaw must operate under controlled authority.

## Level 1 — Low-risk automatic

Potential examples:

- detect a broken source URL
- detect a changed page
- flag stale verification
- discover a candidate product
- create a research task

## Level 2 — Human approval

Potential examples:

- pricing change
- affiliate change
- major feature change
- compatibility change
- score change
- product publication
- comparison publication
- commercial opportunity

## Level 3 — Human-only strategic decisions

Examples:

- recommendation methodology
- benchmark methodology
- major scoring changes
- legal/security claims
- sponsored recommendation policy
- new business model
- TechNaam-owned product decisions

The exact automation boundaries should be finalized before OpenClaw receives production authority.

---

# 32. OpenClaw Audience Goals

OpenClaw should eventually help TechNaam acquire **real audience**, not fake engagement.

It should discover:

- what users are searching for;
- emerging technologies;
- high-value questions;
- missing comparisons;
- compatibility questions;
- hardware/software combinations;
- mobile questions;
- regional demand;
- content gaps;
- product gaps;
- monetization opportunities.

Success metrics should ultimately include:

**traffic → engagement → tool usage → recommendations → clicks → conversions → revenue**

not merely:

**number of articles generated.**

---

# 33. TechNaam API

The API is a major future product.

Potential API capabilities:

- product lookup
- product comparison
- compatibility checks
- price intelligence
- technology relationships
- recommendation
- stack analysis
- technology-change detection
- structured intelligence

Example:

> "Which AI coding tool best fits this developer?"

or:

> "Can this laptop run this model?"

or:

> "Compare these two technologies."

Potential revenue:

- API subscription
- usage-based billing
- enterprise plans
- data licensing
- white-label

---

# 34. Revenue Architecture

TechNaam should continuously evaluate every legitimate revenue channel.

## Product / vendor level

- affiliate
- referral
- commission
- reseller
- partner
- lead generation

## Website level

- advertising
- sponsored placement
- featured launches
- premium tools
- qualified leads

## Media level

- YouTube ads
- sponsorship
- affiliate
- vendor partnerships

## Intelligence level

- API
- data licensing
- enterprise intelligence
- premium monitoring

## Platform level

- SaaS
- white-label
- enterprise
- subscriptions

## Ownership level

- TechNaam-owned products
- TechNaam-owned SaaS
- intellectual property
- licensing

**Permanent principle:**

> Do not leave legitimate revenue opportunities undiscovered merely because the primary business model is affiliate or advertising.

---

# 35. Phase 7 — OpenClaw / Continuous Intelligence

**Future phase**

Prerequisites:

- master schema/policy audit complete
- Technology Graph design complete
- expanded categories defined
- commercial intelligence rules complete
- approval system defined
- evidence/provenance workflow defined

Then:

**Sources → OpenClaw research → evidence → human review → approved intelligence → database**

OpenClaw becomes the maintenance engine rather than a replacement for TechNaam's decision methodology.

---

# 36. Phase 8 — SEO / GEO / Programmatic Discovery

Build structured pages around the intelligence database.

Potential surfaces:

- `/tools/...`
- `/compare/...`
- `/best/...`
- compatibility pages
- hardware/software combinations
- mobile comparisons
- price intelligence
- technology relationships

The goal is not mass thin content.

The goal is:

**structured intelligence + useful user intent + authoritative source-backed answers.**

---

# 37. Phase 9 — Monetization Engine

Activate and optimize:

- affiliate
- referral
- partner
- lead
- advertising
- sponsorship
- featured listings
- YouTube revenue
- premium tools

Track commercial performance separately from recommendation quality.

---

# 38. Phase 10 — Analytics / Growth

Measure:

- traffic
- source
- tool-page engagement
- comparison usage
- Advisor usage
- Roast usage
- recommendation clicks
- affiliate clicks
- lead conversion
- API usage
- revenue
- revenue per qualified visitor
- vendor/category performance

Use data to improve the product, not to manipulate rankings.

---

# 39. Phase 11 — API / SaaS / White Label

Develop:

- public API
- authentication
- rate limits
- API keys
- usage plans
- billing
- developer portal
- enterprise access
- white-label recommendations

---

# 40. Phase 12+ — TechNaam-Owned A+ Products

Use TechNaam's intelligence to identify gaps.

Pipeline:

**Demand → Problem → Opportunity → Validation → Product → A+ quality → Launch → Measure → Improve**

This is where TechNaam can capture the economics of its own technology rather than only monetizing third-party products.

---

# 41. Permanent TechNaam Rules

## Rule 1 — Truth before commission

Commission never silently determines technical suitability.

## Rule 2 — Sponsored is not recommended

Paid visibility must remain distinguishable from independent recommendation.

## Rule 3 — Unknown is not false

Unverified information must remain unknown.

## Rule 4 — Provenance matters

Important facts should have source/evidence and verification information.

## Rule 5 — Compatibility is first-class intelligence

TechNaam must eventually answer whether technologies work together.

## Rule 6 — Exact variants matter

Price comparison must compare the same model/variant wherever possible.

## Rule 7 — Store trust matters

Cheapest price is not automatically best deal.

## Rule 8 — Commercial intelligence is separate

Revenue opportunity is tracked independently from technical/user-fit scoring.

## Rule 9 — TechNaam-owned products receive no hidden favoritism

Own products must earn their recommendations.

## Rule 10 — OpenClaw does not replace methodology

OpenClaw collects and maintains intelligence.

TechNaam's methodology makes decisions.

## Rule 11 — Human approval remains strategic

High-impact changes require human approval.

## Rule 12 — Protect `main`

Development stays on `technaam-intelligence` until explicitly approved.

## Rule 13 — Protect secrets

Never commit environment files, API keys, service-role keys or credentials.

## Rule 14 — Preserve RLS

Public functionality must not bypass database security.

## Rule 15 — Minimal targeted changes

Coding agents must inspect before editing and avoid unrelated modifications.

---

# 42. Agent Responsibility Model

## Jules

Best used for:

- controlled application development
- UI
- API routes
- database integration
- deterministic engines
- tests
- targeted architectural amendments
- production hardening

Jules must:

- inspect first;
- change only requested scope;
- run tests;
- run build;
- review diff;
- report exact files;
- keep `main` protected.

## Codex

Best used when:

- difficult engineering problems appear;
- deeper refactoring is required;
- architecture needs intensive reasoning;
- Jules reaches a technical blocker.

## OpenClaw

Best used after the foundation is approved for:

- research
- monitoring
- discovery
- evidence collection
- change detection
- catalog expansion
- commercial opportunity detection
- audience intelligence
- maintenance

OpenClaw should operate inside the approval policy.

## Human / TechNaam owner

Responsible for:

- business strategy
- methodology
- final approval
- high-impact recommendations
- monetization policy
- sponsored-placement policy
- benchmark methodology
- strategic product decisions

---

# 43. Immediate Execution Order

This is the most important operational section.

## NOW

### Step 1 — Freeze the Phase 6C checkpoint

Do not seed the remaining products yet.

Cursor remains the single proof-of-concept seed.

### Step 2 — Complete the full repository audit

Compare actual implementation against this roadmap.

### Step 3 — Finalize the data architecture for the expanded TechNaam vision

Prioritize:

1. Technology Graph
2. hardware entities
3. OS/version intelligence
4. mobile entities
5. compatibility relationships
6. retailer/store offers
7. store reputation
8. commercial opportunity model

### Step 4 — Finalize policies

Especially:

- recommendation integrity
- affiliate/commission separation
- sponsored listings
- price comparison
- store reputation
- evidence/provenance
- human approval
- OpenClaw authority

### Step 5 — Make only the necessary amendments

Use Jules on `technaam-intelligence`.

Do not modify unrelated systems.

### Step 6 — Re-test

Run:

- seed validation
- Advisor tests
- Advisor AI tests
- Roast tests
- Roast AI tests
- build
- lint

### Step 7 — Re-verify Supabase

Confirm:

- schema
- RLS
- Cursor seed
- publication state
- no unintended products published

### Step 8 — Create the OpenClaw-ready handoff

The master roadmap + technical handoff + approval policy become the permanent instructions.

### Step 9 — Begin controlled catalog expansion

Only after approval.

OpenClaw can then research candidates, prepare evidence, and propose records.

### Step 10 — Human approval

Approved products enter the publication pipeline.

---

# 44. The Core TechNaam Architecture

The final vision is:

```text
                         TECHNAAM
                            │
                  TECHNOLOGY INTELLIGENCE
                            │
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
          SOFTWARE       HARDWARE        MOBILE
             │              │              │
             └──────────────┼──────────────┘
                            ↓
                   TECHNOLOGY GRAPH
                            ↓
                    VERIFIED DATABASE
                            ↓
                 ┌──────────┼──────────┐
                 ↓          ↓          ↓
              TOOLS      COMPARE     ADVISOR
                 │          │          │
                 └──────────┼──────────┘
                            ↓
                     ROAST MY STACK
                            ↓
                    AI EXPLANATION
                            ↓
                    USER DECISION
                            │
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
       Affiliate          Leads              Ads
          ↓                 ↓                 ↓
       Partners         Sponsorship       YouTube
          └─────────────────┼─────────────────┘
                            ↓
                         REVENUE
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
          TechNaam API     SaaS       OWN PRODUCTS
              │             │             │
              └─────────────┼─────────────┘
                            ↓
                     TECHNAAM A+ PRODUCTS
```

---

# 45. The OpenClaw Intelligence Loop

```text
Official sources
      ↓
OpenClaw research
      ↓
Candidate fact/change
      ↓
Evidence
      ↓
Confidence
      ↓
Human approval where required
      ↓
TechNaam database
      ↓
Tools / Compare / Advisor / Roast / API
      ↓
Users
      ↓
Behavior + demand signals
      ↓
OpenClaw discovers next opportunity
```

This creates a continuously improving intelligence system.

---

# 46. Definition of Success

TechNaam should not be judged merely by:

- number of products;
- number of pages;
- number of articles.

The stronger success model is:

**Can TechNaam correctly understand a user's technology problem and recommend a suitable solution using verified information?**

Then:

**Can TechNaam identify the best legitimate commercial path without compromising trust?**

Then:

**Can TechNaam continuously maintain that intelligence?**

Finally:

**Can TechNaam turn the intelligence into recurring revenue and eventually create better products of its own?**

---

# 47. Current Position

At this checkpoint:

**Foundation:** strong  
**Database:** built  
**Security/RLS:** established  
**Seed pipeline:** built  
**Public catalog:** built  
**Comparison:** built  
**Deterministic Advisor:** built  
**Advisor AI:** built  
**Roast:** built  
**Roast AI / Phase 6C:** built  
**Cursor proof-of-concept seed:** established  
**Expanded technology universe:** not yet fully modeled  
**OpenClaw production layer:** not yet implemented  
**Price/store intelligence:** not yet implemented  
**API:** future  
**Audience engine:** future  
**TechNaam-owned A+ products:** future

Therefore:

> **The next milestone is not "add more random products."**
>
> **The next milestone is to make the intelligence architecture capable of understanding the complete technology ecosystem we have now defined.**

After that foundation is approved, **catalog scale becomes an operations problem**, and OpenClaw can take over much of the repetitive research and maintenance work under controlled human approval.

---

# 48. One-Sentence Mission

> **TechNaam is a source-verified technology intelligence platform that understands relationships between technologies, recommends what fits the user, compares real-world costs and alternatives, identifies legitimate commercial opportunities without corrupting its recommendations, continuously maintains its intelligence through automation, exposes that intelligence through web/API products, and eventually builds A+ technology products of its own.**

---

# 49. Master Execution Rule

**Do not lose the architecture while chasing speed.**

Build the intelligence system once.

Make the data trustworthy.

Make the relationships explicit.

Keep commercial incentives separated from technical truth.

Automate the repetitive work.

Keep humans in control of strategic decisions.

Then scale.

