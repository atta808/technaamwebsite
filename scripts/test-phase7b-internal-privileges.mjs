// Phase 7B live regression test: Batch 2 — internal / RPC-only tables.
//
// Requires migration 20261025060000_phase7b_revoke_internal_table_privileges to
// be applied. Verifies that anon/authenticated have no privileges at all on
// each internal table, that service_role and postgres keep full access, and
// that a service_role write still succeeds inside a rolled-back transaction.
// Read-only except for the rolled-back write, so no data persists.
//
// Run: node scripts/test-phase7b-internal-privileges.mjs

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

const INTERNAL_TABLES = ["affiliate_programs", "change_log", "evidence", "pricing_history", "sources"];
const ALL_PRIVS = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"];
const marker = () => crypto.randomUUID().slice(0, 8);

async function hasPriv(client, role, table, priv) {
  const r = await client.query("SELECT has_table_privilege($1,$2,$3) AS h;", [role, table, priv]);
  return r.rows[0].h === true;
}

async function snapshotTables(client) {
  const r = await client.query(
    `SELECT n.nspname || '.' || c.relname AS t, c.relacl::text AS relacl
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','commercial')
     ORDER BY t;`
  );
  return JSON.stringify(r.rows);
}

async function main() {
  const client = new Client(DB);
  await client.connect();
  const checks = [];
  const record = (name, passed, detail = "") => {
    checks.push({ name, passed });
    console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  };

  try {
    const before = await snapshotTables(client);

    for (const t of INTERNAL_TABLES) {
      const tbl = `public.${t}`;
      for (const role of ["anon", "authenticated"]) {
        const held = [];
        for (const p of ALL_PRIVS) {
          if (await hasPriv(client, role, tbl, p)) held.push(p);
        }
        record(`${t} ${role} has no privileges`, held.length === 0, `held=${held.join(",") || "none"}`);
      }

      const svc = [];
      const pg = [];
      for (const p of ALL_PRIVS) {
        if (!(await hasPriv(client, "service_role", tbl, p))) svc.push(p);
        if (!(await hasPriv(client, "postgres", tbl, p))) pg.push(p);
      }
      record(`${t} service_role full`, svc.length === 0, `missing=${svc.join(",") || "none"}`);
      record(`${t} postgres full`, pg.length === 0, `missing=${pg.join(",") || "none"}`);

      const pub = await client.query(
        `SELECT count(*)::int AS n FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
         WHERE c.oid = $1::regclass AND a.grantee = 0;`,
        [tbl]
      );
      record(`${t} no PUBLIC grants`, pub.rows[0].n === 0, `public entries=${pub.rows[0].n}`);
    }

    // Role membership: no inherited path granting anon/authenticated anything.
    const mem = await client.query(
      `SELECT r.rolname,
              COALESCE((SELECT string_agg(g.rolname, ', ' ORDER BY g.rolname)
                        FROM pg_auth_members am JOIN pg_roles g ON g.oid = am.roleid
                        WHERE am.member = r.oid), '') AS member_of
       FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') ORDER BY 1;`
    );
    for (const row of mem.rows) {
      record(`${row.rolname} has no inherited member_of`, row.member_of === "", row.member_of || "none");
    }

    // Rollback-only service_role write on a representative internal table.
    const m = marker();
    const slug = `regress-src-${m}`;
    let writeOk = false;
    let writeErr = "";
    await client.query("BEGIN;");
    try {
      await client.query("SET LOCAL ROLE service_role;");
      const ins = await client.query(
        `INSERT INTO public.sources (slug, name, url) VALUES ($1, $2, $3) RETURNING id;`,
        [slug, "Regression source", `https://example.com/${slug}`]
      );
      const id = ins.rows[0].id;
      await client.query(`UPDATE public.sources SET name = $1 WHERE id = $2;`, ["Regression source updated", id]);
      const n = await client.query(`SELECT count(*)::int AS n FROM public.sources WHERE id = $1;`, [id]);
      writeOk = n.rows[0].n === 1;
    } catch (e) {
      writeErr = e.message || "";
    } finally {
      await client.query("ROLLBACK;");
    }
    record("service_role sources write succeeds (rolled back)", writeOk, writeErr);

    const residue = await client.query(
      `SELECT count(*)::int AS n FROM public.sources WHERE slug = $1;`,
      [slug]
    );
    record("no test data remains after rollback", residue.rows[0].n === 0, `rows=${residue.rows[0].n}`);

    const after = await snapshotTables(client);
    record("grants outside this batch unchanged", before === after);
  } finally {
    await client.end();
  }

  const failed = checks.filter((c) => !c.passed).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error("TEST RUNNER FAILED:", e && e.message ? e.message : e);
  process.exit(1);
});
