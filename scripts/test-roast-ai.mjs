import assert from "node:assert/strict";
import { DeepSeekRoastProvider, parseAIExplanation } from "../src/lib/roast/ai/provider.ts";
import { buildSanitizedContext, shouldSkipProvider } from "../src/lib/roast/ai/context.ts";
import { SlidingWindowRateLimiter } from "../src/lib/advisor/ai/rate-limit.ts";

async function runTests() {
  console.log("Running Roast AI tests...\n");

  let passed = 0;
  let failed = 0;

  function run(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(error);
      failed++;
    }
  }

  async function runAsync(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(error);
      failed++;
    }
  }

  const mockInput = {
    technologies: [{ name: "Next.js" }],
    project_type: "SaaS",
    team_size: 2,
    budget_monthly: 50,
    deployment_preference: "cloud",
    primary_languages: [],
    frameworks: [],
    operating_systems: [],
    ai_tools: [],
    database_tools: [],
    hosting_tools: [],
    privacy_requirement: "standard",
    additional_requirements: "",
  };

  const mockResult = {
    stack_score: { overall: 85, confidence: 0.9, architecture: 85, simplicity: 85, cost: 85, compatibility: 85, privacy: 85, maintainability: 85 },
    resolved_technologies: [{ original_name: "Next.js", normalized_name: "Next.js", resolved_product_id: "p1", resolved_product_slug: "nextjs", category: "Framework", resolution_status: "resolved" }],
    unresolved_technologies: [{ original_name: "MagicDB", normalized_name: "MagicDB", resolved_product_id: null, resolved_product_slug: null, category: null, resolution_status: "unresolved" }],
    findings: [
      { id: "f1", severity: "high", category: "cost", title: "Cost issue", description: "Expensive", affected_technologies: ["Next.js"], evidence_basis: ["Secret Internal Pricing - REMOVED IN SANITIZATION"], actionable: true, suggested_fix: null, confidence: 0.8 }
    ],
    improvements: [
      { type: "replace", current_technology: "MagicDB", suggested_technology: "Supabase", reason: "Unknown tool", expected_benefit: "Known tool", confidence: 0.9 }
    ],
    assumptions: [],
    unresolved_information: [],
    methodology_version: "v1"
  };

  const sanitizedContext = buildSanitizedContext(mockInput, mockResult);

  run("Context Builder removes internal evidence_basis", () => {
    assert.strictEqual(sanitizedContext.findings[0].evidence_basis, undefined);
  });

  run("Context Builder keeps allowed safe fields", () => {
    assert.strictEqual(sanitizedContext.input.budget_monthly, 50);
    assert.strictEqual(sanitizedContext.findings[0].id, "f1");
    assert.strictEqual(sanitizedContext.improvements[0].type, "replace");
  });

  run("shouldSkipProvider respects privacy setting", () => {
    assert.strictEqual(shouldSkipProvider({ ...mockInput, privacy_requirement: "standard" }), false);
    assert.strictEqual(shouldSkipProvider({ ...mockInput, privacy_requirement: "offline" }), true);
  });

  run("parseAIExplanation accepts valid schema", () => {
    const validRaw = {
      headline: "Roast",
      summary: "Sum",
      roast: "Burn",
      top_issues: [{ finding_id: "f1", explanation: "Exp" }],
      improvement_explanations: [{ improvement_index: 0, explanation: "Exp2" }],
      uncertainty_note: "Note",
    };
    const parsed = parseAIExplanation(validRaw, sanitizedContext);
    assert.ok(parsed);
    assert.strictEqual(parsed.top_issues[0].finding_id, "f1");
  });

  run("parseAIExplanation rejects invented finding_id", () => {
    const invalidRaw = {
      headline: "Roast",
      summary: "Sum",
      roast: "Burn",
      top_issues: [{ finding_id: "f99", explanation: "Exp" }],
      improvement_explanations: [],
      uncertainty_note: "Note",
    };
    const parsed = parseAIExplanation(invalidRaw, sanitizedContext);
    assert.ok(parsed);
    assert.strictEqual(parsed.top_issues.length, 0); // Rejects the finding, keeps the rest of the roast
  });

  run("parseAIExplanation rejects out-of-bounds improvement_index", () => {
    const invalidRaw = {
      headline: "Roast",
      summary: "Sum",
      roast: "Burn",
      top_issues: [],
      improvement_explanations: [{ improvement_index: 5, explanation: "Exp2" }],
      uncertainty_note: "Note",
    };
    const parsed = parseAIExplanation(invalidRaw, sanitizedContext);
    assert.ok(parsed);
    assert.strictEqual(parsed.improvement_explanations.length, 0);
  });

  run("parseAIExplanation rejects malformed root schema", () => {
    const invalidRaw = { summary: "Missing everything else" };
    const parsed = parseAIExplanation(invalidRaw, sanitizedContext);
    assert.strictEqual(parsed, null);
  });

  await runAsync("Provider returns available:false on 5xx", async () => {
    const provider = new DeepSeekRoastProvider({
      apiKey: "fake",
      fetchImpl: async () => ({ ok: false, status: 500 }),
    });
    const res = await provider.explain(sanitizedContext);
    assert.strictEqual(res.available, false);
  });

  await runAsync("Provider returns valid parsed explanation", async () => {
    const mockJson = {
      choices: [{
        message: {
          content: JSON.stringify({
            headline: "H", summary: "S", roast: "R", uncertainty_note: "U",
            top_issues: [], improvement_explanations: []
          })
        }
      }]
    };
    const provider = new DeepSeekRoastProvider({
      apiKey: "fake",
      fetchImpl: async () => ({ ok: true, json: async () => mockJson }),
    });
    const res = await provider.explain(sanitizedContext);
    assert.strictEqual(res.available, true);
    if (res.available) {
      assert.strictEqual(res.explanation.headline, "H");
    }
  });

  run("Rate Limiter works (reused from Advisor)", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1000);
    assert.strictEqual(limiter.isRateLimited("ip1"), false);
    assert.strictEqual(limiter.isRateLimited("ip1"), false);
    assert.strictEqual(limiter.isRateLimited("ip1"), true);
  });

  console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
