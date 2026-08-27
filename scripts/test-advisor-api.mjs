import assert from "node:assert/strict";
import { parseAdvisorInput } from "../src/lib/advisor/request.ts";
import {
  budgetFitScore,
  normalizeMonthlyCost,
  scoreProduct,
} from "../src/lib/advisor/scoring.ts";

const validBody = {
  industry: "healthcare",
  project_type: "saas",
  team_size: 5,
  budget_monthly: 300,
  experience_level: "intermediate",
  primary_languages: ["TypeScript", "Python"],
  frameworks: ["React"],
  operating_systems: ["Linux"],
  deployment_preference: "cloud",
  ai_preference: "assistant",
  agent_required: true,
  local_ai_required: false,
  privacy_requirement: "standard",
  collaboration_required: true,
  codebase_size: "medium",
  additional_requirements: "HIPAA-compliant hosting",
};

const valid = parseAdvisorInput(validBody);
assert.equal(valid.ok, true);

assert.equal(parseAdvisorInput(null).ok, false);

const invalidEnum = parseAdvisorInput({
  ...validBody,
  privacy_requirement: "classified",
});
assert.equal(invalidEnum.ok, false);

const missingField = parseAdvisorInput({
  ...validBody,
  industry: undefined,
});
assert.equal(missingField.ok, false);

assert.equal(parseAdvisorInput({ ...validBody, team_size: 0 }).ok, false);
assert.equal(parseAdvisorInput({ ...validBody, team_size: -2 }).ok, false);
assert.equal(parseAdvisorInput({ ...validBody, budget_monthly: -5 }).ok, false);

const product = {
  id: "p1",
  name: "Tool",
  slug: "tool",
  category: "Coding Agent",
  product_type: "coding_agent",
  description: null,
  pricing: [],
  features: [],
  models: [],
  operating_systems: null,
  score: null,
};

if (valid.ok) {
  const first = scoreProduct(valid.value, product);
  const second = scoreProduct(valid.value, product);
  assert.deepEqual(first, second);

  const affiliateProduct = {
    ...product,
    affiliateCommission: 0.8,
    affiliatePayout: 999,
  };
  assert.deepEqual(
    scoreProduct(valid.value, product),
    scoreProduct(valid.value, affiliateProduct)
  );

  assert.equal(normalizeMonthlyCost([], 1), null);
  assert.equal(budgetFitScore(valid.value, product).missing.includes("pricing:unknown"), true);

  const allowedKeys = new Set(["score", "confidence", "dimensions", "missing_information"]);
  for (const key of Object.keys(first)) {
    assert.equal(allowedKeys.has(key), true, `unexpected private key: ${key}`);
  }
}

const noDataProduct = {
  ...product,
  pricing: [],
  features: [],
};
if (valid.ok) {
  const noData = scoreProduct(valid.value, noDataProduct);
  assert.equal(noData.confidence < 1, true);
  assert.equal(noData.missing_information.length > 0, true);
}

console.log("Advisor API tests PASSED.");
