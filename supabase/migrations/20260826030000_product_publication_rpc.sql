create or replace function public.technaam_publish_product(payload jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_vendor public.vendors%rowtype;
  v_category public.categories%rowtype;
  v_feature_count int := 0;
  v_product_feature_count int := 0;
  v_pricing_count int := 0;
  v_model_count int := 0;
  v_hardware_count int := 0;
  v_score_count int := 0;
begin
  if payload is null then
    raise exception 'publication payload is required';
  end if;

  if payload->>'product_id' is not null then
    select *
    into v_product
    from public.products
    where id = (payload->>'product_id')::uuid
    for update;
  elsif payload->>'slug' is not null then
    select *
    into v_product
    from public.products
    where slug = payload->>'slug'
    for update;
  else
    raise exception 'product_id or slug is required';
  end if;

  if not found then
    raise exception 'product not found';
  end if;

  if v_product.is_published then
    return jsonb_build_object(
      'result', 'already_published',
      'product_id', v_product.id,
      'product_name', v_product.name,
      'dependencies_published', '{}'::jsonb,
      'timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
  end if;

  if not v_product.is_active then
    raise exception 'product is inactive';
  end if;

  if v_product.status in ('deprecated', 'discontinued') then
    raise exception 'product status is not publishable';
  end if;

  select *
  into v_vendor
  from public.vendors
  where id = v_product.vendor_id;

  if not found then
    raise exception 'vendor not found';
  end if;

  if not v_vendor.is_active then
    raise exception 'vendor is inactive';
  end if;

  select *
  into v_category
  from public.categories
  where id = v_product.category_id;

  if not found then
    raise exception 'category not found';
  end if;

  if not v_category.is_active then
    raise exception 'category is inactive';
  end if;

  update public.vendors
  set is_published = true, updated_at = now()
  where id = v_vendor.id;

  update public.categories
  set is_published = true, updated_at = now()
  where id = v_category.id;

  update public.features
  set is_published = true, updated_at = now()
  where id in (
    select pf.feature_id
    from public.product_features pf
    where pf.product_id = v_product.id
  );

  if exists (
    select 1
    from public.product_models pm
    left join public.models m on m.id = pm.model_id
    where pm.product_id = v_product.id
      and (m.id is null or m.is_active = false)
  ) then
    raise exception 'a required model relationship is missing or inactive';
  end if;

  update public.pricing_plans
  set is_published = true, updated_at = now()
  where product_id = v_product.id
    and is_active = true
    and source_url is not null;

  update public.models
  set is_published = true, updated_at = now()
  where id in (
    select pm.model_id
    from public.product_models pm
    where pm.product_id = v_product.id
  )
  and is_active = true;

  update public.hardware_requirements
  set is_published = true, updated_at = now()
  where product_id = v_product.id;

  update public.technaam_scores
  set is_published = true, updated_at = now()
  where product_id = v_product.id
    and review_status = 'approved';

  update public.products
  set is_published = true, updated_at = now()
  where id = v_product.id;

  select count(*)
  into v_feature_count
  from public.features f
  where f.id in (
    select pf.feature_id
    from public.product_features pf
    where pf.product_id = v_product.id
  )
  and f.is_published = true;

  select count(*)
  into v_product_feature_count
  from public.product_features
  where product_id = v_product.id;

  select count(*)
  into v_pricing_count
  from public.pricing_plans
  where product_id = v_product.id
    and is_published = true;

  select count(*)
  into v_model_count
  from public.models m
  where m.id in (
    select pm.model_id
    from public.product_models pm
    where pm.product_id = v_product.id
  )
  and m.is_published = true;

  select count(*)
  into v_hardware_count
  from public.hardware_requirements
  where product_id = v_product.id
    and is_published = true;

  select count(*)
  into v_score_count
  from public.technaam_scores
  where product_id = v_product.id
    and is_published = true;

  return jsonb_build_object(
    'result', 'published',
    'product_id', v_product.id,
    'product_name', v_product.name,
    'dependencies_published', jsonb_build_object(
      'vendor', 1,
      'category', 1,
      'features', v_feature_count,
      'product_features', v_product_feature_count,
      'pricing_plans', v_pricing_count,
      'models', v_model_count,
      'hardware_requirements', v_hardware_count,
      'technaam_scores', v_score_count
    ),
    'timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.technaam_publish_product(jsonb) from public;
revoke all on function public.technaam_publish_product(jsonb) from anon;
revoke all on function public.technaam_publish_product(jsonb) from authenticated;
grant execute on function public.technaam_publish_product(jsonb) to service_role;
