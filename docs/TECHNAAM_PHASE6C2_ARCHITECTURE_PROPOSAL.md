# TECHNAAM PHASE 6C.2 — ARCHITECTURE PROPOSAL

## 1. Executive Summary
Phase 6C.2 introduces the "Retail Price + Store/Seller Intelligence Foundation". Building upon the exact entity definitions established in Phase 6C.1 (`technology_entities`), this phase provides the architectural backbone for distinguishing between "Lowest Price", "Best Deal", and "Most Trusted Store" for exactly matched technology variants (e.g., specific hardware configurations, software licenses). Crucially, this architecture enforces the absolute separation of public retail offers from private commercial economics (commissions, affiliate data), ensuring that recommendation integrity remains uncompromised and fully deterministic.

## 2. Current Architecture Assessment
The current Phase 6C.1 architecture relies on a `technology_entities` anchor, which successfully maps to `products`, `hardware_entities`, and `os_entities`.
Currently:
- Cost logic uses `pricing_plans` (optimized for software subscriptions/services).
- Commercial tracking exists via `affiliate_programs`.
- There is no model for physical retailers, marketplace sellers, distinct geographic regions, or exact physical/variant offers.
- Exact variants of hardware (like 256GB vs 512GB) are handled through unique `hardware_entities` anchored to `technology_entities`, offering a sound foundation for mapping retail offers.

## 3. Phase 6C.2 Exact Scope
This phase defines the data schemas, RLS boundaries, and matching logic required to:
- Establish identities for Stores (Retailers) and Marketplace Sellers.
- Track exact retail offers (prices, conditions, stock, shipping) strictly tied to a `technology_entities` record.
- Establish trust/reputation metrics for stores/sellers independently from product quality.
- Securely isolate private commercial/affiliate economics from public market prices.
- Provide foundations for geographic/currency-based price evaluations.

This phase **does not** implement UI marketplace views, OpenClaw ingestion, or the Effective Cost Calculator.

## 4. Proposed Commercial Schema
The schema expands the isolated `commercial` namespace to encompass physical/digital market retail mechanisms.

```sql
create schema if not exists commercial;

-- Explicit separation of Store vs Seller identity
-- 'stores' represent the storefront (e.g., Amazon, Best Buy, Vendor Official Store)
-- 'sellers' represent 3rd-party entities operating within a marketplace store.
```

## 5. `commercial.stores` Design
We propose a model that captures reputation independently of product scoring.

```sql
create table commercial.stores (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    store_type text not null check (store_type in ('official_vendor', 'retailer', 'marketplace', 'other')),
    website_url text,

    -- Reputation & Reliability (0.0 to 1.0 scales)
    trust_score numeric(4,3) check (trust_score >= 0 and trust_score <= 1),
    warranty_reliability numeric(4,3),
    return_reliability numeric(4,3),
    shipping_reliability numeric(4,3),
    authenticity_signals numeric(4,3),
    customer_service_signals numeric(4,3),

    is_active boolean default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

## 6. `commercial.retail_offers` Design
The exact offer identity.

```sql
create table commercial.sellers (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references commercial.stores(id) on delete cascade,
    seller_name text not null,
    seller_url text,
    trust_score numeric(4,3) check (trust_score >= 0 and trust_score <= 1),
    is_active boolean default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Composite unique constraint to enforce store/seller integrity on retail offers
    constraint sellers_store_id_id_key unique (store_id, id)
);

create table commercial.retail_offers (
    id uuid primary key default gen_random_uuid(),
    -- Changed to RESTRICT: Canonical technology identity should not casually delete commercial history
    tech_entity_id uuid not null references public.technology_entities(id) on delete restrict,
    store_id uuid not null references commercial.stores(id) on delete restrict,
    seller_id uuid,

    -- DB-level constraint preventing an offer from assigning Seller X to Store Y
    -- Changed to RESTRICT to preserve commercial history and avoid ambiguous column-level SET NULL constraints
    foreign key (store_id, seller_id) references commercial.sellers(store_id, id) on delete restrict,

    -- Regional & Price
    region_code text not null, -- ISO 3166-1 alpha-2 (e.g., 'US', 'GB', 'PK', 'DE')
    currency_code text not null, -- ISO 4217 (e.g., 'USD')
    price numeric(12,2) not null,
    tax_included boolean default false,
    shipping_cost numeric(12,2),

    -- Offer Details
    condition text not null check (condition in ('new', 'refurbished', 'used')),
    availability text not null check (availability in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
    warranty_info text,
    return_policy text,
    offer_url text not null,

    -- Provenance & Security
    is_published boolean not null default false,
    confidence numeric(4,3) check (confidence >= 0 and confidence <= 1),
    source_id uuid references public.sources(id) on delete set null,
    checked_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

## 7. Public/Private Security Boundary
- **Public:** `commercial.retail_offers`, `commercial.stores`, and `commercial.sellers`. These represent the open market state.
- **Private:** `commercial.partner_agreements` (proposed previously) and `public.affiliate_programs` remain strictly protected. The Advisor algorithm and public UI will **never** select from private agreement tables to influence rankings.

## 8. RLS Design
Row-Level Security must strictly govern publication state.

**Store Publication Semantics:** Stores and Sellers are considered global metadata. We explicitly decouple store visibility from offer availability. If a store is `is_active = true`, it is publicly visible, allowing the platform to maintain a public directory of trusted stores regardless of current inventory. Inactive stores (`is_active = false`) are completely hidden.

```sql
-- Store & Seller RLS
alter table commercial.stores enable row level security;
create policy "Active stores are public" on commercial.stores
    for select using (is_active = true);

alter table commercial.sellers enable row level security;
create policy "Active sellers in active stores are public" on commercial.sellers
    for select using (
        is_active = true
        and exists (
            select 1 from commercial.stores s
            where s.id = store_id and s.is_active = true
        )
    );

-- Retail Offers RLS
alter table commercial.retail_offers enable row level security;
create policy "Published offers on published entities are public" on commercial.retail_offers
    for select using (
        is_published = true
        and exists (
            select 1 from public.technology_entities te
            where te.id = tech_entity_id and te.is_published = true
        )
    );
```
*(Service roles bypass these for ingestion via Admin API)*

## 9. Evidence/Provenance Relationship & Confidence Semantics
Retail offers, being highly dynamic, maintain their own `checked_at` timestamp, `confidence` score, and direct `source_id`.

**Confidence Semantics:**
- `confidence`: Represents the system's certainty that the recorded price/stock accurately reflects the retailer's actual current state.
- **NULL / Unknown**: Denotes that confidence is unmeasured or the scraper failed to assess reliability.
- **Numeric**: A human or agent-assessed value (0.0 to 1.0).
- `checked_at`: The exact time the offer was observed. This does *not* auto-calculate confidence.
- `source_id`: The provenance record tracking where the data originated.

*Note: Phase 6C.2 provides the fields only. It does not invent or implement an automated confidence decay/calculation algorithm.* When OpenClaw detects price changes, instead of overwriting, changes can be logged to `public.change_log` referencing the `tech_entity_id`.

## 10. Region/Currency Strategy
**Open Decision:** Normalize regions vs. Standard Codes.
**Recommendation:** Use standard text codes (ISO 3166-1 alpha-2 for regions, ISO 4217 for currencies). Creating normalized `regions` and `currencies` tables introduces unnecessary join overhead at this stage. Standard text codes perfectly support filtering and UI localization without schema complexity.

## 11. Exact Offer Identity / Variant Matching Strategy
Offers are tied to `tech_entity_id`, **not** a generic product name.

**Verification of Phase 6C.1 Hardware Model:**
- **CONFIRMED EXISTING 6C.1 FIELDS:** Phase 6C.1 established `public.hardware_entities` linked 1:1 with `public.technology_entities`. This schema currently contains `memory_gb` (RAM) and `vram_gb`.
- **PROPOSED FUTURE VARIANT REPRESENTATION:** Additional hardware variant signals, such as exact `storage`, do not currently exist in the database schema and would require an extension of `hardware_entities` or the component graph.

However, the architecture ensures that if a vendor offers "Laptop X (16GB RAM)" and "Laptop X (32GB RAM)", these are explicitly represented as two separate `technology_entities` anchors via distinct `hardware_entities` records. The exact offer identity strategy remains firmly anchored to the `public.technology_entities.id` representing that exact variant. The system will NOT perform fuzzy string matching for variants at the offer level.

## 12. Store vs Seller Distinction
As defined in Section 6, the schema explicitly separates Stores (the platform/retailer, e.g., "Amazon") from Sellers (the marketplace participant, e.g., "TechStore USA" selling *on* Amazon). This is required because Amazon's overall return policy and trust score differ vastly from a low-rated 3rd-party seller operating on Amazon's marketplace.

## 13. Lowest Price vs Best Deal vs Most Trusted Store
These will be evaluated conceptually in the API/Application layer using the new schema.

**Price Comparability Rule:** Direct price comparison (`Lowest Price` or `Best Deal`) requires compatible properties. The API must group or filter by:
- `currency_code` (No currency conversion is assumed or implemented in 6C.2).
- `region_code`
- `tax_included` basis (pre-tax vs post-tax).
- `condition`
- `availability`

Assuming comparability properties match:
- **Lowest Price:** `ORDER BY price + coalesce(shipping_cost, 0) ASC`.
- **Most Trusted Store:** `ORDER BY stores.trust_score DESC` (or `sellers.trust_score`).
- **Best Deal:** A composite formula calculating the lowest comparable price meeting a `trust_score` threshold. *(Formulas and conversions are out of scope for 6C.2 database logic; schema merely provides the requisite data).*

## 14. Index Strategy
```sql
create index retail_offers_tech_entity_idx on commercial.retail_offers(tech_entity_id);
create index retail_offers_store_idx on commercial.retail_offers(store_id);
create index retail_offers_region_currency_idx on commercial.retail_offers(region_code, currency_code);
create index retail_offers_price_idx on commercial.retail_offers(price);
```

## 15. Migration Sequence
1. Ensure `commercial` schema exists.
2. Create `commercial.stores`.
3. Create `commercial.sellers`.
4. Create `commercial.retail_offers` with foreign keys to `technology_entities`, `stores`, `sellers`, and `sources`.
5. Apply RLS policies to all three tables ensuring strict `is_published` checks tied to the parent entity.

## 16. Backward Compatibility
This change is 100% additive. The Advisor, Compare, and Tool catalog queries currently do not reference the `commercial` schema and will continue functioning exactly as before. Existing `pricing_plans` remain intact for software/service subscriptions.

## 17. Regression Plan
Before deployment to production:
- Ensure `test-advisor-engine.mjs` and `test-advisor-api.mjs` pass.
- Ensure `test-roast-engine.mjs` passes.
- Ensure public unauthenticated access to unpublished retail offers is blocked via Supabase RLS tests.

## 18. Risks
- **Data Strikethroughs (Stale Prices):** Retail prices change frequently. If OpenClaw cannot keep up, users see stale data. *Mitigation:* The `checked_at` and `confidence` fields will be surfaced to the user.
- **Hardware Taxonomy Explosion:** Mapping every hardware variant to a `technology_entity` may cause massive catalog growth. *Mitigation:* This is expected and precisely why OpenClaw automation will be required in Phase 7.

## 19. Explicit Out-of-Scope Items
- Creation of actual SQL migrations for Phase 6C.2.
- UI implementations (Marketplace UI).
- OpenClaw API endpoints and bot scripts.
- The Effective Cost Calculator logic.
- Modifications to the core TechNaam Advisor deterministic scoring algorithm.

## 20. Questions/Ambiguities that Require Owner Approval
1. **Commercial Variant Anchor:** Is creating a new `technology_entities` anchor for *every* minor storage/RAM variant acceptable, or should we introduce a `commercial_variants` child table for purely commercial groupings? (Recommendation: Keep it at the `technology_entities` / `hardware_entities` level as proposed for uniformity, but requires owner sign-off).
2. **Marketplace Seller Trust Baseline:** When a `seller` lacks a trust score, should it inherit the `store` trust score, or default to 0 (Unknown)? (Recommendation: Keep it independent; an unknown seller on Amazon is still unknown).
