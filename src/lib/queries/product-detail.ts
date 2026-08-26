import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductDetailPricing = {
  name: string;
  price: number | null;
  currency: string;
  billing_period: string | null;
  is_per_user: boolean;
  is_free: boolean;
  price_model: string | null;
  source_url: string | null;
  verified_at: string | null;
};

export type ProductDetailFeature = {
  name: string;
  slug: string;
  support_level: string;
  notes: string | null;
};

export type ProductDetailModel = {
  name: string;
  slug: string;
  provider: string | null;
  model_type: string | null;
};

export type ProductDetailHardware = {
  min_ram_gb: number | null;
  recommended_ram_gb: number | null;
  gpu_required: boolean | null;
  vram_required_gb: number | null;
  operating_systems: string[] | null;
  notes: string | null;
};

export type ProductDetailScore = {
  overall: number | null;
  performance: number | null;
  value: number | null;
  ease_of_use: number | null;
  features: number | null;
  reliability: number | null;
  integrations: number | null;
  automation: number | null;
  local_ai: number | null;
  methodology_version: string | null;
};

export type ProductDetailSource = {
  label: string;
  url: string;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  product_type: string | null;
  description: string | null;
  website_url: string | null;
  vendor: { name: string | null; slug: string | null; website_url: string | null } | null;
  category: { name: string | null; slug: string | null } | null;
  pricing: ProductDetailPricing[];
  features: ProductDetailFeature[];
  models: ProductDetailModel[];
  hardware: ProductDetailHardware | null;
  score: ProductDetailScore | null;
  sources: ProductDetailSource[];
};

function normalizeRelation(value: unknown) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export async function getProductDetailBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: productData, error: productError } = await supabase
    .from("products")
    .select(
      "id, slug, name, product_type, description, website_url, vendor:vendors(name, slug, website_url), category:categories(name, slug)"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("is_active", true)
    .not("status", "in", '("deprecated","discontinued")')
    .maybeSingle();

  if (productError || !productData) {
    return null;
  }

  const rawProduct = productData as unknown as {
    id: string;
    slug: string;
    name: string;
    product_type: string | null;
    description: string | null;
    website_url: string | null;
    vendor: unknown;
    category: unknown;
  };

  const vendor = normalizeRelation(rawProduct.vendor) as {
    name: string | null;
    slug: string | null;
    website_url: string | null;
  } | null;

  const category = normalizeRelation(rawProduct.category) as {
    name: string | null;
    slug: string | null;
  } | null;

  const productId = rawProduct.id;

  const [pricingResult, featuresResult, modelsResult, hardwareResult, scoreResult] =
    await Promise.all([
      supabase
        .from("pricing_plans")
        .select(
          "name, price, currency, billing_period, is_per_user, is_free, price_model, source_url, verified_at"
        )
        .eq("product_id", productId)
        .eq("is_published", true)
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("product_features")
        .select("support_level, notes, feature:features(name, slug)")
        .eq("product_id", productId),
      supabase
        .from("product_models")
        .select("model:models(name, slug, provider, model_type)")
        .eq("product_id", productId),
      supabase
        .from("hardware_requirements")
        .select(
          "min_ram_gb, recommended_ram_gb, gpu_required, vram_required_gb, operating_systems, notes"
        )
        .eq("product_id", productId)
        .eq("is_published", true)
        .maybeSingle(),
      supabase
        .from("technaam_scores")
        .select(
          "overall, performance, value, ease_of_use, features, reliability, integrations, automation, local_ai, methodology_version"
        )
        .eq("product_id", productId)
        .eq("is_published", true)
        .maybeSingle(),
    ]);

  const pricingRows = (pricingResult.data ?? []) as unknown as ProductDetailPricing[];

  const featureRows = (featuresResult.data ?? []) as unknown as Array<{
    support_level: string;
    notes: string | null;
    feature: unknown;
  }>;

  const features: ProductDetailFeature[] = featureRows.flatMap((row) => {
    const feature = normalizeRelation(row.feature) as {
      name: string;
      slug: string;
    } | null;
    if (!feature) return [];
    return [
      {
        name: feature.name,
        slug: feature.slug,
        support_level: row.support_level,
        notes: row.notes,
      },
    ];
  });

  const modelRows = (modelsResult.data ?? []) as unknown as Array<{
    model: unknown;
  }>;

  const models: ProductDetailModel[] = modelRows.flatMap((row) => {
    const model = normalizeRelation(row.model) as ProductDetailModel | null;
    if (!model) return [];
    return [model];
  });

  const hardware = (hardwareResult.data ?? null) as unknown as ProductDetailHardware | null;
  const score = (scoreResult.data ?? null) as unknown as ProductDetailScore | null;

  const sources: ProductDetailSource[] = [];
  const sourceUrls = new Set<string>();

  if (rawProduct.website_url) {
    sourceUrls.add(rawProduct.website_url);
    sources.push({ label: "Official website", url: rawProduct.website_url });
  }
  if (vendor?.website_url && !sourceUrls.has(vendor.website_url)) {
    sourceUrls.add(vendor.website_url);
    sources.push({ label: "Vendor website", url: vendor.website_url });
  }
  for (const plan of pricingRows) {
    if (plan.source_url && !sourceUrls.has(plan.source_url)) {
      sourceUrls.add(plan.source_url);
      sources.push({ label: "Pricing source", url: plan.source_url });
    }
  }

  return {
    id: productId,
    slug: rawProduct.slug,
    name: rawProduct.name,
    product_type: rawProduct.product_type,
    description: rawProduct.description,
    website_url: rawProduct.website_url,
    vendor,
    category,
    pricing: pricingRows,
    features,
    models,
    hardware,
    score,
    sources,
  };
}
