-- Shared maintenance trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Catalog
-- ---------------------------------------------------------------------------

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website_url text,
  logo_url text,
  description text,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  parent_id uuid references public.categories(id) on delete set null,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  tagline text,
  description text,
  website_url text,
  logo_url text,
  status text not null default 'active'
    check (status in ('active', 'preview', 'deprecated', 'discontinued')),
  is_published boolean not null default false,
  is_active boolean not null default true,
  first_released_on date,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  support_level text not null default 'supported'
    check (support_level in ('supported', 'partial', 'not_supported', 'roadmap')),
  notes text,
  created_at timestamptz not null default now(),
  unique (product_id, feature_id)
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  vendor_id uuid references public.vendors(id) on delete set null,
  website_url text,
  integration_type text,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  model_type text not null default 'llm'
    check (model_type in ('llm', 'embedding', 'multimodal', 'other')),
  context_window integer,
  is_local boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Commercial intelligence
-- ---------------------------------------------------------------------------

create table public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  description text,
  currency text not null default 'USD'
    check (currency ~ '^[A-Z]{3}$'),
  price numeric(12, 2) not null default 0
    check (price >= 0),
  billing_period text not null default 'monthly'
    check (billing_period in ('one_time', 'weekly', 'monthly', 'quarterly', 'annual', 'usage_based')),
  is_per_user boolean not null default false,
  per_user_price numeric(12, 2) not null default 0
    check (per_user_price >= 0),
  trial_days integer not null default 0
    check (trial_days >= 0),
  usage_limits jsonb not null default '{}'::jsonb,
  source_url text,
  verified_at timestamptz,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pricing_history (
  id uuid primary key default gen_random_uuid(),
  pricing_plan_id uuid not null references public.pricing_plans(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now(),
  source_id uuid,
  detected_at timestamptz not null default now(),
  verified_at timestamptz,
  confidence numeric(4, 3)
    check (confidence >= 0 and confidence <= 1),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  notes text
);

create table public.affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  program_url text,
  commission_model text
    check (commission_model in ('percentage', 'flat', 'tiered', 'other')),
  commission_value numeric(12, 4),
  currency text
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  cookie_duration_days integer,
  disclosure_text text,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  url text not null,
  source_type text not null default 'vendor'
    check (source_type in ('vendor', 'official_doc', 'third_party', 'benchmark', 'review', 'other')),
  is_published boolean not null default false,
  is_active boolean not null default true,
  verified_at timestamptz,
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricing_history
  add constraint pricing_history_source_id_fkey
  foreign key (source_id) references public.sources(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Evaluation intelligence
-- ---------------------------------------------------------------------------

create table public.hardware_requirements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  os text,
  cpu text,
  memory_gb numeric(10, 2),
  storage_gb numeric(10, 2),
  gpu text,
  min_ram_gb numeric(10, 2),
  recommended_ram_gb numeric(10, 2),
  notes text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((product_id is null) <> (model_id is null)),
  check (min_ram_gb is null or recommended_ram_gb is null or min_ram_gb <= recommended_ram_gb)
);

create table public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  version text,
  benchmark_type text,
  product_id uuid references public.products(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  hardware_requirement_id uuid references public.hardware_requirements(id) on delete set null,
  hardware_spec text,
  task text not null,
  score numeric(12, 4),
  execution_time_ms numeric(12, 2),
  tokens_input bigint,
  tokens_output bigint,
  cost numeric(12, 6),
  success_rate numeric(5, 2)
    check (success_rate >= 0 and success_rate <= 100),
  tested_at date,
  tester text,
  notes text,
  source_id uuid references public.sources(id) on delete set null,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technaam_scores (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  overall numeric(3, 1)
    check (overall >= 0 and overall <= 10),
  performance numeric(3, 1)
    check (performance >= 0 and performance <= 10),
  value numeric(3, 1)
    check (value >= 0 and value <= 10),
  ease_of_use numeric(3, 1)
    check (ease_of_use >= 0 and ease_of_use <= 10),
  features numeric(3, 1)
    check (features >= 0 and features <= 10),
  reliability numeric(3, 1)
    check (reliability >= 0 and reliability <= 10),
  integrations numeric(3, 1)
    check (integrations >= 0 and integrations <= 10),
  automation numeric(3, 1)
    check (automation >= 0 and automation <= 10),
  local_ai numeric(3, 1)
    check (local_ai >= 0 and local_ai <= 10),
  methodology_version text,
  scored_at timestamptz,
  reviewed_at timestamptz,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  notes text,
  source_id uuid references public.sources(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  source_id uuid references public.sources(id) on delete set null,
  detected_at timestamptz not null default now(),
  confidence numeric(4, 3)
    check (confidence >= 0 and confidence <= 1),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  notes text
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index vendors_name_idx on public.vendors (name);
create index categories_parent_id_idx on public.categories (parent_id);
create index products_vendor_id_idx on public.products (vendor_id);
create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index product_features_product_id_idx on public.product_features (product_id);
create index product_features_feature_id_idx on public.product_features (feature_id);
create index integrations_vendor_id_idx on public.integrations (vendor_id);
create index models_vendor_id_idx on public.models (vendor_id);
create index pricing_plans_product_id_idx on public.pricing_plans (product_id);
create index pricing_plans_vendor_id_idx on public.pricing_plans (vendor_id);
create index pricing_plans_billing_period_idx on public.pricing_plans (billing_period);
create index pricing_history_pricing_plan_id_idx on public.pricing_history (pricing_plan_id);
create index pricing_history_source_id_idx on public.pricing_history (source_id);
create index pricing_history_changed_at_idx on public.pricing_history (changed_at);
create index affiliate_programs_vendor_id_idx on public.affiliate_programs (vendor_id);
create index affiliate_programs_product_id_idx on public.affiliate_programs (product_id);
create index sources_url_idx on public.sources (url);
create index sources_source_type_idx on public.sources (source_type);
create index hardware_requirements_product_id_idx on public.hardware_requirements (product_id);
create index hardware_requirements_model_id_idx on public.hardware_requirements (model_id);
create index benchmarks_product_id_idx on public.benchmarks (product_id);
create index benchmarks_model_id_idx on public.benchmarks (model_id);
create index benchmarks_task_idx on public.benchmarks (task);
create index benchmarks_tested_at_idx on public.benchmarks (tested_at);
create index change_log_entity_idx on public.change_log (entity_type, entity_id);
create index change_log_source_id_idx on public.change_log (source_id);
create index change_log_detected_at_idx on public.change_log (detected_at);
create index change_log_review_status_idx on public.change_log (review_status);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger set_vendors_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_features_updated_at
before update on public.features
for each row execute function public.set_updated_at();

create trigger set_integrations_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

create trigger set_models_updated_at
before update on public.models
for each row execute function public.set_updated_at();

create trigger set_pricing_plans_updated_at
before update on public.pricing_plans
for each row execute function public.set_updated_at();

create trigger set_affiliate_programs_updated_at
before update on public.affiliate_programs
for each row execute function public.set_updated_at();

create trigger set_sources_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create trigger set_hardware_requirements_updated_at
before update on public.hardware_requirements
for each row execute function public.set_updated_at();

create trigger set_benchmarks_updated_at
before update on public.benchmarks
for each row execute function public.set_updated_at();

create trigger set_technaam_scores_updated_at
before update on public.technaam_scores
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.vendors enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.features enable row level security;
alter table public.product_features enable row level security;
alter table public.integrations enable row level security;
alter table public.models enable row level security;
alter table public.pricing_plans enable row level security;
alter table public.pricing_history enable row level security;
alter table public.affiliate_programs enable row level security;
alter table public.sources enable row level security;
alter table public.hardware_requirements enable row level security;
alter table public.benchmarks enable row level security;
alter table public.technaam_scores enable row level security;
alter table public.change_log enable row level security;

create policy "public_read_published_vendors"
  on public.vendors for select
  to anon, authenticated
  using (is_published = true and is_active = true);

create policy "public_read_published_categories"
  on public.categories for select
  to anon, authenticated
  using (is_published = true and is_active = true);

create policy "public_read_published_products"
  on public.products for select
  to anon, authenticated
  using (
    is_published = true
    and is_active = true
    and status not in ('deprecated', 'discontinued')
  );

create policy "public_read_published_features"
  on public.features for select
  to anon, authenticated
  using (is_published = true);

create policy "public_read_product_features"
  on public.product_features for select
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
      from public.features f
      where f.id = feature_id
        and f.is_published = true
    )
  );

create policy "public_read_published_integrations"
  on public.integrations for select
  to anon, authenticated
  using (is_published = true and is_active = true);

create policy "public_read_published_models"
  on public.models for select
  to anon, authenticated
  using (is_published = true and is_active = true);

create policy "public_read_published_pricing_plans"
  on public.pricing_plans for select
  to anon, authenticated
  using (is_published = true and is_active = true);

create policy "public_read_hardware_requirements"
  on public.hardware_requirements for select
  to anon, authenticated
  using (
    is_published = true
    and (
      exists (
        select 1
        from public.products p
        where p.id = product_id
          and p.is_published = true
          and p.is_active = true
          and p.status not in ('deprecated', 'discontinued')
      )
      or exists (
        select 1
        from public.models m
        where m.id = model_id
          and m.is_published = true
          and m.is_active = true
      )
    )
  );

create policy "public_read_published_benchmarks"
  on public.benchmarks for select
  to anon, authenticated
  using (
    is_published = true
    and is_active = true
    and (
      product_id is null
      or exists (
        select 1
        from public.products p
        where p.id = product_id
          and p.is_published = true
          and p.is_active = true
          and p.status not in ('deprecated', 'discontinued')
      )
    )
    and (
      model_id is null
      or exists (
        select 1
        from public.models m
        where m.id = model_id
          and m.is_published = true
          and m.is_active = true
      )
    )
  );

create policy "public_read_published_scores"
  on public.technaam_scores for select
  to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.is_published = true
        and p.is_active = true
    )
  );

-- pricing_history and change_log intentionally have no anon/authenticated
-- policies; administrative reads and writes remain server-only.
