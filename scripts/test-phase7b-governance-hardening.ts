// Phase 7B — database governance hardening regression tests (REAL local DB).
//
// Requires the migration
//   supabase/migrations/20261106000000_phase7b_governance_hardening.sql
// to be applied to the local Supabase PostgreSQL instance.
// Concurrency tests use two genuinely independent pg connections.
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setRole(client: PgClient, role: string, sub: string): Promise<void> {
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

async function concurrentReviewerAction(
  winner: { client: PgClient; role: string; sub: string; sql: string },
  loser: { client: PgClient; role: string; sub: string; sql: string },
): Promise<{ ok: boolean; message: string }> {
  await setRole(winner.client, winner.role, winner.sub);
  await winner.client.query("begin");
  let loserPromise: Promise<{ ok: boolean; message: string }>;
  try {
    await winner.client.query(winner.sql); // acquires the row lock
    await setRole(loser.client, loser.role, loser.sub);
    await loser.client.query("begin");
    loserPromise = loser.client.query(loser.sql).then(
      () => ({ ok: true as const, message: "" }),
      (e: Error) => ({ ok: false as const, message: e.message ?? "" }),
    );
    await sleep(150);
    await winner.client.query("commit");
  } catch (err) {
    await winner.client.query("rollback").catch(() => undefined);
    throw err;
  }
  const loserResult = await loserPromise;
  await loser.client.query("rollback").catch(() => undefined);
  return loserResult;
}

async function run() {
  console.log("Phase 7B — governance hardening tests (REAL local database)");

  const clientA = new pg.Client({ connectionString: DB_URL });
  const clientB = new pg.Client({ connectionString: DB_URL });
  try {
    await clientA.connect();
    await clientB.connect();
  } catch (err) {
    console.log(`NOT RUN — local database unreachable: ${(err as Error).message}`);
    process.exit(2);
  }

  const runId = uuid().slice(0, 8);
  const contributorId = uuid();
  const reviewer1Id = uuid();
  const reviewer2Id = uuid();

  const tracked = {
    proposalIds: [] as string[],
    techIds: [] as string[],
    relIds: [] as string[],
    sourceUrls: [] as string[],
    userIds: [contributorId, reviewer1Id, reviewer2Id] as string[],
  };

  try {
    for (const id of [contributorId, reviewer1Id, reviewer2Id]) {
      await clientA.query("insert into auth.users (id) values ($1) on conflict (id) do nothing", [id]);
    }
    await clientA.query(
      `insert into public.agent_role_assignments (user_id, role, is_active, grant_reason)
       values ($1, 'agent_contributor', true, 'phase7b hardening test'),
              ($2, 'agent_reviewer', true, 'phase7b hardening test'),
              ($3, 'agent_reviewer', true, 'phase7b hardening test')
       on conflict (user_id) do update
         set role = excluded.role, is_active = excluded.is_active, grant_reason = excluded.grant_reason`,
      [contributorId, reviewer1Id, reviewer2Id],
    );

    // ---- A. Self-review prevention --------------------------------------
    const techSlug = `phase7b-harden-${runId}`;
    const techSource = `https://example.com/phase7b-hardening/${runId}/tech`;
    tracked.sourceUrls.push(techSource);

    let selfTechProposal = "";

    await test("contributor submits a technology proposal", async () => {
      await setRole(clientA, "agent_contributor", contributorId);
      const payload = JSON.stringify({ name: `Hardened Tech ${runId}`, slug: techSlug, entity_type: "product" });
      const r = await clientA.query(
        `select public.submit_agent_proposal('suggest_technology', $1::jsonb, $2, 0.5) as id`,
        [payload, techSource],
      );
      selfTechProposal = r.rows[0].id;
      tracked.proposalIds.push(selfTechProposal);
    });

    await test("self-approval is rejected", async () => {
      await setRole(clientA, "agent_reviewer", contributorId);
      await expectError(
        clientA,
        `select public.approve_agent_proposal('${selfTechProposal}'::uuid, 'approved')`,
        "Self-review is not permitted",
      );
    });

    await test("self-rejection is rejected", async () => {
      await setRole(clientA, "agent_reviewer", contributorId);
      await expectError(
        clientA,
        `select public.approve_agent_proposal('${selfTechProposal}'::uuid, 'rejected')`,
        "Self-review is not permitted",
      );
    });

    await test("a different reviewer can approve", async () => {
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await clientA.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [selfTechProposal]);
      await clientA.query("reset role");
      const p = await clientA.query("select status, reviewed_by::text as reviewed_by from public.agent_proposals where id = $1", [selfTechProposal]);
      if (p.rows[0].status !== "approved") throw new Error("status not approved");
      if (p.rows[0].reviewed_by !== reviewer1Id) throw new Error("reviewed_by mismatch");
    });

    await test("self-promotion is rejected", async () => {
      await setRole(clientA, "agent_reviewer", contributorId);
      await expectError(
        clientA,
        `select public.promote_technology_proposal('${selfTechProposal}'::uuid)`,
        "Self-review is not permitted",
      );
    });

    await test("a different reviewer can promote", async () => {
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await clientA.query(`select public.promote_technology_proposal($1::uuid)`, [selfTechProposal]);
      await clientA.query("reset role");
      const te = await clientA.query("select id::text as id from public.technology_entities where slug = $1", [techSlug]);
      if (te.rows.length !== 1) throw new Error("canonical entity missing");
      tracked.techIds.push(te.rows[0].id);
    });

    // ---- B. Concurrent approval vs rejection (two connections) ----------
    let concurrentTechProposal = "";
    {
      await setRole(clientA, "agent_contributor", contributorId);
      const payload = JSON.stringify({ name: `Concurrent ${runId}`, slug: `phase7b-conc-${runId}`, entity_type: "other" });
      const r = await clientA.query(
        `select public.submit_agent_proposal('suggest_technology', $1::jsonb, $2, 0.5) as id`,
        [payload, techSource],
      );
      concurrentTechProposal = r.rows[0].id;
      tracked.proposalIds.push(concurrentTechProposal);
    }

    let concurrencyOutcome = { ok: false as boolean, message: "" };

    await test("concurrent approve vs reject: exactly one wins", async () => {
      concurrencyOutcome = await concurrentReviewerAction(
        {
          client: clientA,
          role: "agent_reviewer",
          sub: reviewer1Id,
          sql: `select public.approve_agent_proposal('${concurrentTechProposal}'::uuid, 'approved')`,
        },
        {
          client: clientB,
          role: "agent_reviewer",
          sub: reviewer2Id,
          sql: `select public.approve_agent_proposal('${concurrentTechProposal}'::uuid, 'rejected')`,
        },
      );
      if (concurrencyOutcome.ok) throw new Error("loser operation unexpectedly succeeded");
      if (!concurrencyOutcome.message.includes("Invalid state transition")) {
        throw new Error(`loser got unexpected error: ${concurrencyOutcome.message}`);
      }
    });

    await test("loser does not overwrite the winning decision", async () => {
      await clientA.query("reset role");
      const p = await clientA.query(
        "select status, reviewed_by::text as reviewed_by, reviewed_at from public.agent_proposals where id = $1",
        [concurrentTechProposal],
      );
      if (p.rows[0].status !== "approved") throw new Error("winner decision not preserved");
      if (p.rows[0].reviewed_by !== reviewer1Id) throw new Error("reviewed_by overwritten by loser");
      if (!p.rows[0].reviewed_at) throw new Error("reviewed_at not set");
    });

    // ---- C. Concurrent technology promotion (two connections) -----------
    let promoResult = { ok: false as boolean, message: "" };

    await test("concurrent technology promotion: exactly one succeeds", async () => {
      promoResult = await concurrentReviewerAction(
        {
          client: clientA,
          role: "agent_reviewer",
          sub: reviewer1Id,
          sql: `select public.promote_technology_proposal('${concurrentTechProposal}'::uuid)`,
        },
        {
          client: clientB,
          role: "agent_reviewer",
          sub: reviewer2Id,
          sql: `select public.promote_technology_proposal('${concurrentTechProposal}'::uuid)`,
        },
      );
      if (promoResult.ok) throw new Error("loser promotion unexpectedly succeeded");
      if (!promoResult.message.includes("Invalid state transition")) {
        throw new Error(`loser promotion got unexpected error: ${promoResult.message}`);
      }
    });

    await test("no duplicate canonical entity, one audit event, status promoted", async () => {
      await clientA.query("reset role");
      const slug = `phase7b-conc-${runId}`;
      const te = await clientA.query("select id::text as id from public.technology_entities where slug = $1", [slug]);
      if (te.rows.length !== 1) throw new Error(`expected 1 entity, got ${te.rows.length}`);
      tracked.techIds.push(te.rows[0].id);
      const audit = await clientA.query("select count(*)::int as c from public.agent_audit_log where proposal_id = $1", [concurrentTechProposal]);
      if (audit.rows[0].c !== 1) throw new Error(`expected 1 audit event, got ${audit.rows[0].c}`);
      const p = await clientA.query("select status from public.agent_proposals where id = $1", [concurrentTechProposal]);
      if (p.rows[0].status !== "promoted") throw new Error("status not promoted");
    });

    // ---- C2. Concurrent relationship promotion (two connections) --------
    const relA = uuid();
    const relB = uuid();
    await clientA.query("reset role");
    await clientA.query(
      "insert into public.technology_entities (id, entity_type, slug, name, is_published) values ($1, 'product', $2, 'RelA', false), ($3, 'product', $4, 'RelB', false)",
      [relA, `phase7b-rela-${runId}`, relB, `phase7b-relb-${runId}`],
    );
    tracked.techIds.push(relA, relB);

    let relProposal = "";
    {
      await setRole(clientA, "agent_contributor", contributorId);
      const payload = JSON.stringify({ source_entity_id: relA, target_entity_id: relB, relationship_type: "integrates_with" });
      const r = await clientA.query(
        `select public.submit_agent_proposal('suggest_relationship', $1::jsonb, $2, 0.6) as id`,
        [payload, techSource],
      );
      relProposal = r.rows[0].id;
      tracked.proposalIds.push(relProposal);
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await clientA.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [relProposal]);
    }

    let relPromoResult = { ok: false as boolean, message: "" };

    await test("concurrent relationship promotion: exactly one succeeds", async () => {
      relPromoResult = await concurrentReviewerAction(
        {
          client: clientA,
          role: "agent_reviewer",
          sub: reviewer1Id,
          sql: `select public.promote_relationship_proposal('${relProposal}'::uuid)`,
        },
        {
          client: clientB,
          role: "agent_reviewer",
          sub: reviewer2Id,
          sql: `select public.promote_relationship_proposal('${relProposal}'::uuid)`,
        },
      );
      if (relPromoResult.ok) throw new Error("loser relationship promotion unexpectedly succeeded");
      if (!relPromoResult.message.includes("Invalid state transition")) {
        throw new Error(`loser relationship promotion got: ${relPromoResult.message}`);
      }
    });

    await test("no duplicate relationship, one audit event, status promoted", async () => {
      await clientA.query("reset role");
      const rels = await clientA.query(
        "select id::text as id from public.tech_relationships where source_entity_id = $1 and target_entity_id = $2 and relationship_type = 'integrates_with'",
        [relA, relB],
      );
      if (rels.rows.length !== 1) throw new Error(`expected 1 relationship, got ${rels.rows.length}`);
      tracked.relIds.push(rels.rows[0].id);
      const audit = await clientA.query("select count(*)::int as c from public.agent_audit_log where proposal_id = $1", [relProposal]);
      if (audit.rows[0].c !== 1) throw new Error(`expected 1 audit event, got ${audit.rows[0].c}`);
      const p = await clientA.query("select status from public.agent_proposals where id = $1", [relProposal]);
      if (p.rows[0].status !== "promoted") throw new Error("status not promoted");
    });

    // ---- D. Transaction rollback ----------------------------------------
    const rollbackSource = `https://example.com/phase7b-hardening/${runId}/duplicate`;
    tracked.sourceUrls.push(rollbackSource);
    let dupRelProposal = "";

    await test("failed promotion rolls back canonical + evidence + source + audit", async () => {
      await setRole(clientA, "agent_contributor", contributorId);
      const payload = JSON.stringify({ source_entity_id: relA, target_entity_id: relB, relationship_type: "integrates_with" });
      const r = await clientA.query(
        `select public.submit_agent_proposal('suggest_relationship', $1::jsonb, $2, 0.6) as id`,
        [payload, rollbackSource],
      );
      dupRelProposal = r.rows[0].id;
      tracked.proposalIds.push(dupRelProposal);
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await clientA.query(`select public.approve_agent_proposal($1::uuid, 'approved')`, [dupRelProposal]);
      // Fails on the tech_relationships unique constraint after the source
      // insert, proving the whole transaction (including the source) rolls back.
      await expectError(
        clientA,
        `select public.promote_relationship_proposal('${dupRelProposal}'::uuid)`,
        23505,
      );

      await clientA.query("reset role");
      const p = await clientA.query("select status from public.agent_proposals where id = $1", [dupRelProposal]);
      if (p.rows[0].status !== "approved") throw new Error("failed promotion changed status (not atomic)");
      const src = await clientA.query("select count(*)::int as c from public.sources where url = $1", [rollbackSource]);
      if (src.rows[0].c !== 0) throw new Error("orphan source row remains after rollback");
      const ev = await clientA.query("select count(*)::int as c from public.evidence where entity_type = 'tech_relationships' and source_id in (select id from public.sources where url = $1)", [rollbackSource]);
      if (ev.rows[0].c !== 0) throw new Error("orphan evidence remains after rollback");
      const audit = await clientA.query("select count(*)::int as c from public.agent_audit_log where proposal_id = $1", [dupRelProposal]);
      if (audit.rows[0].c !== 0) throw new Error("partial audit record remains after rollback");
    });

    // ---- E. Existing behavior regression --------------------------------
    await test("ordinary authenticated user cannot approve", async () => {
      await setRole(clientA, "authenticated", uuid());
      await expectError(
        clientA,
        `select public.approve_agent_proposal('${uuid()}'::uuid, 'approved')`,
        42501,
      );
    });

    await test("contributor cannot approve", async () => {
      await setRole(clientA, "agent_contributor", contributorId);
      await expectError(
        clientA,
        `select public.approve_agent_proposal('${uuid()}'::uuid, 'approved')`,
        42501,
      );
    });

    await test("rejected proposals cannot be promoted", async () => {
      await setRole(clientA, "agent_contributor", contributorId);
      const payload = JSON.stringify({ name: "Rejected", slug: `phase7b-rej-${runId}`, entity_type: "other" });
      const r = await clientA.query(`select public.submit_agent_proposal('suggest_technology', $1::jsonb, $2, 0.5) as id`, [payload, techSource]);
      tracked.proposalIds.push(r.rows[0].id);
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await clientA.query(`select public.approve_agent_proposal($1::uuid, 'rejected')`, [r.rows[0].id]);
      await expectError(
        clientA,
        `select public.promote_technology_proposal('${r.rows[0].id}'::uuid)`,
        "Invalid state transition",
      );
    });

    await test("pending proposals cannot be promoted", async () => {
      await setRole(clientA, "agent_contributor", contributorId);
      const payload = JSON.stringify({ name: "Pending", slug: `phase7b-pend-${runId}`, entity_type: "other" });
      const r = await clientA.query(`select public.submit_agent_proposal('suggest_technology', $1::jsonb, $2, 0.5) as id`, [payload, techSource]);
      tracked.proposalIds.push(r.rows[0].id);
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await expectError(
        clientA,
        `select public.promote_technology_proposal('${r.rows[0].id}'::uuid)`,
        "Invalid state transition",
      );
    });

    await test("already-promoted proposals cannot be promoted again", async () => {
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await expectError(
        clientA,
        `select public.promote_technology_proposal('${concurrentTechProposal}'::uuid)`,
        "Invalid state transition",
      );
    });

    await test("retail promotion remains disabled", async () => {
      await setRole(clientA, "agent_reviewer", reviewer1Id);
      await expectError(
        clientA,
        `select public.promote_retail_observation('${uuid()}'::uuid)`,
        "Retail pilot disabled",
      );
    });
  } finally {
    // Cleanup (dependency order), running as postgres on both connections.
    try {
      for (const c of [clientA, clientB]) {
        await c.query("reset role");
        await c.query("rollback").catch(() => undefined);
      }
      if (tracked.proposalIds.length) {
        await clientA.query("delete from public.agent_audit_log where proposal_id = any($1::uuid[])", [tracked.proposalIds]);
        await clientA.query("delete from public.agent_proposals where id = any($1::uuid[])", [tracked.proposalIds]);
      }
      if (tracked.relIds.length) {
        await clientA.query("delete from public.evidence where entity_type = 'tech_relationships' and entity_id = any($1::uuid[])", [tracked.relIds]);
        await clientA.query("delete from public.tech_relationships where id = any($1::uuid[])", [tracked.relIds]);
      }
      if (tracked.techIds.length) {
        await clientA.query("delete from public.evidence where tech_entity_id = any($1::uuid[]) or (entity_type = 'technology_entities' and entity_id = any($1::uuid[]))", [tracked.techIds]);
        await clientA.query("delete from public.tech_relationships where source_entity_id = any($1::uuid[]) or target_entity_id = any($1::uuid[])", [tracked.techIds]);
        await clientA.query("delete from public.technology_identifiers where tech_entity_id = any($1::uuid[])", [tracked.techIds]);
        await clientA.query("delete from public.technology_entities where id = any($1::uuid[])", [tracked.techIds]);
      }
      if (tracked.sourceUrls.length) {
        await clientA.query("delete from public.sources where url = any($1::text[])", [tracked.sourceUrls]);
      }
      await clientA.query("delete from public.agent_role_assignments where user_id = any($1::uuid[])", [tracked.userIds]);
      await clientA.query("delete from auth.users where id = any($1::uuid[])", [tracked.userIds]);
      console.log("Cleanup complete (temporary rows removed).");
    } catch (cleanupErr) {
      console.log(`Cleanup warning: ${(cleanupErr as Error).message}`);
    }
    await clientA.end();
    await clientB.end();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
