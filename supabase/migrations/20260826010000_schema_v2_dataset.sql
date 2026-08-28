-- TechNaam Schema v2: dataset compatibility and evidence provenance.

-- 1. Sources
alter table public.sources
  drop constraint if exists sources_source_type_check;

alter table public.sources
  add constraint sources_source_type_check
  check (
    source_type in (
      'official_product',
      'official_pricing',
      'official_docs',
      'official_github',
      'official_changelog',
      'third_party',
      'benchmark',
      'review',
      'other'
    )
  );

alter table public.sources
  add column publisher text;

alter table public.sources
  add column title text;

-- 2. Products
alter table public.products
  add column product_type text;

alter table public.products
  add constraint products_product_type_check
  check (
    product_type in (
      'ai_ide',
      'coding_agent',
      'ai_app_builder',
      'local_ai',
      'developer_tool',
      'code_assistant'
    )
  );

-- 3. Pricing plans
alter table public.pricing_plans
  add column price_model text;

alter table public.pricing_plans
  add constraint pricing_plans_price_model_check
  check (
    price_model in (
      'free',
      'flat',
      'per_user',
      'usage_based',
      'custom'
    )
  );

alter table public.pricing_plans
  add column is_free boolean not null default false;

alter table public.pricing_plans
  alter column price drop not null;

alter table public.pricing_plans
  alter column billing_period drop not null;

-- usage_limits already exists as jsonb in the initial migration.

-- 4. Models
alter table public.models
  add column provider text;

create table public.product_models (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, model_id)
);

create index product_models_model_id_idx
  on public.product_models (model_id);

-- 5. Hardware requirements
alter table public.hardware_requirements
  add column gpu_required boolean;

alter table public.hardware_requirements
  add column vram_required_gb numeric(10, 2);

alter table public.hardware_requirements
  add column operating_systems text[];

-- 6. Evidence
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  source_id uuid not null references public.sources(id) on delete cascade,
  field_name text,
  observed_value text,
  detected_at timestamptz not null default now(),
  verified_at timestamptz,
  confidence numeric(4, 3)
    check (confidence >= 0 and confidence <= 1),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  notes text
);

create index evidence_entity_idx
  on public.evidence (entity_type, entity_id);

create index evidence_source_id_idx
  on public.evidence (source_id);

create index evidence_review_status_idx
  on public.evidence (review_status);

create index evidence_detected_at_idx
  on public.evidence (detected_at);

-- 7. RLS
alter table public.product_models enable row level security;
alter table public.evidence enable row level security;

create policy "public_read_product_models"
  on public.product_models for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.is_published = true
        and p.is_active = true
        and p.status not in ('deprecated', 'discontinued')
    )
    and exists (
      select 1
      from public.models m
      where m.id = model_id
        and m.is_published = true
        and m.is_active = true
    )
  );

-- evidence intentionally has no anon/authenticated policies;
-- provenance remains server/admin-only.
