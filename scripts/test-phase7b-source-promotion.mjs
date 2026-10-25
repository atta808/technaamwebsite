// Phase 7B live regression test: source creation during agent promotion.
//
// Connects to the LOCAL Supabase Postgres at 127.0.0.1:55434 and runs three
// rollback-only scenarios, each in its own transaction that is always rolled
// back so no persistent data is left behind.
//
//   S1  promote_technology_proposal creates a NEW source
//   S2  promote_technology_proposal reuses an EXISTING source
//   S3  promote_relationship_proposal creates a NEW source
//
// S1 and S3 require migration 20261025020000_phase7b_fix_sources_source_type_default
// (it sets the source_type default to 'other'). Without that migration they
// fail with sources_source_type_check. S2 passes on either side.
//
// Run: node scripts/test-phase7b-source-promotion.mjs

import pg from "pg";
import crypto from "node:crypto";

const { Client } = pg;

const DB = {
  host: "127.0.0.1",
  port: 55434,
  user: "postgres",
  password: "postgres",
  database: "postgres",
  ssl: false,
  connectionTimeoutMillis: 8000,
};

const marker = () => crypto.randomUUID().slice(0, 8);
const id = () => crypto.randomUUID();

function reviewerClaims(reviewerId) {
  return JSON.stringify({ role: "agent_reviewer", sub: reviewerId });
}

function assertEq(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function count(client, sql, params) {
  const r = await client.query(sql, params);
  return Number(r.rows[0].n);
}

async function runScenario(client, fn) {
  await client.query("BEGIN;");
  let result;
  try {
    result = await fn(client);
    result.passed = true;
  } catch (e) {
    result = { passed: false, error: e.message };
  } finally {
    await client.query("ROLLBACK;");
  }
  return result;
}

// S1: technology promotion with a brand-new source URL.
function scenarioTechNewSource(client) {
  const proposalId = id();
  const agentId = id();
  const reviewerId = id();
  const m = marker();
  const slug = `regress-tech-new-${m}`;
  const url = `https://example.com/regress-tech-new-${m}`;
  const identVal = `regress-tech-new-${m}`;

  return async () => {
    await client.query(
      `INSERT INTO public.agent_proposals
         (id, agent_id, proposal_type, status, payload, source_url, confidence)
       VALUES ($1, $2, 'suggest_technology', 'approved', $3, $4, 0.5);`,
      [
        proposalId,
        agentId,
        JSON.stringify({
          name: "Regression new-source tech",
          slug,
          entity_type: "other",
          identifiers: [{ type: "probe", value: identVal }],
        }),
        url,
      ]
    );
    await client.query(`SELECT set_config('request.jwt.claims', $1, true);`, [
      reviewerClaims(reviewerId),
    ]);
    await client.query(`SELECT public.promote_technology_proposal($1);`, [proposalId]);

    const sourceType = (
      await client.query(`SELECT source_type FROM public.sources WHERE url = $1;`, [url])
    ).rows[0]?.source_type;
    assertEq("S1 source_type", sourceType, "other");
    assertEq("S1 identifiers", await count(client, `SELECT count(*)::int AS n FROM public.technology_identifiers WHERE identifier_value = $1;`, [identVal]), 1);
    assertEq("S1 audit rows", await count(client, `SELECT count(*)::int AS n FROM public.agent_audit_log WHERE proposal_id = $1;`, [proposalId]), 1);
    assertEq("S1 proposal status", (await client.query(`SELECT status FROM public.agent_proposals WHERE id = $1;`, [proposalId])).rows[0].status, "promoted");
    return { markers: { proposalId, url, identVal, slug } };
  };
}

// S2: technology promotion reusing a pre-existing source.
function scenarioTechExistingSource(client) {
  const proposalId = id();
  const agentId = id();
  const reviewerId = id();
  const sourceId = id();
  const m = marker();
  const slug = `regress-tech-existing-${m}`;
  const url = `https://example.com/regress-tech-existing-${m}`;
  const identVal = `regress-tech-existing-${m}`;

  return async () => {
    await client.query(
      `INSERT INTO public.sources (id, slug, name, url, source_type)
       VALUES ($1, $2, 'Regression existing source', $3, 'third_party');`,
      [sourceId, `regress-src-${m}`, url]
    );
    await client.query(
      `INSERT INTO public.agent_proposals
         (id, agent_id, proposal_type, status, payload, source_url, confidence)
       VALUES ($1, $2, 'suggest_technology', 'approved', $3, $4, 0.5);`,
      [
        proposalId,
        agentId,
        JSON.stringify({
          name: "Regression existing-source tech",
          slug,
          entity_type: "other",
          identifiers: [{ type: "probe", value: identVal }],
        }),
        url,
      ]
    );
    await client.query(`SELECT set_config('request.jwt.claims', $1, true);`, [
      reviewerClaims(reviewerId),
    ]);
    await client.query(`SELECT public.promote_technology_proposal($1);`, [proposalId]);

    assertEq("S2 source count", await count(client, `SELECT count(*)::int AS n FROM public.sources WHERE url = $1;`, [url]), 1);
    assertEq("S2 identifiers", await count(client, `SELECT count(*)::int AS n FROM public.technology_identifiers WHERE identifier_value = $1;`, [identVal]), 1);
    assertEq("S2 audit rows", await count(client, `SELECT count(*)::int AS n FROM public.agent_audit_log WHERE proposal_id = $1;`, [proposalId]), 1);
    assertEq("S2 proposal status", (await client.query(`SELECT status FROM public.agent_proposals WHERE id = $1;`, [proposalId])).rows[0].status, "promoted");
    return { markers: { proposalId, url, identVal, slug } };
  };
}

// S3: relationship promotion with a brand-new source URL.
function scenarioRelationshipNewSource(client) {
  const proposalId = id();
  const agentId = id();
  const reviewerId = id();
  const entA = id();
  const entB = id();
  const m = marker();
  const slugA = `regress-ent-a-${m}`;
  const slugB = `regress-ent-b-${m}`;
  const url = `https://example.com/regress-rel-new-${m}`;

  return async () => {
    await client.query(
      `INSERT INTO public.technology_entities (id, entity_type, slug, name, is_published)
       VALUES ($1, 'product', $2, 'Regression entity A', false);`,
      [entA, slugA]
    );
    await client.query(
      `INSERT INTO public.technology_entities (id, entity_type, slug, name, is_published)
       VALUES ($1, 'product', $2, 'Regression entity B', false);`,
      [entB, slugB]
    );
    await client.query(
      `INSERT INTO public.agent_proposals
         (id, agent_id, proposal_type, status, payload, source_url, confidence)
       VALUES ($1, $2, 'suggest_relationship', 'approved', $3, $4, 0.5);`,
      [
        proposalId,
        agentId,
        JSON.stringify({
          source_entity_id: entA,
          target_entity_id: entB,
          relationship_type: "compatible_with",
        }),
        url,
      ]
    );
    await client.query(`SELECT set_config('request.jwt.claims', $1, true);`, [
      reviewerClaims(reviewerId),
    ]);
    await client.query(`SELECT public.promote_relationship_proposal($1);`, [proposalId]);

    const sourceType = (
      await client.query(`SELECT source_type FROM public.sources WHERE url = $1;`, [url])
    ).rows[0]?.source_type;
    assertEq("S3 source_type", sourceType, "other");
    assertEq("S3 relationship rows", await count(client, `SELECT count(*)::int AS n FROM public.tech_relationships WHERE source_entity_id = $1 AND target_entity_id = $2 AND relationship_type = 'compatible_with';`, [entA, entB]), 1);
    assertEq("S3 audit rows", await count(client, `SELECT count(*)::int AS n FROM public.agent_audit_log WHERE proposal_id = $1;`, [proposalId]), 1);
    assertEq("S3 proposal status", (await client.query(`SELECT status FROM public.agent_proposals WHERE id = $1;`, [proposalId])).rows[0].status, "promoted");
    return { markers: { proposalId, url, slugA, slugB, entA, entB } };
  };
}

async function assertNoResidue(client, markers) {
  const failures = [];
  const ck = async (label, sql, params) => {
    const n = await count(client, sql, params);
    if (n !== 0) failures.push(`${label}=${n}`);
  };
  await ck("proposals", `SELECT count(*)::int AS n FROM public.agent_proposals WHERE id = $1;`, [markers.proposalId]);
  await ck("audit", `SELECT count(*)::int AS n FROM public.agent_audit_log WHERE proposal_id = $1;`, [markers.proposalId]);
  if (markers.url) await ck("sources", `SELECT count(*)::int AS n FROM public.sources WHERE url = $1;`, [markers.url]);
  if (markers.identVal) await ck("identifiers", `SELECT count(*)::int AS n FROM public.technology_identifiers WHERE identifier_value = $1;`, [markers.identVal]);
  if (markers.slug) await ck("entity", `SELECT count(*)::int AS n FROM public.technology_entities WHERE slug = $1;`, [markers.slug]);
  if (markers.slugA) await ck("entityA", `SELECT count(*)::int AS n FROM public.technology_entities WHERE slug = $1;`, [markers.slugA]);
  if (markers.slugB) await ck("entityB", `SELECT count(*)::int AS n FROM public.technology_entities WHERE slug = $1;`, [markers.slugB]);
  if (markers.entA && markers.entB) await ck("relationship", `SELECT count(*)::int AS n FROM public.tech_relationships WHERE source_entity_id = $1 AND target_entity_id = $2;`, [markers.entA, markers.entB]);
  return failures;
}

async function main() {
  const client = new Client(DB);
  await client.connect();

  const scenarios = [
    ["S1 promote_technology_proposal new source", scenarioTechNewSource(client)],
    ["S2 promote_technology_proposal existing source", scenarioTechExistingSource(client)],
    ["S3 promote_relationship_proposal new source", scenarioRelationshipNewSource(client)],
  ];

  const results = [];
  for (const [name, fn] of scenarios) {
    const r = await runScenario(client, fn);
    results.push({ name, r });
    console.log(`${r.passed ? "PASS" : "FAIL"} ${name}`);
    if (!r.passed) console.log("     error:", r.error);
  }

  let residueOk = true;
  for (const { name, r } of results) {
    if (!r.markers) continue;
    const residueFailures = await assertNoResidue(client, r.markers);
    if (residueFailures.length) {
      residueOk = false;
      console.log(`RESIDUE ${name}: ${residueFailures.join(", ")}`);
    }
  }
  console.log(`residue check: ${residueOk ? "clean" : "DIRTY"}`);

  await client.end();

  const passCount = results.filter((x) => x.r.passed).length;
  console.log(`\n${passCount}/${scenarios.length} scenarios passed.`);
  if (!residueOk || passCount !== scenarios.length) {
    console.log("S1 and S3 require migration 20261025020000 to be applied.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("TEST RUNNER FAILED:", e && e.message ? e.message : e);
  process.exit(1);
});
