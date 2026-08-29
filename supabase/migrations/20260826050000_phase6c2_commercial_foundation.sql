-- =================================================================================
-- PHASE 6C.2 — COMMERCIAL FOUNDATION
-- Retail Price + Store/Seller Intelligence Foundation
-- =================================================================================

create schema if not exists commercial;

-- 1. Stores (Retailers / Marketplaces / Official Vendors)
create table commercial.stores (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    store_type text not null check (store_type in ('official_vendor', 'retailer', 'marketplace', 'other')),
    website_url text,

    trust_score numeric(4,3) check (trust_score >= 0 and trust_score <= 1),
    warranty_reliability numeric(4,3) check (warranty_reliability >= 0 and warranty_reliability <= 1),
    return_reliability numeric(4,3) check (return_reliability >= 0 and return_reliability <= 1),
    shipping_reliability numeric(4,3) check (shipping_reliability >= 0 and shipping_reliability <= 1),
    authenticity_signals numeric(4,3) check (authenticity_signals >= 0 and authenticity_signals <= 1),
    customer_service_signals numeric(4,3) check (customer_service_signals >= 0 and customer_service_signals <= 1),

    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_commercial_stores_updated_at
  before update on commercial.stores
  for each row execute function public.set_updated_at();

alter table commercial.stores enable row level security;
create policy "Active stores are public" on commercial.stores
    for select using (is_active = true);
create policy "Service role can do all to stores" on commercial.stores
    for all to service_role using (true) with check (true);


-- 2. Sellers (Marketplace 3rd-party entities)
create table commercial.sellers (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references commercial.stores(id) on delete cascade,
    seller_name text not null,
    seller_url text,
    trust_score numeric(4,3) check (trust_score >= 0 and trust_score <= 1),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Composite unique constraint to enforce store/seller integrity on retail offers
    constraint sellers_store_id_id_key unique (store_id, id)
);

create trigger set_commercial_sellers_updated_at
  before update on commercial.sellers
  for each row execute function public.set_updated_at();

alter table commercial.sellers enable row level security;
create policy "Active sellers in active stores are public" on commercial.sellers
    for select using (
        is_active = true
        and exists (
            select 1 from commercial.stores s
            where s.id = store_id and s.is_active = true
        )
    );
create policy "Service role can do all to sellers" on commercial.sellers
    for all to service_role using (true) with check (true);


-- 3. Retail Offers (Exact commercial variants matched to technology_entities)
create table commercial.retail_offers (
    id uuid primary key default gen_random_uuid(),
    tech_entity_id uuid not null references public.technology_entities(id) on delete restrict,
    store_id uuid not null references commercial.stores(id) on delete restrict,
    seller_id uuid,

    -- DB-level constraint preventing an offer from assigning Seller X to Store Y
    foreign key (store_id, seller_id) references commercial.sellers(store_id, id) on delete restrict,

    region_code text not null, -- ISO 3166-1 alpha-2
    currency_code text not null, -- ISO 4217
    price numeric(12,2) not null,
    tax_included boolean not null default false,
    shipping_cost numeric(12,2),

    condition text not null check (condition in ('new', 'refurbished', 'used')),
    availability text not null check (availability in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
    warranty_info text,
    return_policy text,
    offer_url text not null,

    is_published boolean not null default false,
    confidence numeric(4,3) check (confidence >= 0 and confidence <= 1),
    source_id uuid references public.sources(id) on delete set null,
    checked_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_commercial_retail_offers_updated_at
  before update on commercial.retail_offers
  for each row execute function public.set_updated_at();

create index retail_offers_tech_entity_idx on commercial.retail_offers(tech_entity_id);
create index retail_offers_store_idx on commercial.retail_offers(store_id);
create index retail_offers_region_currency_idx on commercial.retail_offers(region_code, currency_code);
create index retail_offers_price_idx on commercial.retail_offers(price);

alter table commercial.retail_offers enable row level security;
create policy "Published offers on published entities are public" on commercial.retail_offers
    for select using (
        is_published = true
        and exists (
            select 1 from public.technology_entities te
            where te.id = tech_entity_id and te.is_published = true
        )
    );
create policy "Service role can do all to retail offers" on commercial.retail_offers
    for all to service_role using (true) with check (true);
