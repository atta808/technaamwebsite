// Phase 7B live regression test: Stage 1 default-privilege hardening.
//
// Requires migration 20261025040000_phase7b_default_privileges_public_tables
// to be applied. Creates a scratch table inside a transaction (rolled back)
// and verifies the default privileges that postgres now applies to new public
// tables: anon/authenticated keep SELECT but lose all write privileges
// (including TRUNCATE); service_role and postgres keep full access.
//
// Run: node scripts/test-phase7b-default-privileges.mjs

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
const WRITE_PRIVS = ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"];

async function hasPriv(client, role, table, priv) {
  const r = await client.query("SELECT has_table_privilege($1, $2, $3) AS h;", [
    role,
    table,
    priv,
  ]);
  return r.rows[0].h === true;
}

async function snapshotTables(client) {
  const r = await client.query(
    `SELECT relname, relacl::text AS relacl, pg_get_userbyid(relowner) AS owner,
            relrowsecurity AS rls
     FROM pg_class
     WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p')
     ORDER BY relname;`
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

    // Role membership: anon/authenticated must have no inherited memberships.
    const mem = await client.query(
      `SELECT r.rolname,
              COALESCE((SELECT string_agg(g.rolname, ', ' ORDER BY g.rolname)
                        FROM pg_auth_members am JOIN pg_roles g ON g.oid = am.roleid
                        WHERE am.member = r.oid), '') AS member_of
       FROM pg_roles r
       WHERE r.rolname IN ('anon','authenticated')
       ORDER BY r.rolname;`
    );
    for (const row of mem.rows) {
      record(`${row.rolname} has no inherited member_of`, row.member_of === "", row.member_of || "none");
    }

    // Transactionally create a scratch table to observe the current defaults.
    const tname = `zz_scratch_dp_${marker()}`;
    const tq = `public.${tname}`;
    await client.query("BEGIN;");
    try {
      await client.query(`CREATE TABLE ${tq} (id integer primary key);`);

      const acl = await client.query(
        `SELECT relacl::text AS a FROM pg_class WHERE oid = $1::regclass;`,
        [tq]
      );
      console.log(`scratch table ACL: ${acl.rows[0].a}`);

      const pub = await client.query(
        `SELECT a.privilege_type
         FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
         WHERE c.oid = $1::regclass AND a.grantee = 0;`,
        [tq]
      );
      record("scratch table has no PUBLIC grants", pub.rows.length === 0, `public entries=${pub.rows.length}`);

      for (const role of ["anon", "authenticated"]) {
        record(`${role} retains SELECT on new table`, (await hasPriv(client, role, tq, "SELECT")) === true);
        for (const p of WRITE_PRIVS) {
          const h = await hasPriv(client, role, tq, p);
          record(`${role} lacks ${p} on new table`, h === false, h ? "still granted" : "");
        }
      }

      for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
        record(`service_role retains ${p} on new table`, (await hasPriv(client, "service_role", tq, p)) === true);
      }
      for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
        record(`postgres retains ${p} on new table`, (await hasPriv(client, "postgres", tq, p)) === true);
      }
    } finally {
      await client.query("ROLLBACK;");
    }

    const gone = await client.query(`SELECT to_regclass($1) IS NULL AS gone;`, [tq]);
    record("scratch table removed after rollback", gone.rows[0].gone === true);

    const after = await snapshotTables(client);
    record("existing table grants unchanged", before === after);
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
