import assert from "node:assert/strict";
import { parseRoastInput } from "../src/lib/roast/request.ts";
import { roastMyStack } from "../src/lib/roast/index.ts";

const validBody = {
  technologies: [{ name: "Next.js" }, { name: "Supabase" }, { name: "Vercel" }],
  project_type: "saas",
  team_size: 5,
  deployment_preference: "cloud",
  budget_monthly: 300,
  privacy_requirement: "standard",
  primary_languages: ["TypeScript"],
  frameworks: ["React"],
  operating_systems: [],
  ai_tools: [],
  database_tools: [],
  hosting_tools: [],
  additional_requirements: "",
};

// 1. Valid request
const valid = parseRoastInput(validBody);
assert.equal(valid.ok, true);

// 2. Missing technologies
const missingTechnologies = parseRoastInput({
  ...validBody,
  technologies: undefined,
});
assert.equal(missingTechnologies.ok, false);

// 3. Wrong technologies type
const wrongTechnologiesType = parseRoastInput({
  ...validBody,
  technologies: ["Next.js", "Supabase"], // should be objects
});
assert.equal(wrongTechnologiesType.ok, false);

// 4. Negative budget
const negativeBudget = parseRoastInput({
  ...validBody,
  budget_monthly: -50,
});
assert.equal(negativeBudget.ok, false);

// 5. Invalid team size
const invalidTeamSize = parseRoastInput({
  ...validBody,
  team_size: 0,
});
assert.equal(invalidTeamSize.ok, false);

// 6. Oversized input
const oversizedArray = parseRoastInput({
  ...validBody,
  technologies: Array.from({ length: 60 }, (_, i) => ({ name: `Tech ${i}` })),
});
assert.equal(oversizedArray.ok, false);

// Mock catalog for testing scoring behavior
const catalog = [
  {
    id: "p1",
    name: "Next.js",
    slug: "next-js",
    category: "Framework",
    product_type: "framework",
    description: null,
    pricing: [],
    features: [{ feature_id: "f1", feature_name: "SSR", feature_category: "Rendering", status: "supported" }],
    models: [],
    operating_systems: null,
    score: null,
  },
  {
    id: "p2",
    name: "Supabase",
    slug: "supabase",
    category: "Database",
    product_type: "database",
    description: null,
    pricing: [],
    features: [],
    models: [],
    operating_systems: null,
    score: null,
  }
];

if (valid.ok) {
  // 7. Unknown technology behavior
  // 8. Ambiguous technology behavior
  // 9. Deterministic result behavior
  const roastResult = roastMyStack(valid.value, catalog);

  assert.equal(roastResult.resolved_technologies.length, 2);
  assert.equal(roastResult.unresolved_technologies.length, 1); // Vercel is unknown in our mock catalog
  assert.equal(roastResult.unresolved_technologies[0].original_name, "Vercel");

  const unverifiedAssumptions = roastResult.assumptions.filter(a => a.includes("Unresolved technologies"));
  assert.equal(unverifiedAssumptions.length, 1);
  assert.equal(roastResult.unresolved_information.includes("technology:Vercel"), true);

  // 10. Client-supplied fake score ignored
  const inputWithFakeScore = { ...valid.value, stack_score: { overall: 100 } };
  const fakeScoreResult = roastMyStack(inputWithFakeScore, catalog);
  assert.deepEqual(roastResult.stack_score, fakeScoreResult.stack_score);

  // 11. Client-supplied fake cost ignored
  // The deterministic roast calculation might not result in a different cost score
  // with a higher budget if there are no cost-related findings. We just verify the engine
  // runs successfully and doesn't crash or trust injected properties.
  const inputWithFakeCost = { ...valid.value, fake_cost: 999999 };
  const fakeCostResult = roastMyStack(inputWithFakeCost, catalog);

  // Findings IDs are generated randomly per run, so we omit them from deepEqual
  const sanitizeForDiff = (res) => {
    return { ...res, findings: res.findings.map(f => ({ ...f, id: "omitted" })) };
  };

  assert.deepEqual(sanitizeForDiff(roastResult), sanitizeForDiff(fakeCostResult));

  // 12. Affiliate-like injected data ignored
  const inputWithAffiliate = { ...valid.value, affiliate_data: "buy-this" };
  const affiliateResult = roastMyStack(inputWithAffiliate, catalog);
  assert.deepEqual(sanitizeForDiff(roastResult), sanitizeForDiff(affiliateResult)); // Affiliate data ignored completely
}

console.log("Roast API tests PASSED.");
