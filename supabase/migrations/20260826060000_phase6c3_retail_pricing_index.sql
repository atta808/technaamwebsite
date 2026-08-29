-- Migration: Phase 6C.3 - Retail Pricing Composite Index
-- Description: Adds a composite index to optimize queries fetching
-- retail offers for a specific technology entity sorted by
-- price per region/currency.

create index if not exists retail_offers_pricing_lookup_idx
    on commercial.retail_offers(
        tech_entity_id,
        currency_code,
        region_code,
        price
    );
