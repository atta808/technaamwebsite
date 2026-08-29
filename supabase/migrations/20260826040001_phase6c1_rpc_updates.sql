-- =================================================================================
-- PHASE 6C.1 — RPC UPDATES
-- Updates technaam_seed_import to handle technology_entities transparently.
-- =================================================================================

create or replace function public.technaam_seed_import(payload jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  prod record;
  new_tech_id uuid;
begin
  if payload is null then
    raise exception 'seed import payload is required';
  end if;

  insert into public.sources
  select * from jsonb_populate_recordset(null::public.sources, payload->'sources')
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    url = excluded.url,
    source_type = excluded.source_type,
    is_published = excluded.is_published,
    is_active = excluded.is_active,
    verified_at = excluded.verified_at,
    last_checked_at = excluded.last_checked_at,
    notes = excluded.notes,
    publisher = excluded.publisher,
    title = excluded.title,
    updated_at = now();

  insert into public.vendors
  select * from jsonb_populate_recordset(null::public.vendors, payload->'vendors')
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    website_url = excluded.website_url,
    logo_url = excluded.logo_url,
    description = excluded.description,
    is_published = excluded.is_published,
    is_active = excluded.is_active,
    updated_at = now();

  insert into public.categories
  select * from jsonb_populate_recordset(null::public.categories, payload->'categories')
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    description = excluded.description,
    parent_id = excluded.parent_id,
    is_published = excluded.is_published,
    is_active = excluded.is_active,
    updated_at = now();

  insert into public.features
  select * from jsonb_populate_recordset(null::public.features, payload->'features')
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    description = excluded.description,
    is_published = excluded.is_published,
    updated_at = now();

  -- Products require technology_entities anchor handling
  for prod in select * from jsonb_populate_recordset(null::public.products, payload->'products') loop

    -- Ensure anchor exists
    select tech_entity_id into new_tech_id from public.products where id = prod.id;

    if new_tech_id is null then
        -- We might be importing a completely new product that doesn't have an anchor yet
        insert into public.technology_entities (entity_type, vendor_id, slug, name, is_published, created_at, updated_at)
        values ('product', prod.vendor_id, prod.slug, prod.name, prod.is_published, coalesce(prod.created_at, now()), coalesce(prod.updated_at, now()))
        returning id into new_tech_id;
    else
        -- Update the anchor if it already exists
        update public.technology_entities set
            vendor_id = prod.vendor_id,
            slug = prod.slug,
            name = prod.name,
            is_published = prod.is_published,
            updated_at = now()
        where id = new_tech_id;
    end if;

    -- Now insert/update the product
    insert into public.products (id, slug, name, vendor_id, category_id, tagline, description, website_url, logo_url, status, is_published, is_active, first_released_on, last_verified_at, product_type, tech_entity_id, created_at, updated_at)
    values (prod.id, prod.slug, prod.name, prod.vendor_id, prod.category_id, prod.tagline, prod.description, prod.website_url, prod.logo_url, coalesce(prod.status, 'active'), prod.is_published, coalesce(prod.is_active, true), prod.first_released_on, prod.last_verified_at, prod.product_type, new_tech_id, coalesce(prod.created_at, now()), coalesce(prod.updated_at, now()))
    on conflict (id) do update set
      slug = excluded.slug,
      name = excluded.name,
      vendor_id = excluded.vendor_id,
      category_id = excluded.category_id,
      tagline = excluded.tagline,
      description = excluded.description,
      website_url = excluded.website_url,
      logo_url = excluded.logo_url,
      status = excluded.status,
      is_published = excluded.is_published,
      is_active = excluded.is_active,
      first_released_on = excluded.first_released_on,
      last_verified_at = excluded.last_verified_at,
      product_type = excluded.product_type,
      tech_entity_id = excluded.tech_entity_id,
      updated_at = now();

  end loop;

  insert into public.product_features
  select * from jsonb_populate_recordset(null::public.product_features, payload->'product_features')
  on conflict (product_id, feature_id) do update set
    support_level = excluded.support_level,
    notes = excluded.notes;

  insert into public.pricing_plans
  select * from jsonb_populate_recordset(null::public.pricing_plans, payload->'pricing_plans')
  on conflict (id) do update set
    slug = excluded.slug,
    product_id = excluded.product_id,
    vendor_id = excluded.vendor_id,
    name = excluded.name,
    description = excluded.description,
    currency = excluded.currency,
    price = excluded.price,
    billing_period = excluded.billing_period,
    is_per_user = excluded.is_per_user,
    per_user_price = excluded.per_user_price,
    trial_days = excluded.trial_days,
    usage_limits = excluded.usage_limits,
    source_url = excluded.source_url,
    verified_at = excluded.verified_at,
    is_published = excluded.is_published,
    is_active = excluded.is_active,
    price_model = excluded.price_model,
    is_free = excluded.is_free,
    updated_at = now();

  insert into public.models
  select * from jsonb_populate_recordset(null::public.models, payload->'models')
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    vendor_id = excluded.vendor_id,
    model_type = excluded.model_type,
    context_window = excluded.context_window,
    is_local = excluded.is_local,
    metadata = excluded.metadata,
    is_published = excluded.is_published,
    is_active = excluded.is_active,
    provider = excluded.provider,
    updated_at = now();

  insert into public.product_models
  select * from jsonb_populate_recordset(null::public.product_models, payload->'product_models')
  on conflict (product_id, model_id) do update set
    id = excluded.id;

  insert into public.hardware_requirements
  select * from jsonb_populate_recordset(null::public.hardware_requirements, payload->'hardware_requirements')
  on conflict (id) do update set
    product_id = excluded.product_id,
    model_id = excluded.model_id,
    os = excluded.os,
    cpu = excluded.cpu,
    memory_gb = excluded.memory_gb,
    storage_gb = excluded.storage_gb,
    gpu = excluded.gpu,
    min_ram_gb = excluded.min_ram_gb,
    recommended_ram_gb = excluded.recommended_ram_gb,
    notes = excluded.notes,
    is_published = excluded.is_published,
    gpu_required = excluded.gpu_required,
    vram_required_gb = excluded.vram_required_gb,
    operating_systems = excluded.operating_systems,
    updated_at = now();

  -- Evidence import also updates tech_entity_id if missing but we can map it via the entity mapping loop below
  insert into public.evidence
  select * from jsonb_populate_recordset(null::public.evidence, payload->'evidence')
  on conflict (id) do update set
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    source_id = excluded.source_id,
    field_name = excluded.field_name,
    observed_value = excluded.observed_value,
    detected_at = excluded.detected_at,
    verified_at = excluded.verified_at,
    confidence = excluded.confidence,
    review_status = excluded.review_status,
    notes = excluded.notes;

  -- Ensure imported evidence has tech_entity_id populated if it corresponds to a product
  update public.evidence e
  set tech_entity_id = p.tech_entity_id
  from public.products p
  where e.entity_type = 'product' and e.entity_id = p.id and e.tech_entity_id is null;

end;
$$;

revoke all on function public.technaam_seed_import(jsonb) from public;
revoke all on function public.technaam_seed_import(jsonb) from anon;
revoke all on function public.technaam_seed_import(jsonb) from authenticated;
grant execute on function public.technaam_seed_import(jsonb) to service_role;
