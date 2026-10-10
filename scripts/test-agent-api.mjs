import { readFile } from "node:fs/promises";

const auth = await readFile("src/lib/agent/auth.ts", "utf8");
const route = await readFile("src/app/api/agent/proposals/route.ts", "utf8");
const migration = await readFile("supabase/migrations/20260826070000_phase7_agent_governance.sql", "utf8");

const checks = [
  ["requires bearer authentication", auth.includes("authorization?.match(/^Bearer")],
  ["validates token through Supabase Auth getUser", /auth\.getUser\(match\[1\]\)/.test(auth)],
  ["uses no service-role key in agent auth", !/SUPABASE_SERVICE_ROLE_KEY/.test(auth)],
  ["rate limits requests", /MAX_REQUESTS = 20/.test(route) && /rateLimited\(clientKey\)/.test(route)],
  ["rejects disabled retail proposals", /suggest_retail_observation/.test(route) && /disabled for this pilot/.test(route)],
  ["validates HTTPS source URLs", /url\.protocol === "https:"/.test(route)],
  ["validates confidence bounds", /body\.confidence < 0 \|\| body\.confidence > 1/.test(route)],
  ["validates technology slug", /lowercase URL-safe slug/.test(route)],
  ["validates relationship endpoints", /A relationship cannot connect an entity to itself/.test(route)],
  ["uses governed submit RPC", /rpc\("submit_agent_proposal"/.test(route)],
  ["database independently checks contributor role", /caller_role != 'agent_contributor'/.test(migration)],
  ["database disables retail pilot", /IF p_type = 'suggest_retail_observation'/.test(migration)],
  ["does not write canonical entities from API route", !/\.from\(["']technology_entities["']\)\.insert/.test(route)],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} contract checks passed.`);
if (failed) process.exitCode = 1;
