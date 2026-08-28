import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ToolPricing = {
  name: string | null;
  price: number | null;
  currency: string;
  billing_period: string | null;
  is_per_user: boolean;
  is_free: boolean;
};

export type ToolProduct = {
  id: string;
  slug: string;
  name: string;
  product_type: string | null;
  description: string | null;
  website_url: string | null;
  vendor: { name: string | null; slug: string | null } | null;
  category: { name: string | null; slug: string | null } | null;
  pricing: ToolPricing[];
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  product_type: string | null;
  description: string | null;
  website_url: string | null;
  vendor: { name: string | null; slug: string | null } | null;
  category: { name: string | null; slug: string | null } | null;
};

type PricingRow = {
  product_id: string;
  name: string | null;
  price: number | null;
  currency: string;
  billing_period: string | null;
  is_per_user: boolean;
  is_free: boolean;
};

export async function getPublishedTools(): Promise<ToolProduct[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, product_type, description, website_url, vendor:vendors(name, slug), category:categories(name, slug)"
    )
    .eq("is_published", true)
    .eq("is_active", true)
    .not("status", "in", '("deprecated","discontinued")')
    .order("name");

  if (error || !data) {
    return [];
  }

  const rawProducts = data as unknown as Array<{
    id: string;
    slug: string;
    name: string;
    product_type: string | null;
    description: string | null;
    website_url: string | null;
    vendor: unknown;
    category: unknown;
  }>;

  const products: ProductRow[] = rawProducts.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    product_type: product.product_type,
    description: product.description,
    website_url: product.website_url,
    vendor: Array.isArray(product.vendor) ? (product.vendor[0] ?? null) : (product.vendor ?? null),
    category: Array.isArray(product.category) ? (product.category[0] ?? null) : (product.category ?? null),
  }));

  if (products.length === 0) {
    return [];
  }

  const productIds = products.map((product) => product.id);
  const { data: pricingData } = await supabase
    .from("pricing_plans")
    .select("product_id, name, price, currency, billing_period, is_per_user, is_free")
    .eq("is_published", true)
    .eq("is_active", true)
    .in("product_id", productIds)
    .order("price", { ascending: true });

  const pricingRows = (pricingData ?? []) as PricingRow[];
  const pricingByProduct = new Map<string, ToolPricing[]>();

  for (const plan of pricingRows) {
    const existing = pricingByProduct.get(plan.product_id) ?? [];
    existing.push({
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billing_period: plan.billing_period,
      is_per_user: plan.is_per_user,
      is_free: plan.is_free,
    });
    pricingByProduct.set(plan.product_id, existing);
  }

  return products.map((product) => ({
    ...product,
    pricing: pricingByProduct.get(product.id) ?? [],
  }));
}
