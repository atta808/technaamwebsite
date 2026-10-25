// Phase 7B live regression test: public.tech_categories lockdown.
//
// Requires migration 20261025030000_phase7b_internalize_tech_categories to be
// applied. Every write is performed inside a transaction that is rolled back,
// so no persistent data is left behind.
//
// Run: node scripts/test-phase7b-tech-categories.mjs

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

const TABLE = "public.tech_categories";
const marker = () => crypto.randomUUID().slice(0, 8);

async function hasPriv(client, role, priv) {
  const r = await client.query("SELECT has_table_privilege($1, $2, $3) AS h;", [
    role,
    TABLE,
    priv,
  ]);
  return r.rows[0].h === true;
}

// Attempt a statement as the given role inside a transaction that is always
// rolled back. Returns whether the statement was denied for privilege reasons.
async function expectDenied(client, role, sql) {
  await client.query("BEGIN;");
  let denied = false;
  let message = "";
  try {
    await client.query(`SET LOCAL ROLE ${role};`);
    try {
      await client.query(sql);
    } catch (e) {
      message = e.message || "";
      denied = /permission denied|insufficient privilege|must be owner/i.test(message);
    }
  } finally {
    await client.query("ROLLBACK;");
  }
  return { denied, message };
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
    // 1. RLS enabled
    const rls = await client.query(
      `SELECT relrowsecurity AS rls FROM pg_class WHERE oid = $1::regclass;`,
      [TABLE]
    );
    record("RLS is enabled", rls.rows[0].rls === true);

    // 2. PUBLIC grants (no grantee 0 entries)
    const pub = await client.query(
      `SELECT a.grantee, pg_get_userbyid(a.grantee) AS name, a.privilege_type
       FROM pg_class c
       CROSS JOIN LATERAL aclexplode(c.relacl) a
       WHERE c.oid = $1::regclass AND a.grantee = 0
       ORDER BY a.privilege_type;`,
      [TABLE]
    );
    record("no PUBLIC grants on table", pub.rows.length === 0, `public entries=${pub.rows.length}`);

    // 3. anon/authenticated effective privileges (has_table_privilege includes
    //    inherited and PUBLIC privileges)
    for (const role of ["anon", "authenticated"]) {
      for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
        const held = await hasPriv(client, role, priv);
        record(`${role} lacks ${priv}`, held === false, held ? "still granted" : "");
      }
    }

    // 4. service_role retains intended access
    for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
      const held = await hasPriv(client, "service_role", priv);
      record(`service_role retains ${priv}`, held === true, held ? "" : "missing");
    }

    // 5. postgres administrative access preserved
    for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
      const held = await hasPriv(client, "postgres", priv);
      record(`postgres retains ${priv}`, held === true, held ? "" : "missing");
    }

    // 6. Unauthorized direct operations fail
    const deniedTests = [
      ["anon SELECT", "anon", `SELECT * FROM ${TABLE};`],
      ["anon INSERT", "anon", `INSERT INTO ${TABLE} (name, slug) VALUES ('x', 'x');`],
      ["anon UPDATE", "anon", `UPDATE ${TABLE} SET name = 'x' WHERE slug = 'x';`],
      ["anon DELETE", "anon", `DELETE FROM ${TABLE} WHERE slug = 'x';`],
      ["anon TRUNCATE", "anon", `TRUNCATE ${TABLE};`],
      ["authenticated INSERT", "authenticated", `INSERT INTO ${TABLE} (name, slug) VALUES ('x', 'x');`],
      ["authenticated TRUNCATE", "authenticated", `TRUNCATE ${TABLE};`],
    ];
    for (const [name, role, sql] of deniedTests) {
      const r = await expectDenied(client, role, sql);
      record(name, r.denied, r.denied ? "" : r.message);
    }

    // 7. Authorized service_role insert/update inside a rolled-back transaction
    const m = marker();
    const slug = `regress-cat-${m}`;
    let writeOk = false;
    let writeErr = "";
    await client.query("BEGIN;");
    try {
      await client.query("SET LOCAL ROLE service_role;");
      const ins = await client.query(
        `INSERT INTO ${TABLE} (name, slug) VALUES ($1, $2) RETURNING id;`,
        [`Regression category ${m}`, slug]
      );
      const id = ins.rows[0].id;
      await client.query(`UPDATE ${TABLE} SET name = $1 WHERE id = $2;`, [
        `Regression category updated ${m}`,
        id,
      ]);
      const n = await client.query(
        `SELECT count(*)::int AS n FROM ${TABLE} WHERE id = $1;`,
        [id]
      );
      writeOk = n.rows[0].n === 1;
    } catch (e) {
      writeErr = e.message || "";
    } finally {
      await client.query("ROLLBACK;");
    }
    record("service_role insert/update succeeds (rolled back)", writeOk, writeErr);

    // 8. No test data remains after rollback
    const residue = await client.query(
      `SELECT count(*)::int AS n FROM ${TABLE} WHERE slug = $1;`,
      [slug]
    );
    record("no test data remains after rollback", residue.rows[0].n === 0, `rows=${residue.rows[0].n}`);
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
