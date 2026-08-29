# TECHNAAM PHASE 6C → PHASE 7 READINESS AUDIT

**Status:** Approved execution checkpoint  
**Baseline:** `technaam-intelligence` / Phase 6C  
**Audit basis:** Supplied TechNaam ZIP + existing engineering handoff + approved `TECHNAAM_MASTER_ROADMAP.md` + owner-confirmed live state  
**Current live seed:** Cursor only (owner-confirmed)  
**Purpose:** Decide exactly what must be amended before Phase 7/OpenClaw catalog expansion.

---

# 1. EXECUTIVE DECISION

## Do NOT start large-scale OpenClaw catalog population yet.

The Phase 6C product foundation is strong enough to continue, but the **data model is still optimized for AI/developer tools**.

Before OpenClaw is allowed to populate a much larger technology universe, TechNaam must make a controlled architecture expansion.

The correct sequence is:

```text
Phase 6C
   ↓
READINESS AUDIT
   ↓
FOUNDATION AMENDMENTS
   ↓
REGRESSION TEST
   ↓
OPENCLAW-READY CONTRACT
   ↓
PHASE 7
   ↓
CONTROLLED CATALOG EXPANSION
```

The goal is NOT to rebuild the application.

The goal is to make the existing intelligence foundation **generic enough to represent the complete technology ecosystem**.

---

# 2. VERIFIED CURRENT STATE

## Git / project

- Development branch: `technaam-intelligence`
- `main` remains protected
- Phase 6C has been pulled from GitHub
- Local working tree was verified clean before adding the master roadmap
- `TECHNAAM_MASTER_ROADMAP.md` is now committed to the project documentation

## Product system already present

- Tools catalog
- Product detail
- Comparison
- Deterministic Advisor
- Advisor API
- Advisor AI explanation
- Roast My Stack
- Roast API
- Roast AI explanation
- Seed validation
- Seed import
- Controlled publication
- Supabase/PostgreSQL intelligence schema
- RLS/public-private boundaries
- evidence/provenance foundation

The engineering handoff confirms that the deterministic Advisor remains authoritative and the AI explanation layer cannot replace its score, ranking, price, or plan. It also confirms that affiliate data is isolated from Advisor scoring. 

---

# 3. CURRENT DATA FOUNDATION

The current schema contains:

- vendors
- categories
- products
- features
- product_features
- integrations
- models
- product_models
- pricing_plans
- pricing_history
- affiliate_programs
- sources
- hardware_requirements
- benchmarks
- technaam_scores
- change_log
- evidence

This is a good foundation.

However, several tables are currently shaped around the first AI/developer-tool use case.

---

# 4. IMPORTANT CURRENT LIMITATION: PRODUCT TYPE

The current `products.product_type` CHECK constraint permits only:

- `ai_ide`
- `coding_agent`
- `ai_app_builder`
- `local_ai`
- `developer_tool`
- `code_assistant`

That is the first major scalability blocker.

TechNaam's future catalog requires types such as:

- software
- AI service
- AI model
- application
- operating system
- OS version
- laptop
- desktop
- workstation
- CPU
- GPU
- RAM
- SSD/storage
- monitor
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
- technology standard
- peripheral
- networking equipment
- other technology entities

### Decision

Do not simply keep adding dozens of hard-coded enum values forever.

The long-term design should allow a **controlled technology taxonomy** that can grow without repeated schema surgery.

---

# 5. TECHNOLOGY GRAPH — REQUIRED BEFORE OPENCLAW SCALE

The current schema represents products and some relationships, but it does not yet provide a general-purpose technology relationship graph.

We need to represent relationships such as:

```text
Product
   ↓
supports
   ↓
Operating System

Software
   ↓
requires
   ↓
OS version

AI Model
   ↓
requires
   ↓
RAM / VRAM / GPU

Application
   ↓
runs_on
   ↓
Phone / Laptop / Desktop

Technology A
   ↓
integrates_with
   ↓
Technology B

Technology A
   ↓
alternative_to
   ↓
Technology B

Technology A
   ↓
depends_on
   ↓
Technology B
```

### Decision

Add a general relationship layer rather than continuing to encode relationships in text fields.

This becomes the backbone of compatibility intelligence.

---

# 6. OPERATING SYSTEM INTELLIGENCE

Current hardware requirements use an `operating_systems text[]` field.

That is useful for the first dataset but insufficient for long-term compatibility.

TechNaam needs eventually to understand:

- Windows
- Windows 11 editions/versions
- Windows 10 editions/versions where relevant
- older supported Windows versions where relevant
- macOS versions
- Linux distributions
- Android versions
- iOS versions

### Required future structure

```text
OS
 └── OS Version / Edition
       └── Support relationship
             └── Product
```

The system must distinguish:

- minimum supported
- recommended
- unsupported
- unknown
- end-of-support

---

# 7. HARDWARE INTELLIGENCE

The existing `hardware_requirements` table is useful for software requirements.

It is NOT yet a complete hardware catalog.

Future hardware needs first-class entities:

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
- phone
- tablet
- peripheral

### Decision

Keep `hardware_requirements` for requirements.

Add a separate hardware/product entity model rather than overloading requirements into a device catalog.

---

# 8. MOBILE INTELLIGENCE

Mobile is currently not a first-class catalog category.

It must eventually support:

- Android phones
- iPhones
- tablets
- manufacturers
- exact models
- generations
- RAM/storage
- chipset
- GPU
- OS version
- update support
- app compatibility
- AI capabilities
- regional availability
- price
- retailer offers

This is necessary for the planned:

> Samsung flagship → premium recommendation  
> Tecno → lower-cost alternative

without turning the recommendation into a simple brand ranking.

---

# 9. PRICE COMPARISON — MAJOR NEW LAYER

Current `pricing_plans` represent vendor/service plans.

They do NOT solve retailer price comparison.

TechNaam needs a separate **offer/market-price model**.

Example:

```text
Product
   ↓
Exact variant
   ↓
Retail offer
   ├── Store
   ├── Seller
   ├── Region
   ├── Currency
   ├── Price
   ├── Tax
   ├── Shipping
   ├── Availability
   ├── Warranty
   ├── Return policy
   ├── URL
   └── Checked timestamp
```

### Critical rule

The same product name is not enough.

The system must compare the exact:

- model
- variant
- RAM
- storage
- region
- condition
- seller

where relevant.

---

# 10. STORE / SELLER REPUTATION

This is completely different from product quality.

A retailer may be:

- cheap but risky
- expensive but highly trusted
- official
- marketplace seller
- refurbished specialist
- region-specific

TechNaam eventually needs:

### Lowest Price

Pure price comparison.

### Best Deal

Price + trust + warranty + return + availability + seller quality.

### Most Trusted

Store/seller quality.

These must not be merged into one unexplained score.

---

# 11. COMMERCIAL INTELLIGENCE

The current architecture already has an important protection:

`affiliate_programs` is not queried by the Advisor, and recommendation scoring has no affiliate fields.

This rule MUST remain.

However, the future commercial layer needs to expand beyond a single affiliate-program table.

Potential commercial objects:

- affiliate
- referral
- commission
- partner
- reseller
- lead
- advertisement
- sponsorship
- featured listing
- launch placement
- API revenue
- SaaS revenue
- licensing
- white-label

### Decision

Commercial intelligence should become a separate subsystem.

It can answer:

> "Can TechNaam make money from this product?"

It must not silently answer:

> "Therefore recommend this product."

---

# 12. SPONSORED / FIRST-LISTING POLICY

TechNaam may sell visibility.

Examples:

- featured launch
- sponsored placement
- first-listing campaign
- promoted product
- vendor advertising

But:

```text
PAYMENT
   ≠
TECHNICAL RECOMMENDATION
```

A sponsored product can still independently win the recommendation.

A non-paying product can still be #1.

The UI should clearly distinguish:

- Recommended
- Sponsored
- Featured
- Advertisement

---

# 13. EVIDENCE / PROVENANCE

The current evidence table is a strong foundation.

It records:

- entity
- source
- field
- observed value
- detection time
- verification time
- confidence
- review status

The current design intentionally uses a polymorphic `entity_type + entity_id` relationship.

### Decision

Keep the concept, but before OpenClaw scale we need:

- controlled entity types
- deduplication rules
- source priority
- evidence versioning
- change detection
- conflict handling
- approval workflow
- stale-data rules
- audit trail

OpenClaw will generate far more evidence than the current seed can produce, so this must be designed for scale.

---

# 14. SOURCE POLICY

Current seed methodology is correct:

- prefer first-party sources;
- do not use affiliate sites as factual authority;
- leave unknown data unknown;
- attach sources to verifiable facts.

This policy should remain permanent.

For commercial information, official vendor/partner program sources should be preferred.

For retailer prices, the retailer/marketplace offer itself becomes the factual source for the offer.

---

# 15. ADVISOR — CURRENT STRENGTH AND FUTURE GAP

The current Advisor is deterministic and uses:

- requirement match
- feature match
- budget fit
- team fit
- privacy fit
- local AI fit
- platform fit
- collaboration fit
- agent fit
- technical fit

Unknown information reduces confidence rather than being treated as false.

This is good.

### Future expansion required

The Advisor eventually needs to understand:

- hardware compatibility
- OS compatibility
- mobile compatibility
- model capability
- exact product variants
- effective usage cost
- retailer price
- store trust
- regional availability
- lifecycle/support
- technology dependencies

The Advisor should evolve rather than be replaced.

---

# 16. IMPORTANT PRICING GAP

Current pricing normalization handles:

- free
- monthly
- annual
- per-user

Usage-based/custom plans can become unknown.

That is safe, but it is not yet the final **Effective Cost Calculator**.

Future cost estimation should support:

```text
subscription
+
expected usage
+
premium model usage
+
overage
+
required infrastructure
+
team size
=
estimated effective cost
```

The system must show assumptions and uncertainty.

It must never pretend that an unknown usage cost is an exact price.

---

# 17. CURRENT SEED STATUS

The repository contains a 10-product research dataset:

- Cursor
- GitHub Copilot
- Claude Code
- Windsurf
- Replit
- Lovable
- Bolt.new
- v0
- Ollama
- Aider

The seed validator passes and reports:

- 19 sources
- 10 vendors
- 6 categories
- 14 features
- 10 products
- 34 product-feature relationships
- 14 pricing plans
- 1 model
- 2 hardware requirement records

The dataset is deliberately limited to AI coding/local AI products.

**Live state is separate from repository seed files.**

Owner-confirmed current live seed:

> **Cursor only.**

Do not seed the other nine until the architecture amendment gate is complete.

---

# 18. FIRST AMENDMENT PRIORITY

Before OpenClaw receives authority to populate the catalog, implement these foundation capabilities in this order:

## P0 — Technology taxonomy

Make product/entity types extensible.

## P0 — Technology relationships

Create the general Technology Graph.

## P0 — OS/version model

Move beyond plain OS text arrays.

## P0 — Hardware entity model

Separate hardware products from software requirements.

## P0 — Evidence/change framework

Make provenance and review scalable.

## P0 — Commercial intelligence model

Keep commercial data independent from recommendation scoring.

## P1 — Retail offers

Create exact-variant price comparison infrastructure.

## P1 — Store/seller reputation

Create trusted-deal evaluation.

## P1 — Effective cost model

Prepare subscription + usage + infrastructure calculations.

## P1 — OpenClaw ingestion contract

Define exactly what an agent may discover, propose, update, and publish.

---

# 19. WHAT WE SHOULD NOT DO

Do NOT:

- seed all 10 immediately;
- let OpenClaw write arbitrary database rows;
- let OpenClaw alter recommendation methodology;
- let commissions influence scores;
- use retailer price alone to define the best deal;
- treat unknown compatibility as compatibility;
- make every technology a simple `product` record without relationships;
- expose private evidence/source/commercial information;
- rebuild the existing Advisor unnecessarily;
- modify `main`;
- mix this work with LegalSphere unless explicitly required.

---

# 20. JULES EXECUTION CONTRACT

The next Jules task should be **foundation amendment only**.

Jules should:

1. Read `TECHNAAM_MASTER_ROADMAP.md`.
2. Read `TECHNAAM-INTELLIGENCE-HANDOFF.md`.
3. Inspect current migrations and queries.
4. Propose the smallest safe schema evolution.
5. Preserve existing public routes.
6. Preserve Cursor behavior.
7. Preserve RLS.
8. Preserve affiliate isolation.
9. Preserve deterministic Advisor authority.
10. Add tests for every new relationship/data rule.
11. Run seed validation.
12. Run Advisor tests.
13. Run Roast tests.
14. Run build.
15. Review diff.
16. Report exact files changed.
17. Do not publish additional products.
18. Do not merge `main`.

---

# 21. OPENCLAW CONTRACT

OpenClaw comes AFTER the foundation amendment.

Its job:

```text
DISCOVER
   ↓
RESEARCH
   ↓
COLLECT EVIDENCE
   ↓
DETECT CHANGES
   ↓
NORMALIZE
   ↓
PROPOSE
   ↓
HUMAN APPROVAL
   ↓
PUBLISH / UPDATE
```

OpenClaw is not the final authority on methodology.

---

# 22. OPENCLAW AUTHORITY LEVELS

## Level 1 — Automatic

Examples:

- discover candidate product
- detect changed source
- detect broken URL
- flag stale record
- create research task

## Level 2 — Human approval

Examples:

- new product publication
- pricing update
- compatibility update
- affiliate change
- store reputation update
- score-affecting fact
- commercial placement

## Level 3 — Human only

Examples:

- scoring methodology
- recommendation policy
- benchmark methodology
- sponsorship policy
- major business model changes
- TechNaam-owned product strategy

---

# 23. CATALOG EXPANSION STRATEGY

Do not jump from 1 product to thousands.

Use controlled expansion:

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
OpenClaw-assisted continuous catalog
```

Each expansion should test:

- data quality
- evidence quality
- compatibility
- recommendation quality
- price quality
- commercial separation
- performance
- user usefulness

---

# 24. DEFINITION OF OPENCLAW-READY

TechNaam is OpenClaw-ready when:

- technology types are extensible;
- relationships are explicit;
- OS/version entities exist;
- hardware entities exist;
- evidence workflow is scalable;
- source priority is defined;
- commercial intelligence is isolated;
- retailer offers have a proper model;
- store reputation has a proper model;
- publication requires approval;
- agent permissions are defined;
- conflicts have deterministic handling;
- stale facts can be detected;
- audit logs exist;
- existing Advisor/Compare/Roast continue to pass regression tests.

---

# 25. NEXT EXECUTION CHECKPOINT

The next coding milestone should therefore be:

## PHASE 6C.1 — TECHNOLOGY INTELLIGENCE FOUNDATION AMENDMENT

Scope:

1. taxonomy expansion;
2. technology relationships;
3. OS/version foundation;
4. hardware entity foundation;
5. evidence/change workflow;
6. commercial intelligence foundation;
7. tests;
8. regression verification.

Do NOT build the complete retailer marketplace or OpenClaw automation in this milestone.

Build the **foundation that makes those future systems possible**.

---

# 26. AFTER 6C.1

Then:

## Phase 6C.2
Retail price + store/seller intelligence foundation.

## Phase 6C.3
Effective cost calculator.

## Phase 6C.4
Expanded Advisor/Compare/Compatibility integration.

## Phase 6C.5
OpenClaw ingestion + approval contract.

## Phase 6C.6
OpenClaw pilot with a small approved catalog.

## Phase 7
Continuous Technology Intelligence / OpenClaw operations.

---

# 27. FINAL OPERATING PRINCIPLE

TechNaam should become:

> **A source-of-truth technology intelligence system, not merely a list of products.**

The product catalog is only one layer.

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

OpenClaw maintains that intelligence.

TechNaam decides from it.

Humans govern the rules.

That is the architecture we should protect as the project scales.
