import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, "..", "src", "data", "technaam-seed");

const isDryRun = process.argv.includes("--dry-run");
const projectRoot = path.resolve(__dirname, "..");
const localEnvFile = path.join(projectRoot, ".env.local");

if (existsSync(localEnvFile)) {
  process.loadEnvFile(localEnvFile);
}

const requiredConfirm = process.env.TECHNAAM_IMPORT_CONFIRM === "YES";
const importTimestamp = new Date().toISOString();

function readSeed(filename) {
  return JSON.parse(readFileSync(path.join(seedDir, filename), "utf8"));
}

function deterministicUuid(key) {
  const hash = createHash("sha256").update(`technaam-seed:${key}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function isValidUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function assertFields(record, fields, context) {
  for (const field of fields) {
    if (record[field] === undefined) {
      throw new Error(`${context}: missing required field "${field}".`);
    }
  }
}

function makeUniqueSlug(desired, used) {
  let slug = desired;
  let counter = 2;
  while (used.has(slug)) {
    slug = `${desired}-${counter}`;
    counter += 1;
  }
  used.add(slug);
  return slug;
}

const sources = readSeed("sources.json");
const vendors = readSeed("vendors.json");
const categories = readSeed("categories.json");
const features = readSeed("features.json");
const products = readSeed("products.json");
const productFeatures = readSeed("product-features.json");
const pricingPlans = readSeed("pricing-plans.json");
const models = readSeed("models.json");
const hardwareRequirements = readSeed("hardware-requirements.json");

const seedSourceIds = new Set(sources.map((source) => source.id));
const seedVendorIds = new Set(vendors.map((vendor) => vendor.id));
const seedCategoryIds = new Set(categories.map((category) => category.id));
const seedFeatureIds = new Set(features.map((feature) => feature.id));
const seedProductIds = new Set(products.map((product) => product.id));

for (const source of sources) {
  assertFields(source, ["id", "url", "source_type", "accessed_at"], `source ${source.id}`);
  if (!isValidUrl(source.url)) throw new Error(`source ${source.id}: invalid url`);
}

for (const vendor of vendors) {
  assertFields(vendor, ["id", "name", "slug", "official_url", "source_id"], `vendor ${vendor.id}`);
  if (!seedSourceIds.has(vendor.source_id)) {
    throw new Error(`vendor ${vendor.id}: unresolved source_id ${vendor.source_id}`);
  }
}

for (const category of categories) {
  assertFields(category, ["id", "name", "slug"], `category ${category.id}`);
}

for (const feature of features) {
  assertFields(feature, ["id", "name", "slug"], `feature ${feature.id}`);
}

for (const product of products) {
  assertFields(
    product,
    ["id", "name", "slug", "vendor_id", "category_id", "official_url", "product_type", "status", "is_active", "is_published", "source_id", "last_verified_at"],
    `product ${product.id}`
  );
  if (!seedVendorIds.has(product.vendor_id)) {
    throw new Error(`product ${product.id}: unresolved vendor_id ${product.vendor_id}`);
  }
  if (!seedCategoryIds.has(product.category_id)) {
    throw new Error(`product ${product.id}: unresolved category_id ${product.category_id}`);
  }
  if (!seedSourceIds.has(product.source_id)) {
    throw new Error(`product ${product.id}: unresolved source_id ${product.source_id}`);
  }
}

for (const relation of productFeatures) {
  assertFields(relation, ["product_id", "feature_id", "supported", "source_id", "verification_date"], "product-feature");
  if (!seedProductIds.has(relation.product_id)) {
    throw new Error(`product-feature: unresolved product_id ${relation.product_id}`);
  }
  if (!seedFeatureIds.has(relation.feature_id)) {
    throw new Error(`product-feature: unresolved feature_id ${relation.feature_id}`);
  }
  if (!seedSourceIds.has(relation.source_id)) {
    throw new Error(`product-feature: unresolved source_id ${relation.source_id}`);
  }
}

for (const plan of pricingPlans) {
  assertFields(
    plan,
    ["id", "product_id", "name", "currency", "price_model", "per_user", "free_plan", "source_id", "verified_at"],
    `pricing plan ${plan.id}`
  );
  if (!seedProductIds.has(plan.product_id)) {
    throw new Error(`pricing plan ${plan.id}: unresolved product_id ${plan.product_id}`);
  }
  if (!seedSourceIds.has(plan.source_id)) {
    throw new Error(`pricing plan ${plan.id}: unresolved source_id ${plan.source_id}`);
  }
}

for (const model of models) {
  assertFields(model, ["id", "product_id", "name", "provider", "model_type", "source_id", "verification_date"], `model ${model.id}`);
  if (!seedProductIds.has(model.product_id)) {
    throw new Error(`model ${model.id}: unresolved product_id ${model.product_id}`);
  }
  if (!seedSourceIds.has(model.source_id)) {
    throw new Error(`model ${model.id}: unresolved source_id ${model.source_id}`);
  }
}

for (const requirement of hardwareRequirements) {
  assertFields(requirement, ["id", "product_id", "source_id", "verification_date"], `hardware ${requirement.id}`);
  if (!seedProductIds.has(requirement.product_id)) {
    throw new Error(`hardware ${requirement.id}: unresolved product_id ${requirement.product_id}`);
  }
  if (!seedSourceIds.has(requirement.source_id)) {
    throw new Error(`hardware ${requirement.id}: unresolved source_id ${requirement.source_id}`);
  }
}

const mappings = {
  source: new Map(),
  vendor: new Map(),
  category: new Map(),
  feature: new Map(),
  product: new Map(),
  model: new Map(),
};

for (const source of sources) {
  mappings.source.set(source.id, deterministicUuid(`source:${source.id}`));
}
for (const vendor of vendors) {
  mappings.vendor.set(vendor.id, deterministicUuid(`vendor:${vendor.id}`));
}
for (const category of categories) {
  mappings.category.set(category.id, deterministicUuid(`category:${category.id}`));
}
for (const feature of features) {
  mappings.feature.set(feature.id, deterministicUuid(`feature:${feature.id}`));
}
for (const product of products) {
  mappings.product.set(product.id, deterministicUuid(`product:${product.id}`));
}
for (const model of models) {
  mappings.model.set(model.id, deterministicUuid(`model:${model.id}`));
}

const usedSlugs = new Set();

const sourceRows = sources.map((source) => {
  const name = source.title || source.publisher || source.id;
  return {
    id: mappings.source.get(source.id),
    slug: makeUniqueSlug(`source-${slugify(source.id)}`, usedSlugs),
    name,
    url: source.url,
    source_type: source.source_type,
    publisher: source.publisher || null,
    title: source.title || null,
    last_checked_at: source.accessed_at,
    notes: source.notes || null,
    is_published: false,
    is_active: true,
    created_at: importTimestamp,
    updated_at: importTimestamp,
  };
});

const vendorRows = vendors.map((vendor) => ({
  id: mappings.vendor.get(vendor.id),
  slug: vendor.slug,
  name: vendor.name,
  website_url: vendor.official_url,
  is_published: false,
  is_active: true,
  created_at: importTimestamp,
  updated_at: importTimestamp,
}));

const categoryRows = categories.map((category) => ({
  id: mappings.category.get(category.id),
  slug: category.slug,
  name: category.name,
  is_published: false,
  is_active: true,
  created_at: importTimestamp,
  updated_at: importTimestamp,
}));

const featureRows = features.map((feature) => ({
  id: mappings.feature.get(feature.id),
  slug: feature.slug,
  name: feature.name,
  is_published: false,
  created_at: importTimestamp,
  updated_at: importTimestamp,
}));

const productRows = products.map((product) => ({
  id: mappings.product.get(product.id),
  slug: product.slug,
  name: product.name,
  vendor_id: mappings.vendor.get(product.vendor_id),
  category_id: mappings.category.get(product.category_id),
  description: product.short_description || null,
  website_url: product.official_url,
  product_type: product.product_type,
  status: product.status,
  is_active: product.is_active,
  is_published: false,
  last_verified_at: product.last_verified_at,
  created_at: importTimestamp,
  updated_at: importTimestamp,
}));

function mapSupportLevel(supported) {
  if (supported === true) return "supported";
  if (supported === false) return "not_supported";
  if (supported === "partial") return "partial";
  return supported;
}

const productFeatureRows = productFeatures.map((relation) => ({
  id: deterministicUuid(`product-feature:${relation.product_id}:${relation.feature_id}`),
  product_id: mappings.product.get(relation.product_id),
  feature_id: mappings.feature.get(relation.feature_id),
  support_level: mapSupportLevel(relation.supported),
  notes: relation.notes || null,
  created_at: importTimestamp,
}));

const productById = new Map(products.map((product) => [product.id, product]));

const pricingRows = pricingPlans.map((plan) => {
  const product = productById.get(plan.product_id);
  const desiredSlug = `plan-${slugify(product.slug)}-${slugify(plan.name)}`;
  const usageLimits = plan.usage_limits
    ? { summary: String(plan.usage_limits) }
    : {};

  return {
    id: deterministicUuid(`pricing-plan:${plan.id}`),
    slug: makeUniqueSlug(desiredSlug, usedSlugs),
    product_id: mappings.product.get(plan.product_id),
    vendor_id: mappings.vendor.get(product.vendor_id),
    name: plan.name,
    currency: plan.currency,
    price: plan.amount === null || plan.amount === undefined ? null : plan.amount,
    billing_period: plan.billing_period || null,
    is_per_user: plan.per_user,
    per_user_price: plan.per_user_price ?? 0,
    is_free: plan.free_plan,
    price_model: plan.price_model,
    trial_days: plan.trial_days ?? 0,
    usage_limits: usageLimits,
    source_url: plan.official_pricing_url || null,
    verified_at: plan.verified_at || null,
    is_published: false,
    is_active: true,
    created_at: importTimestamp,
    updated_at: importTimestamp,
  };
});

const modelRows = models.map((model) => ({
  id: mappings.model.get(model.id),
  slug: makeUniqueSlug(`model-${slugify(model.name)}-${slugify(model.provider)}`, usedSlugs),
  name: model.name,
  provider: model.provider,
  model_type: model.model_type,
  is_local: false,
  metadata: {},
  is_published: false,
  is_active: true,
  created_at: importTimestamp,
  updated_at: importTimestamp,
}));

const productModelRows = models.map((model) => ({
  id: deterministicUuid(`product-model:${model.product_id}:${model.id}`),
  product_id: mappings.product.get(model.product_id),
  model_id: mappings.model.get(model.id),
  created_at: importTimestamp,
}));

const hardwareRows = hardwareRequirements.map((requirement) => ({
  id: deterministicUuid(`hardware:${requirement.id}`),
  product_id: mappings.product.get(requirement.product_id),
  min_ram_gb: requirement.min_ram_gb ?? null,
  recommended_ram_gb: requirement.recommended_ram_gb ?? null,
  gpu_required: requirement.gpu_required ?? null,
  vram_required_gb: requirement.vram_required ?? null,
  cpu: requirement.cpu ?? null,
  operating_systems: requirement.operating_systems ?? null,
  notes: requirement.notes ?? null,
  is_published: false,
  created_at: importTimestamp,
  updated_at: importTimestamp,
}));

const evidenceRows = [];

function addEvidence(entityType, entityId, sourceSeedId, fieldName, observedValue, verifiedAt) {
  const sourceUuid = mappings.source.get(sourceSeedId);
  if (!sourceUuid) return;
  evidenceRows.push({
    id: deterministicUuid(`evidence:${entityType}:${entityId}:${sourceSeedId}:${fieldName}`),
    entity_type: entityType,
    entity_id: entityId,
    source_id: sourceUuid,
    field_name: fieldName,
    observed_value: observedValue,
    detected_at: importTimestamp,
    verified_at: verifiedAt || null,
    confidence: null,
    review_status: "pending",
    notes: null,
  });
}

for (const vendor of vendors) {
  addEvidence("vendor", mappings.vendor.get(vendor.id), vendor.source_id, "official_url", vendor.official_url, null);
}

for (const product of products) {
  addEvidence("product", mappings.product.get(product.id), product.source_id, "official_url", product.official_url, product.last_verified_at);
}

for (const relation of productFeatures) {
  addEvidence(
    "product_feature",
    deterministicUuid(`product-feature:${relation.product_id}:${relation.feature_id}`),
    relation.source_id,
    "support_level",
    mapSupportLevel(relation.supported),
    relation.verification_date
  );
}

for (const plan of pricingPlans) {
  addEvidence(
    "pricing_plan",
    deterministicUuid(`pricing-plan:${plan.id}`),
    plan.source_id,
    "pricing",
    plan.official_pricing_url || null,
    plan.verified_at
  );
}

for (const model of models) {
  addEvidence("model", mappings.model.get(model.id), model.source_id, "model", model.name, model.verification_date);
}

for (const requirement of hardwareRequirements) {
  addEvidence(
    "hardware_requirement",
    deterministicUuid(`hardware:${requirement.id}`),
    requirement.source_id,
    "hardware",
    requirement.notes || null,
    requirement.verification_date
  );
}

const warnings = [];
for (const product of products) {
  const hasPricing = pricingPlans.some((plan) => plan.product_id === product.id);
  if (!hasPricing) {
    warnings.push(`${product.name}: no verified pricing record; remains unpublished.`);
  }
}

const recordCounts = {
  sources: sourceRows.length,
  vendors: vendorRows.length,
  categories: categoryRows.length,
  features: featureRows.length,
  products: productRows.length,
  product_features: productFeatureRows.length,
  pricing_plans: pricingRows.length,
  models: modelRows.length,
  product_models: productModelRows.length,
  hardware_requirements: hardwareRows.length,
  evidence: evidenceRows.length,
};

function printDryRun() {
  console.log("Dry-run complete. Records that would be inserted:");
  console.log(JSON.stringify(recordCounts, null, 2));
  console.log("\nWarnings:");
  if (warnings.length === 0) {
    console.log("None");
  } else {
    for (const warning of warnings) console.log(`- ${warning}`);
  }
  console.log("\nUnresolved references: None");
  console.log("\nSupabase was NOT contacted.");
}

async function runRealImport() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for import.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const payload = {
    sources: sourceRows,
    vendors: vendorRows,
    categories: categoryRows,
    features: featureRows,
    products: productRows,
    product_features: productFeatureRows,
    pricing_plans: pricingRows,
    models: modelRows,
    product_models: productModelRows,
    hardware_requirements: hardwareRows,
    evidence: evidenceRows,
  };

  const { error } = await supabase.rpc("technaam_seed_import", { payload });
  if (error) throw new Error(error.message);
}

if (isDryRun) {
  printDryRun();
} else {
  if (!requiredConfirm) {
    console.log("Import blocked. Set TECHNAAM_IMPORT_CONFIRM=YES to proceed.");
    process.exit(1);
  }

  runRealImport()
    .then(() => {
      console.log("Seed import complete.");
    })
    .catch((error) => {
      console.error(`Seed import failed: ${error.message}`);
      process.exit(1);
    });
}
