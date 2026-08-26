import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, "..", "src", "data", "technaam-seed");

const errors = [];
const counts = {};

function loadJSON(filename) {
  const filePath = path.join(seedDir, filename);
  const raw = readFileSync(filePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`${filename} must contain a top-level JSON array.`);
    }
    counts[filename] = parsed.length;
    return parsed;
  } catch (error) {
    errors.push(`${filename}: invalid JSON: ${error.message}`);
    return [];
  }
}

function assertFields(record, fields, context) {
  for (const field of fields) {
    if (record[field] === undefined) {
      errors.push(`${context}: missing required field "${field}".`);
    }
  }
}

function isValidUrl(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function assertUnique(values, label, context) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${context}: duplicate ${label} "${value}".`);
    }
    seen.add(value);
  }
}

const sources = loadJSON("sources.json");
const vendors = loadJSON("vendors.json");
const categories = loadJSON("categories.json");
const features = loadJSON("features.json");
const products = loadJSON("products.json");
const pricingPlans = loadJSON("pricing-plans.json");
const productFeatures = loadJSON("product-features.json");
const models = loadJSON("models.json");
const hardwareRequirements = loadJSON("hardware-requirements.json");

const sourceIds = new Set(sources.map((source) => source.id));
const vendorIds = new Set(vendors.map((vendor) => vendor.id));
const categoryIds = new Set(categories.map((category) => category.id));
const featureIds = new Set(features.map((feature) => feature.id));
const productIds = new Set(products.map((product) => product.id));

for (const [index, source] of sources.entries()) {
  const context = `sources[${index}] (${source.id ?? "missing id"})`;
  assertFields(source, ["id", "url", "source_type", "publisher", "accessed_at"], context);
  if (!isValidUrl(source.url)) {
    errors.push(`${context}: invalid URL "${source.url}".`);
  }
}
assertUnique(sources.map((source) => source.id), "source id", "sources");

for (const [index, vendor] of vendors.entries()) {
  const context = `vendors[${index}] (${vendor.id ?? "missing id"})`;
  assertFields(vendor, ["id", "name", "slug", "official_url", "source_id"], context);
  if (!sourceIds.has(vendor.source_id)) {
    errors.push(`${context}: source_id "${vendor.source_id}" does not resolve.`);
  }
  if (!isValidUrl(vendor.official_url)) {
    errors.push(`${context}: invalid official_url "${vendor.official_url}".`);
  }
}
assertUnique(vendors.map((vendor) => vendor.id), "vendor id", "vendors");
assertUnique(vendors.map((vendor) => vendor.slug), "vendor slug", "vendors");

for (const [index, category] of categories.entries()) {
  const context = `categories[${index}] (${category.id ?? "missing id"})`;
  assertFields(category, ["id", "name", "slug"], context);
}
assertUnique(categories.map((category) => category.id), "category id", "categories");
assertUnique(categories.map((category) => category.slug), "category slug", "categories");

for (const [index, feature] of features.entries()) {
  const context = `features[${index}] (${feature.id ?? "missing id"})`;
  assertFields(feature, ["id", "name", "slug"], context);
}
assertUnique(features.map((feature) => feature.id), "feature id", "features");
assertUnique(features.map((feature) => feature.slug), "feature slug", "features");

for (const [index, product] of products.entries()) {
  const context = `products[${index}] (${product.id ?? "missing id"})`;
  assertFields(
    product,
    ["id", "name", "slug", "vendor_id", "category_id", "official_url", "product_type", "status", "is_active", "is_published", "source_id", "last_verified_at"],
    context
  );
  if (!vendorIds.has(product.vendor_id)) {
    errors.push(`${context}: vendor_id "${product.vendor_id}" does not resolve.`);
  }
  if (!categoryIds.has(product.category_id)) {
    errors.push(`${context}: category_id "${product.category_id}" does not resolve.`);
  }
  if (!sourceIds.has(product.source_id)) {
    errors.push(`${context}: source_id "${product.source_id}" does not resolve.`);
  }
  if (!isValidUrl(product.official_url)) {
    errors.push(`${context}: invalid official_url "${product.official_url}".`);
  }
}
assertUnique(products.map((product) => product.id), "product id", "products");
assertUnique(products.map((product) => product.slug), "product slug", "products");

for (const [index, plan] of pricingPlans.entries()) {
  const context = `pricing-plans[${index}] (${plan.id ?? "missing id"})`;
  assertFields(
    plan,
    ["id", "product_id", "name", "currency", "price_model", "per_user", "free_plan", "source_id", "verified_at"],
    context
  );
  if (!productIds.has(plan.product_id)) {
    errors.push(`${context}: product_id "${plan.product_id}" does not resolve.`);
  }
  if (!sourceIds.has(plan.source_id)) {
    errors.push(`${context}: source_id "${plan.source_id}" does not resolve.`);
  }
  if (!isValidUrl(plan.official_pricing_url)) {
    errors.push(`${context}: invalid official_pricing_url "${plan.official_pricing_url}".`);
  }
}
assertUnique(pricingPlans.map((plan) => plan.id), "pricing plan id", "pricing-plans");

const productFeatureKeys = new Set();
for (const [index, relation] of productFeatures.entries()) {
  const context = `product-features[${index}]`;
  assertFields(relation, ["product_id", "feature_id", "supported", "source_id", "verification_date"], context);
  if (!productIds.has(relation.product_id)) {
    errors.push(`${context}: product_id "${relation.product_id}" does not resolve.`);
  }
  if (!featureIds.has(relation.feature_id)) {
    errors.push(`${context}: feature_id "${relation.feature_id}" does not resolve.`);
  }
  if (!sourceIds.has(relation.source_id)) {
    errors.push(`${context}: source_id "${relation.source_id}" does not resolve.`);
  }
  const key = `${relation.product_id}::${relation.feature_id}`;
  if (productFeatureKeys.has(key)) {
    errors.push(`${context}: duplicate product-feature relationship "${key}".`);
  }
  productFeatureKeys.add(key);
}

for (const [index, model] of models.entries()) {
  const context = `models[${index}] (${model.id ?? "missing id"})`;
  assertFields(model, ["id", "product_id", "name", "provider", "model_type", "source_id", "verification_date"], context);
  if (!productIds.has(model.product_id)) {
    errors.push(`${context}: product_id "${model.product_id}" does not resolve.`);
  }
  if (!sourceIds.has(model.source_id)) {
    errors.push(`${context}: source_id "${model.source_id}" does not resolve.`);
  }
}
assertUnique(models.map((model) => model.id), "model id", "models");

for (const [index, requirement] of hardwareRequirements.entries()) {
  const context = `hardware-requirements[${index}] (${requirement.id ?? "missing id"})`;
  assertFields(requirement, ["id", "product_id", "source_id", "verification_date"], context);
  if (!productIds.has(requirement.product_id)) {
    errors.push(`${context}: product_id "${requirement.product_id}" does not resolve.`);
  }
  if (!sourceIds.has(requirement.source_id)) {
    errors.push(`${context}: source_id "${requirement.source_id}" does not resolve.`);
  }
}
assertUnique(hardwareRequirements.map((requirement) => requirement.id), "hardware requirement id", "hardware-requirements");

if (errors.length > 0) {
  console.error("Seed validation FAILED.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Seed validation PASSED.");
console.log(JSON.stringify(counts, null, 2));
