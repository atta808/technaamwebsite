import assert from "node:assert/strict";
import {
  buildSanitizedContext,
  sanitizeInput,
  shouldSkipProvider,
} from "../src/lib/advisor/ai/context.ts";
import {
  DeepSeekProvider,
  parseAIExplanation,
} from "../src/lib/advisor/ai/provider.ts";
import { SlidingWindowRateLimiter } from "../src/lib/advisor/ai/rate-limit.ts";
import { parseAdvisorInput } from "../src/lib/advisor/request.ts";
import { scoreProduct } from "../src/lib/advisor/scoring.ts";

const input = {
  industry: "software",
  project_type: "web",
  team_size: 3,
  budget_monthly: 200,
  experience_level: "intermediate",
  primary_languages: ["TypeScript"],
  frameworks: ["React"],
  operating_systems: ["Linux"],
  deployment_preference: "cloud",
  ai_preference: "assistant",
  privacy_requirement: "standard",
  local_ai_required: false,
  collaboration_required: true,
  agent_required: true,
  codebase_size: "medium",
};

const recommendation = {
  product_id: "uuid-1",
  product_slug: "cursor",
  product_name: "Cursor",
  recommended_plan: "Individual",
  plan_kind: "paid",
  score: 90,
  reasons: ["Good fit"],
  tradeoffs: ["Free alternative"],
  estimated_monthly_cost: 20,
  free_alternative: true,
  free_alternative_plan: "Hobby",
  category: "AI IDE",
  confidence: 0.9,
};

const result = {
  recommendations: [
    recommendation,
    { ...recommendation, product_id: "uuid-2", product_slug: "second", product_name: "Second" },
    { ...recommendation, product_id: "uuid-3", product_slug: "third", product_name: "Third" },
    { ...recommendation, product_id: "uuid-4", product_slug: "fourth", product_name: "Fourth" },
    { ...recommendation, product_id: "uuid-5", product_slug: "fifth", product_name: "Fifth" },
  ],
  estimated_total_monthly_cost: 60,
  assumptions: ["public data"],
  missing_information: ["platform"],
  methodology_version: "v1",
};

const context = buildSanitizedContext(input, result);
assert.equal(context.recommendations.length, 3);
assert.equal(context.assumptions.includes("public data"), true);
assert.equal(context.missing_information.includes("platform"), true);
assert.equal("score" in context.recommendations[0], false);
assert.equal("product_id" in context.recommendations[0], false);
assert.equal("product_slug" in context.recommendations[0], false);

const taintedInput = { ...input, affiliateCommission: 0.9, evidenceSecret: "private" };
const sanitizedInput = sanitizeInput(taintedInput);
assert.equal("affiliateCommission" in sanitizedInput, false);
assert.equal("evidenceSecret" in sanitizedInput, false);

assert.equal(shouldSkipProvider({ ...input, privacy_requirement: "offline" }), true);
assert.equal(shouldSkipProvider(input), false);

const validExplanation = {
  summary: "Cursor fits",
  product_explanations: [{ why_it_fits: "Terminal workflow", considerations: "Requires learning" }],
  uncertainty_note: "Limited platform data.",
};
assert.deepEqual(parseAIExplanation(validExplanation), validExplanation);
assert.equal(parseAIExplanation(null), null);
assert.equal(parseAIExplanation({ summary: "missing" }), null);

function okFetch(content) {
  return async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

const provider = new DeepSeekProvider({
  apiKey: "test-key",
  fetchImpl: okFetch(JSON.stringify(validExplanation)),
});
const providerResponse = await provider.explain(context);
assert.equal(providerResponse.available, true);

const badProvider = new DeepSeekProvider({
  apiKey: "test-key",
  fetchImpl: okFetch("{not-json"),
});
assert.equal((await badProvider.explain(context)).available, false);

const schemaProvider = new DeepSeekProvider({
  apiKey: "test-key",
  fetchImpl: okFetch(JSON.stringify({ summary: "missing fields" })),
});
assert.equal((await schemaProvider.explain(context)).available, false);

const timeoutProvider = new DeepSeekProvider({
  apiKey: "test-key",
  timeoutMs: 5,
  fetchImpl: async (_url, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")));
    }),
});
assert.equal((await timeoutProvider.explain(context)).available, false);

const limiter = new SlidingWindowRateLimiter(2, 60_000);
assert.equal(limiter.isRateLimited("client"), false);
assert.equal(limiter.isRateLimited("client"), false);
assert.equal(limiter.isRateLimited("client"), true);

const parsed = parseAdvisorInput({ ...input, recommendations: "forged", score: 999 });
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal("recommendations" in parsed.value, false);
  assert.equal("score" in parsed.value, false);
}

const product = {
  id: "p1",
  name: "Cursor",
  slug: "cursor",
  category: "AI IDE",
  product_type: "ai_ide",
  description: null,
  pricing: [],
  features: [],
  models: [],
  operating_systems: null,
  score: null,
};
const firstScore = scoreProduct(input, product);
const secondScore = scoreProduct(input, product);
assert.deepEqual(firstScore, secondScore);

console.log("Advisor AI tests PASSED.");
