// Phase 7B — reviewer authorization & proposal promotion REAL database tests.
//
// This suite connects directly to the local Supabase PostgreSQL instance
// (default 127.0.0.1:55434, override with SUPABASE_DB_URL) and exercises the
// SECURITY DEFINER RPCs with real role context via SET ROLE + request.jwt.claims.
// It is NOT a mocked or source-level test.
//
// All rows are temporary and removed in a finally block.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg") as {
  Client: new (config?: { connectionString?: string }) => PgClient;
};

interface PgClient {
  connect(): Promise<void>;
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: any[]; rowCount: number | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any -- pg ships no bundled types
  end(): Promise<void>;
}

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55434/postgres";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}: ${(err as Error).message}`);
  }
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function setRole(
  client: PgClient,
  role: string,
  sub: string,
): Promise<void> {
  const claims = JSON.stringify({ role, sub });
  await client.query("reset role");
  await client.query("set role authenticator");
  await client.query(`set request.jwt.claims to '${claims.replace(/'/g, "''")}'`);
  await client.query(`set role ${role}`);
}

async function expectError(
  client: PgClient,
  sql: string,
  matcher: string | number,
): Promise<void> {
  try {
    await client.query(sql);
    throw new Error(`expected error (${matcher}), got success`);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (typeof matcher === "number") {
      if (e.code === String(matcher)) return;
      throw new Error(`expected SQLSTATE ${matcher}, got ${e.code ?? "none"}: ${e.message}`);
    }
    if (e.message && e.message.includes(matcher)) return;
    throw new Error(`expected error containing '${matcher}', got: ${e.message}`);
  }
}

async function run() {
  console.log("Phase 7B — reviewer authorization & promotion (REAL local database)");

  const client = new pg.Client({ connectionString: DB_URL });
  try {
    await client.connect();
  } catch (err) {
    console.log(
      `NOT RUN — local database unreachable at ${DB_URL}: ${(err as Error).message}`,
    );
    console.log(
      "Start the local Supabase stack (`supabase start`) and rerun this suite.",
    );
    process.exit(2);
  }

  const runId = uuid().slice(0, 8);
  const contributorId = uuid();
  const reviewerId = uuid();
  const techSlug = `phase7b-tech-${runId}`;
  const techName = `Phase 7B Tech ${runId}`;
  const sourceUrl = `https://example.com/phase7b-review/${runId}`;

  const tracked = {
    proposalIds: [] as string[],
    techIds: [] as string[],
    relIds: [] as string[],
    sourceUrls: [sourceUrl] as string[],
    userIds: [contributorId, reviewerId] as string[],
  };

  try {
    // ---- Setup: temporary users and role assignments ---------------------
    for (const id of [contributorId, reviewerId]) {
      await client.query("insert into auth.users (id) values ($1) on conflict (id) do nothing", [id]);
    }
    await client.query(
      `insert into public.agent_role_assignments (user_id, role, is_active, grant_reason)
       values ($1, 'agent_contributor', true, 'phase7b test'),
              ($2, 'agent_reviewer', true, 'phase7b test')
       on conflict (user_id) do update
         set role = excluded.role, is_active = excluded.is_active, grant_reason = excluded.grant_reason`,
      [contributorId, reviewerId],
    );

    // ---- 1. Database-enforced authorization (real role context) ----------
    await test("anon cannot EXECUTE approve_agent_proposal", async () => {
      await setRole(client, "anon", uuid());
      await expectError(
        client,
        `select public.approve_agent_proposal('${uuid()}'::uuid, 'approved')`,
        42501,
      );
    });

    await test("authenticated cannot EXECUTE approve_agent_proposal", async () => {
      await setRole(client, "authenticated", uuid());
      await expectError(
        client,
        `select public.approve_agent_proposal('${uuid()}'::uuid, 'approved')`,
        42501,
      );
    });

    await test("contributor cannot EXECUTE approve/promote RPCs", async () => {
      await setRole(client, "agent_contributor", contributorId);
      await expectError(
        client,
        `select public.approve_agent_proposal('${uuid()}'::uuid, 'approved')`,
        42501,
      );
      await expectError(
        client,
        `select public.promote_technology_proposal('${uuid()}'::uuid)`,
        42501,
      );
      await expectError(
        client,
        `select public.promote_relationship_proposal('${uuid()}'::uuid)`,
        42501,
      );
    });

    await test("reviewer cannot EXECUTE submit_agent_proposal", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `select public.submit_agent_proposal('suggest_technology', '{}'::jsonb, 'https://example.com', 0.5)`,
        42501,
      );
    });

    // ---- 2. Direct-write boundary (defense in depth) ---------------------
    await test("contributor cannot direct-write canonical tables", async () => {
      await setRole(client, "agent_contributor", contributorId);
      await expectError(
        client,
        `insert into public.technology_entities (entity_type, slug, name) values ('product', 'x-${runId}', 'x')`,
        42501,
      );
    });

    await test("reviewer cannot direct-write canonical tables", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `insert into public.technology_entities (entity_type, slug, name) values ('product', 'x-${runId}', 'x')`,
        42501,
      );
    });

    // ---- 3. Technology promotion lifecycle ------------------------------
    let techProposalId = "";

    await test("contributor submits a technology proposal -> pending_review", async () => {
      await setRole(client, "agent_contributor", contributorId);
      const payload = JSON.stringify({
        name: techName,
        slug: techSlug,
        entity_type: "product",
        identifiers: [
          { type: "vendor_id", value: `ven-${runId}` },
          { type: "official_url", value: `https://example.com/tech/${runId}` },
        ],
      });
      const res = await client.query(
        `select public.submit_agent_proposal('suggest_technology', $1::jsonb, $2, $3::numeric) as id`,
        [payload, sourceUrl, 0.73],
      );
      techProposalId = res.rows[0].id;
      tracked.proposalIds.push(techProposalId);
      await client.query("reset role");
      const p = await client.query(
        "select status, agent_id::text as agent_id from public.agent_proposals where id = $1",
        [techProposalId],
      );
      if (p.rows[0].status !== "pending_review") throw new Error("status not pending_review");
      if (p.rows[0].agent_id !== contributorId) throw new Error("agent_id mismatch");
    });

    await test("contributor cannot approve their own proposal", async () => {
      await setRole(client, "agent_contributor", contributorId);
      await expectError(
        client,
        `select public.approve_agent_proposal('${techProposalId}'::uuid, 'approved')`,
        42501,
      );
    });

    await test("reviewer approves the technology proposal", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await client.query(
        `select public.approve_agent_proposal($1::uuid, 'approved')`,
        [techProposalId],
      );
      await client.query("reset role");
      const p = await client.query(
        "select status, reviewed_by::text as reviewed_by from public.agent_proposals where id = $1",
        [techProposalId],
      );
      if (p.rows[0].status !== "approved") throw new Error("status not approved");
      if (p.rows[0].reviewed_by !== reviewerId) throw new Error("reviewed_by mismatch");
    });

    await test("re-approving an already-approved proposal is rejected", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `select public.approve_agent_proposal('${techProposalId}'::uuid, 'approved')`,
        "Invalid state transition",
      );
    });

    await test("promoting before approval is rejected", async () => {
      // A second proposal left in pending_review to prove the status guard.
      await setRole(client, "agent_contributor", contributorId);
      const payload = JSON.stringify({ name: "Pending Tech", slug: `phase7b-pending-${runId}`, entity_type: "other" });
      const res = await client.query(
        `select public.submit_agent_proposal('suggest_technology', $1::jsonb, $2, 0.5) as id`,
        [payload, sourceUrl],
      );
      tracked.proposalIds.push(res.rows[0].id);
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `select public.promote_technology_proposal('${res.rows[0].id}'::uuid)`,
        "Invalid state transition",
      );
    });

    let techEntityId = "";

    await test("reviewer promotes the technology proposal", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await client.query(`select public.promote_technology_proposal($1::uuid)`, [techProposalId]);

      await client.query("reset role");
      const p = await client.query(
        "select status from public.agent_proposals where id = $1",
        [techProposalId],
      );
      if (p.rows[0].status !== "promoted") throw new Error("proposal not promoted");

      const te = await client.query(
        "select id::text as id, slug, name, entity_type, is_published from public.technology_entities where slug = $1",
        [techSlug],
      );
      if (te.rows.length !== 1) throw new Error("canonical technology entity missing");
      if (te.rows[0].name !== techName) throw new Error("entity name mismatch");
      if (te.rows[0].entity_type !== "product") throw new Error("entity_type mismatch");
      if (te.rows[0].is_published !== false) throw new Error("entity should be unpublished");
      techEntityId = te.rows[0].id;
      tracked.techIds.push(techEntityId);
    });

    await test("identifiers are inserted and linked", async () => {
      await client.query("reset role");
      const rows = await client.query(
        "select identifier_type, identifier_value from public.technology_identifiers where tech_entity_id = $1 order by identifier_type",
        [techEntityId],
      );
      const got = rows.rows.map((r) => `${r.identifier_type}:${r.identifier_value}`).sort();
      const want = [`official_url:https://example.com/tech/${runId}`, `vendor_id:ven-${runId}`].sort();
      if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`identifiers mismatch: ${JSON.stringify(got)}`);
    });

    await test("evidence is linked to the technology entity and source", async () => {
      await client.query("reset role");
      const rows = await client.query(
        "select e.entity_type, e.entity_id::text as entity_id, e.tech_entity_id::text as tech_entity_id, e.field_name, e.observed_value, e.confidence, s.url from public.evidence e join public.sources s on s.id = e.source_id where e.entity_type = 'technology_entities' and e.entity_id = $1",
        [techEntityId],
      );
      if (rows.rows.length !== 1) throw new Error("expected exactly one evidence row");
      const r = rows.rows[0];
      if (r.tech_entity_id !== techEntityId) throw new Error("evidence tech_entity_id mismatch");
      if (r.field_name !== "existence" || r.observed_value !== "true") throw new Error("evidence fields mismatch");
      if (Number(r.confidence) !== 0.73) throw new Error("evidence confidence mismatch");
      if (r.url !== sourceUrl) throw new Error("evidence source url mismatch");
    });

    await test("audit log records reviewer identity and action", async () => {
      await client.query("reset role");
      const rows = await client.query(
        "select agent_id::text as agent_id, action, canonical_table_affected, canonical_record_id::text as canonical_record_id, reviewer_id::text as reviewer_id from public.agent_audit_log where proposal_id = $1",
        [techProposalId],
      );
      if (rows.rows.length !== 1) throw new Error("expected exactly one audit row");
      const r = rows.rows[0];
      if (r.agent_id !== contributorId) throw new Error("audit agent_id mismatch");
      if (r.action !== "insert") throw new Error("audit action mismatch");
      if (r.canonical_table_affected !== "technology_entities") throw new Error("audit table mismatch");
      if (r.canonical_record_id !== techEntityId) throw new Error("audit canonical_record_id mismatch");
      if (r.reviewer_id !== reviewerId) throw new Error("audit reviewer_id mismatch");
    });

    await test("sequential double-promotion is rejected (no duplicate)", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `select public.promote_technology_proposal('${techProposalId}'::uuid)`,
        "Invalid state transition",
      );
      await client.query("reset role");
      const count = await client.query(
        "select count(*)::int as c from public.technology_entities where slug = $1",
        [techSlug],
      );
      if (count.rows[0].c !== 1) throw new Error("duplicate canonical entity created");
    });

    // ---- 4. Relationship promotion lifecycle ----------------------------
    // Second target entity created directly as postgres (owner), scoped slug.
    const relTargetSlug = `phase7b-reltarget-${runId}`;
    await client.query("reset role");
    const relTarget = await client.query(
      "insert into public.technology_entities (entity_type, slug, name, is_published) values ('product', $1, $2, false) returning id::text as id",
      [relTargetSlug, `Rel Target ${runId}`],
    );
    const relTargetId = relTarget.rows[0].id;
    tracked.techIds.push(relTargetId);

    let relProposalId = "";
    const relationshipType = "integrates_with";

    await test("contributor submits a relationship proposal -> pending_review", async () => {
      await setRole(client, "agent_contributor", contributorId);
      const payload = JSON.stringify({
        source_entity_id: techEntityId,
        target_entity_id: relTargetId,
        relationship_type: relationshipType,
      });
      const res = await client.query(
        `select public.submit_agent_proposal('suggest_relationship', $1::jsonb, $2, 0.6) as id`,
        [payload, sourceUrl],
      );
      relProposalId = res.rows[0].id;
      tracked.proposalIds.push(relProposalId);
    });

    await test("reviewer approves and promotes the relationship", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await client.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [relProposalId]);
      await client.query(`select public.promote_relationship_proposal($1::uuid)`, [relProposalId]);

      await client.query("reset role");
      const p = await client.query("select status from public.agent_proposals where id = $1", [relProposalId]);
      if (p.rows[0].status !== "promoted") throw new Error("relationship proposal not promoted");

      const rel = await client.query(
        "select id::text as id, source_entity_id::text as source, target_entity_id::text as target, relationship_type, status, confidence from public.tech_relationships where source_entity_id = $1 and target_entity_id = $2 and relationship_type = $3",
        [techEntityId, relTargetId, relationshipType],
      );
      if (rel.rows.length !== 1) throw new Error("canonical relationship missing");
      if (rel.rows[0].status !== "approved") throw new Error("relationship status mismatch");
      if (rel.rows[0].source !== techEntityId || rel.rows[0].target !== relTargetId) throw new Error("relationship endpoints mismatch");
      tracked.relIds.push(rel.rows[0].id);

      const ev = await client.query(
        "select field_name, observed_value, tech_entity_id::text as tech_entity_id from public.evidence where entity_type = 'tech_relationships' and entity_id = $1",
        [rel.rows[0].id],
      );
      if (ev.rows.length !== 1) throw new Error("relationship evidence missing");
      if (ev.rows[0].field_name !== "relationship" || ev.rows[0].observed_value !== relationshipType) throw new Error("relationship evidence mismatch");

      const audit = await client.query(
        "select canonical_table_affected, canonical_record_id::text as canonical_record_id, reviewer_id::text as reviewer_id from public.agent_audit_log where proposal_id = $1",
        [relProposalId],
      );
      if (audit.rows.length !== 1) throw new Error("relationship audit missing");
      if (audit.rows[0].canonical_table_affected !== "tech_relationships") throw new Error("relationship audit table mismatch");
      if (audit.rows[0].canonical_record_id !== rel.rows[0].id) throw new Error("relationship audit record id mismatch");
      if (audit.rows[0].reviewer_id !== reviewerId) throw new Error("relationship audit reviewer mismatch");
    });

    await test("duplicate relationship promotion is rejected atomically", async () => {
      // Identical relationship from a second proposal: unique constraint blocks
      // the second canonical row and the whole promotion rolls back.
      await setRole(client, "agent_contributor", contributorId);
      const payload = JSON.stringify({
        source_entity_id: techEntityId,
        target_entity_id: relTargetId,
        relationship_type: relationshipType,
      });
      const res = await client.query(
        `select public.submit_agent_proposal('suggest_relationship', $1::jsonb, $2, 0.6) as id`,
        [payload, sourceUrl],
      );
      const dupProposalId = res.rows[0].id;
      tracked.proposalIds.push(dupProposalId);

      await setRole(client, "agent_reviewer", reviewerId);
      await client.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [dupProposalId]);
      await expectError(
        client,
        `select public.promote_relationship_proposal('${dupProposalId}'::uuid)`,
        23505,
      );

      await client.query("reset role");
      const p = await client.query("select status from public.agent_proposals where id = $1", [dupProposalId]);
      if (p.rows[0].status !== "approved") throw new Error("failed promotion left status changed (not atomic)");
      const relCount = await client.query(
        "select count(*)::int as c from public.tech_relationships where source_entity_id = $1 and target_entity_id = $2 and relationship_type = $3",
        [techEntityId, relTargetId, relationshipType],
      );
      if (relCount.rows[0].c !== 1) throw new Error("duplicate relationship row created");
      const auditCount = await client.query(
        "select count(*)::int as c from public.agent_audit_log where proposal_id = $1",
        [dupProposalId],
      );
      if (auditCount.rows[0].c !== 0) throw new Error("audit row created for failed promotion");
    });

    await test("invalid source entity identifier is rejected at promotion", async () => {
      await setRole(client, "agent_contributor", contributorId);
      const payload = JSON.stringify({
        source_entity_id: uuid(),
        target_entity_id: relTargetId,
        relationship_type: "runs_on",
      });
      const res = await client.query(
        `select public.submit_agent_proposal('suggest_relationship', $1::jsonb, $2, 0.5) as id`,
        [payload, sourceUrl],
      );
      tracked.proposalIds.push(res.rows[0].id);
      await setRole(client, "agent_reviewer", reviewerId);
      await client.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [res.rows[0].id]);
      await expectError(
        client,
        `select public.promote_relationship_proposal('${res.rows[0].id}'::uuid)`,
        "Source entity does not exist",
      );
    });

    await test("self-referencing relationship is rejected by the check constraint", async () => {
      await setRole(client, "agent_contributor", contributorId);
      const payload = JSON.stringify({
        source_entity_id: techEntityId,
        target_entity_id: techEntityId,
        relationship_type: "runs_on",
      });
      const res = await client.query(
        `select public.submit_agent_proposal('suggest_relationship', $1::jsonb, $2, 0.5) as id`,
        [payload, sourceUrl],
      );
      tracked.proposalIds.push(res.rows[0].id);
      await setRole(client, "agent_reviewer", reviewerId);
      await client.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [res.rows[0].id]);
      await expectError(
        client,
        `select public.promote_relationship_proposal('${res.rows[0].id}'::uuid)`,
        23514,
      );
    });

    // ---- 5. Retail safety -----------------------------------------------
    await test("retail proposal submission is disabled", async () => {
      await setRole(client, "agent_contributor", contributorId);
      await expectError(
        client,
        `select public.submit_agent_proposal('suggest_retail_observation', '{}'::jsonb, '${sourceUrl}', 0.5)`,
        "Retail pilot disabled",
      );
    });

    await test("promote_retail_observation remains disabled for reviewers", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `select public.promote_retail_observation('${uuid()}'::uuid)`,
        "Retail pilot disabled",
      );
    });

    // ---- 6. Transactional integrity -------------------------------------
    await test("approve of a missing proposal fails cleanly", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `select public.approve_agent_proposal('${uuid()}'::uuid, 'approved')`,
        "Proposal not found",
      );
    });

    await test("promote of a missing proposal fails cleanly", async () => {
      await setRole(client, "agent_reviewer", reviewerId);
      await expectError(
        client,
        `select public.promote_technology_proposal('${uuid()}'::uuid)`,
        "Proposal not found",
      );
    });

    await test("approval never creates a canonical record", async () => {
      // Count canonical tech entities before/after approving a fresh proposal.
      await setRole(client, "agent_contributor", contributorId);
      const payload = JSON.stringify({ name: "Approve Only", slug: `phase7b-approve-${runId}`, entity_type: "other" });
      const res = await client.query(
        `select public.submit_agent_proposal('suggest_technology', $1::jsonb, $2, 0.5) as id`,
        [payload, sourceUrl],
      );
      tracked.proposalIds.push(res.rows[0].id);
      await client.query("reset role");
      const before = await client.query("select count(*)::int as c from public.technology_entities where slug = $1", [`phase7b-approve-${runId}`]);
      await setRole(client, "agent_reviewer", reviewerId);
      await client.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [res.rows[0].id]);
      await client.query("reset role");
      const after = await client.query("select count(*)::int as c from public.technology_entities where slug = $1", [`phase7b-approve-${runId}`]);
      if (before.rows[0].c !== 0 || after.rows[0].c !== 0) throw new Error("approval created a canonical record");
    });
  } finally {
    // ---- Cleanup (dependency order) -------------------------------------
    try {
      await client.query("reset role");
      if (tracked.proposalIds.length) {
        await client.query("delete from public.agent_audit_log where proposal_id = any($1::uuid[])", [tracked.proposalIds]);
        await client.query("delete from public.agent_proposals where id = any($1::uuid[])", [tracked.proposalIds]);
      }
      if (tracked.relIds.length) {
        await client.query("delete from public.evidence where entity_type = 'tech_relationships' and entity_id = any($1::uuid[])", [tracked.relIds]);
        await client.query("delete from public.tech_relationships where id = any($1::uuid[])", [tracked.relIds]);
      }
      if (tracked.techIds.length) {
        await client.query("delete from public.evidence where tech_entity_id = any($1::uuid[]) or (entity_type = 'technology_entities' and entity_id = any($1::uuid[]))", [tracked.techIds]);
        await client.query("delete from public.technology_entities where id = any($1::uuid[])", [tracked.techIds]);
      }
      if (tracked.sourceUrls.length) {
        await client.query("delete from public.sources where url = any($1::text[])", [tracked.sourceUrls]);
      }
      await client.query("delete from public.agent_role_assignments where user_id = any($1::uuid[])", [tracked.userIds]);
      await client.query("delete from auth.users where id = any($1::uuid[])", [tracked.userIds]);
      console.log("Cleanup complete (temporary rows removed).");
    } catch (cleanupErr) {
      console.log(`Cleanup warning: ${(cleanupErr as Error).message}`);
    }
    await client.end();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
