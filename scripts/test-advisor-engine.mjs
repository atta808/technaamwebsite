import assert from "node:assert/strict";
import {
  featureMatchScore,
  localAiFitScore,
  normalizeMonthlyCost,
  requirementMatchScore,
  scoreProduct,
  teamFitScore,
  SCORING_VERSION,
} from "../src/lib/advisor/scoring.ts";

const baseInput = {
  industry: "software",
  team_size: 4,
  budget_monthly: 100,
  project_type: "saas",
  primary_languages: ["typescript"],
  frameworks: ["react"],
  operating_systems: ["linux"],
  deployment_preference: "cloud",
  ai_preference: "assistant",
  privacy_requirement: "standard",
  local_ai_required: false,
  collaboration_required: false,
  agent_required: false,
  codebase_size: "medium",
  experience_level: "intermediate",
};

function product(overrides = {}) {
  return {
    id: "p1",
    name: "Product One",
    slug: "product-one",
    category: "Coding Agent",
    product_type: "coding_agent",
    description: null,
    pricing: [],
    features: [],
    models: [],
    operating_systems: null,
    score: null,
    ...overrides,
  };
}

const supportedProduct = product({
  pricing: [
    {
      name: "Pro",
      price: 20,
      currency: "USD",
      billing_period: "monthly",
      is_per_user: false,
      is_free: false,
      price_model: "flat",
    },
    {
      name: "Free",
      price: 0,
      currency: "USD",
      billing_period: null,
      is_per_user: false,
      is_free: true,
      price_model: "free",
    },
  ],
  features: [
    { slug: "agent-mode", name: "Agent Mode", support_level: "supported" },
    { slug: "local-model-support", name: "Local Model Support", support_level: "supported" },
    { slug: "collaboration", name: "Collaboration", support_level: "supported" },
    { slug: "code-completion", name: "Code Completion", support_level: "supported" },
  ],
});

assert.equal(SCORING_VERSION, "v1");

assert.equal(
  normalizeMonthlyCost(supportedProduct.pricing, 4),
  0,
  "free plan should produce zero cost"
);

const perUserProduct = product({
  pricing: [
    {
      name: "Teams",
      price: 40,
      currency: "USD",
      billing_period: "monthly",
      is_per_user: true,
      is_free: false,
      price_model: "per_user",
    },
  ],
});

assert.equal(normalizeMonthlyCost(perUserProduct.pricing, 3), 120);

const requiredInput = {
  ...baseInput,
  local_ai_required: true,
  collaboration_required: true,
  agent_required: true,
  privacy_requirement: "offline",
};

assert.equal(requirementMatchScore(requiredInput, supportedProduct).score, 100);
assert.equal(localAiFitScore(requiredInput, supportedProduct).score, 100);
assert.equal(teamFitScore(requiredInput, supportedProduct).score, 100);
assert.equal(featureMatchScore(requiredInput, supportedProduct).score >= 50, true);

assert.equal(
  localAiFitScore(
    { ...requiredInput, local_ai_required: true, privacy_requirement: "standard" },
    product()
  ).score,
  70
);

assert.equal(
  teamFitScore({ ...requiredInput, collaboration_required: true }, product()).score,
  70
);

const budgetless = {
  ...requiredInput,
  budget_monthly: null,
};
const scored = scoreProduct(budgetless, product());
assert.equal(scored.missing_information.includes("budget_monthly"), true);
assert.equal(scored.confidence < 1, true);

const first = scoreProduct(requiredInput, supportedProduct);
const second = scoreProduct(requiredInput, supportedProduct);
assert.deepEqual(first, second);

const affiliateProduct = {
  ...supportedProduct,
  affiliateCommission: 0.9,
  affiliatePayout: 10000,
};
const withoutAffiliate = scoreProduct(requiredInput, supportedProduct);
const withAffiliate = scoreProduct(requiredInput, affiliateProduct);
assert.deepEqual(withAffiliate, withoutAffiliate);

console.log("Advisor engine tests PASSED.");
