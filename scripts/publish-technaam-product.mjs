import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envFile = path.join(projectRoot, ".env.local");

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const args = process.argv.slice(2);
const slugArgIndex = args.indexOf("--slug");
const slug = slugArgIndex >= 0 ? args[slugArgIndex + 1] : undefined;
const isDryRun = args.includes("--dry-run");
const publishConfirmed = process.env.TECHNAAM_PUBLISH_CONFIRM === "YES";

if (!slug) {
  console.error("Usage: node scripts/publish-technaam-product.mjs --slug <product-slug> [--dry-run]");
  process.exit(1);
}

if (!isDryRun && !publishConfirmed) {
  console.log("Publication blocked. Set TECHNAAM_PUBLISH_CONFIRM=YES to proceed.");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

const { data: product, error: productError } = await supabase
  .from("products")
  .select("*")
  .eq("slug", slug)
  .maybeSingle();

if (productError || !product) {
  console.error(`Product "${slug}" was not found.`);
  process.exit(1);
}

if (product.is_published) {
  console.log("Already published");
  process.exit(0);
}

const [vendorResult, categoryResult, pricingResult, featureResult, modelResult, hardwareResult] =
  await Promise.all([
    supabase.from("vendors").select("*").eq("id", product.vendor_id).maybeSingle(),
    supabase.from("categories").select("*").eq("id", product.category_id).maybeSingle(),
    supabase.from("pricing_plans").select("*").eq("product_id", product.id).order("price", { ascending: true }),
    supabase
      .from("product_features")
      .select("feature_id, support_level, notes, feature:features(id, slug, name, is_published)")
      .eq("product_id", product.id),
    supabase
      .from("product_models")
      .select("model_id, model:models(id, slug, name, is_published)")
      .eq("product_id", product.id),
    supabase.from("hardware_requirements").select("*").eq("product_id", product.id),
  ]);

const vendor = vendorResult.data ?? null;
const category = categoryResult.data ?? null;
const pricingPlans = (pricingResult.data ?? []).map((plan) => plan);
const featureRows = (featureResult.data ?? []).map((row) => {
  const feature = normalizeRelation(row.feature);
  return { ...row, feature };
});
const modelRows = (modelResult.data ?? []).map((row) => {
  const model = normalizeRelation(row.model);
  return { ...row, model };
});
const hardwareRows = hardwareResult.data ?? [];

const blockers = [];

if (!product.is_active) {
  blockers.push("Product is inactive.");
}
if (["deprecated", "discontinued"].includes(product.status)) {
  blockers.push(`Product status "${product.status}" is not publishable.`);
}
if (!product.name || !product.slug) {
  blockers.push("Product is missing required name or slug.");
}
if (!vendor) {
  blockers.push("Vendor relationship is missing.");
} else if (!vendor.name) {
  blockers.push("Vendor is missing a name.");
}
if (!category) {
  blockers.push("Category relationship is missing.");
} else if (!category.name) {
  blockers.push("Category is missing a name.");
}

const publicAttribution = {
  product_website: product.website_url ?? null,
  vendor_website: vendor?.website_url ?? null,
  pricing_sources: pricingPlans
    .map((plan) => plan.source_url)
    .filter(Boolean),
};

const dependencies = {
  vendor: {
    id: vendor?.id ?? null,
    published: vendor?.is_published ?? false,
    needsPublish: Boolean(vendor && !vendor.is_published),
  },
  category: {
    id: category?.id ?? null,
    published: category?.is_published ?? false,
    needsPublish: Boolean(category && !category.is_published),
  },
  features: featureRows.map((row) => ({
    id: row.feature?.id ?? null,
    name: row.feature?.name ?? null,
    published: row.feature?.is_published ?? false,
    needsPublish: Boolean(row.feature && !row.feature.is_published),
  })),
  pricing_plans: pricingPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    published: plan.is_published,
    needsPublish: !plan.is_published,
  })),
  models: modelRows.map((row) => ({
    id: row.model?.id ?? null,
    name: row.model?.name ?? null,
    published: row.model?.is_published ?? false,
    needsPublish: Boolean(row.model && !row.model.is_published),
  })),
  hardware_requirements: hardwareRows.map((row) => ({
    id: row.id,
    published: row.is_published,
    needsPublish: !row.is_published,
  })),
};

const report = {
  timestamp: new Date().toISOString(),
  product: {
    id: product.id,
    slug: product.slug,
    name: product.name,
    status: product.status,
    is_active: product.is_active,
    previous_state: product.is_published ? "published" : "unpublished",
    new_state: "published",
  },
  dependencies,
  public_attribution: publicAttribution,
  blockers,
};

if (isDryRun) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(blockers.length > 0 ? 1 : 0);
}

const payload = {
  product_id: product.id,
  vendor_id: vendor?.id ?? null,
  category_id: category?.id ?? null,
  feature_ids: dependencies.features.filter((item) => item.needsPublish).map((item) => item.id),
  pricing_plan_ids: dependencies.pricing_plans.filter((item) => item.needsPublish).map((item) => item.id),
  model_ids: dependencies.models.filter((item) => item.needsPublish).map((item) => item.id),
  hardware_requirement_ids: dependencies.hardware_requirements
    .filter((item) => item.needsPublish)
    .map((item) => item.id),
};

const { error: publishError } = await supabase.rpc("technaam_publish_product", { payload });

if (publishError) {
  console.error(`Publication failed: ${publishError.message}`);
  process.exit(1);
}

console.log("Product published successfully.");
