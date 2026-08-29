-- =================================================================================
-- PHASE 6C.1 — TECHNOLOGY FOUNDATION
-- Additive Anchor Architecture
-- =================================================================================

-- 1. Taxonomy Foundation (Categories)
create table public.tech_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.tech_categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tech_categories_parent_idx on public.tech_categories(parent_id);

-- Trigger for tech_categories
create trigger set_tech_categories_updated_at
  before update on public.tech_categories
  for each row execute function set_updated_at();

-- 2. Technology Entities Anchor
create table public.technology_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('product', 'hardware', 'os', 'mobile', 'other')),
  vendor_id uuid references public.vendors(id) on delete set null,
  tech_category_id uuid references public.tech_categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tech_entities_type_idx on public.technology_entities(entity_type);
create index tech_entities_slug_idx on public.technology_entities(slug);
create index tech_entities_vendor_idx on public.technology_entities(vendor_id);

create trigger set_technology_entities_updated_at
  before update on public.technology_entities
  for each row execute function set_updated_at();

-- Enable RLS
alter table public.technology_entities enable row level security;
create policy "Published technology entities are public" on public.technology_entities
  for select using (is_published = true);
create policy "Service role can do all to technology entities" on public.technology_entities
  for all to service_role using (true) with check (true);


-- 3. Hardware Entities
create table public.hardware_entities (
  id uuid primary key default gen_random_uuid(),
  tech_entity_id uuid not null references public.technology_entities(id) on delete cascade unique,
  hardware_type text not null check (hardware_type in ('cpu', 'gpu', 'ram', 'storage', 'laptop', 'desktop', 'workstation', 'smartphone', 'tablet', 'peripheral', 'other')),
  architecture text,
  memory_gb numeric(10, 2),
  vram_gb numeric(10, 2),
  base_clock_mhz numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_hardware_entities_updated_at
  before update on public.hardware_entities
  for each row execute function set_updated_at();

alter table public.hardware_entities enable row level security;
create policy "Hardware entities are readable if anchor is published" on public.hardware_entities
  for select using (
    exists (select 1 from public.technology_entities t where t.id = tech_entity_id and t.is_published = true)
  );
create policy "Service role can do all to hardware entities" on public.hardware_entities
  for all to service_role using (true) with check (true);


-- 4. OS Entities
create table public.os_entities (
  id uuid primary key default gen_random_uuid(),
  tech_entity_id uuid not null references public.technology_entities(id) on delete cascade unique,
  os_family text not null check (os_family in ('Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Other')),
  version text,
  edition text,
  support_status text check (support_status in ('active', 'end_of_life', 'unknown')),
  eol_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_os_entities_updated_at
  before update on public.os_entities
  for each row execute function set_updated_at();

alter table public.os_entities enable row level security;
create policy "OS entities are readable if anchor is published" on public.os_entities
  for select using (
    exists (select 1 from public.technology_entities t where t.id = tech_entity_id and t.is_published = true)
  );
create policy "Service role can do all to OS entities" on public.os_entities
  for all to service_role using (true) with check (true);


-- 5. Link existing Products
alter table public.products add column tech_entity_id uuid references public.technology_entities(id) on delete restrict unique;

-- Backfill Products (creates a technology_entities row for each product)
do $$
declare
  prod record;
  new_tech_id uuid;
begin
  for prod in select * from public.products where tech_entity_id is null loop
    insert into public.technology_entities (entity_type, vendor_id, slug, name, is_published, created_at, updated_at)
    values ('product', prod.vendor_id, prod.slug, prod.name, prod.is_published, prod.created_at, prod.updated_at)
    returning id into new_tech_id;

    update public.products set tech_entity_id = new_tech_id where id = prod.id;
  end loop;
end;
$$;


-- 6. Link existing Evidence / Change Log non-destructively
alter table public.evidence add column tech_entity_id uuid references public.technology_entities(id) on delete restrict;
create index evidence_tech_entity_idx on public.evidence(tech_entity_id);

-- Backfill Evidence (mapping polymorphic entity_id when it equals product.id)
update public.evidence e
set tech_entity_id = p.tech_entity_id
from public.products p
where e.entity_type = 'product' and e.entity_id = p.id;

alter table public.change_log add column tech_entity_id uuid references public.technology_entities(id) on delete restrict;
create index change_log_tech_entity_idx on public.change_log(tech_entity_id);

-- Backfill Change Log
update public.change_log c
set tech_entity_id = p.tech_entity_id
from public.products p
where c.entity_type = 'product' and c.entity_id = p.id;


-- 7. Technology Graph (Relationships)
create table public.tech_relationships (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.technology_entities(id) on delete cascade,
  target_entity_id uuid not null references public.technology_entities(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('runs_on', 'requires', 'compatible_with', 'incompatible_with', 'depends_on', 'integrates_with', 'alternative_to', 'replaces', 'uses_model', 'requires_hardware', 'powered_by', 'contains')),
  is_symmetric boolean not null default false,
  version_constraint text,
  confidence numeric(4,3) check (confidence >= 0 and confidence <= 1),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'conflicted')),
  effective_date date,
  expiry_date date,
  evidence_id uuid references public.evidence(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Integrity constraints
  constraint tech_relationships_no_self_ref check (source_entity_id != target_entity_id),
  constraint tech_relationships_unique unique (source_entity_id, target_entity_id, relationship_type)
);

create index tech_relationships_source_idx on public.tech_relationships(source_entity_id, relationship_type);
create index tech_relationships_target_idx on public.tech_relationships(target_entity_id, relationship_type);

create trigger set_tech_relationships_updated_at
  before update on public.tech_relationships
  for each row execute function set_updated_at();

alter table public.tech_relationships enable row level security;
-- Relationships are public if both sides are published and the relationship itself is approved
create policy "Approved relationships between published entities are public" on public.tech_relationships
  for select using (
    status = 'approved' and
    exists (select 1 from public.technology_entities s where s.id = source_entity_id and s.is_published = true) and
    exists (select 1 from public.technology_entities t where t.id = target_entity_id and t.is_published = true)
  );
create policy "Service role can do all to relationships" on public.tech_relationships
  for all to service_role using (true) with check (true);
