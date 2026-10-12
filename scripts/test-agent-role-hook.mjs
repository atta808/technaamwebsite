import { readFile } from "node:fs/promises";

const migration = await readFile(
  "supabase/migrations/20261012090000_phase7b_agent_role_hook.sql",
  "utf8",
);
const functionSql = migration.match(
  /CREATE FUNCTION public\.custom_access_token_hook\(event jsonb\)([\s\S]*?)\$function\$;/i,
)?.[1] ?? "";

const checks = [
  [
    "assignment is bound to a Supabase Auth user and cascades on deletion",
    /user_id uuid PRIMARY KEY REFERENCES auth\.users \(id\) ON DELETE CASCADE/i.test(migration),
  ],
  [
    "only contributor and reviewer roles are assignable",
    /CHECK \(role IN \('agent_contributor', 'agent_reviewer'\)\)/i.test(migration),
  ],
  [
    "a new assignment is inactive until explicitly activated",
    /is_active boolean NOT NULL DEFAULT false/i.test(migration),
  ],
  [
    "allowlist has row-level security enabled",
    /ALTER TABLE public\.agent_role_assignments ENABLE ROW LEVEL SECURITY/i.test(migration),
  ],
  [
    "hook only considers active allowlisted users",
    /WHERE assignment\.user_id = subject_id\s+AND assignment\.is_active = true/i.test(functionSql),
  ],
  [
    "unassigned users keep their original Supabase role claim",
    /IF assigned_role IS NOT NULL THEN\s+claims := jsonb_set\(claims, '\{role\}', to_jsonb\(assigned_role\), true\);\s+END IF;/i.test(functionSql),
  ],
  [
    "hook returns the claims payload required by Supabase Auth",
    /RETURN jsonb_build_object\('claims', claims\)/i.test(functionSql),
  ],
  [
    "hook does not run as SECURITY DEFINER",
    !/SECURITY DEFINER/i.test(functionSql),
  ],
  [
    "supabase_auth_admin receives assignment-table SELECT through a specific RLS policy",
    /GRANT SELECT ON TABLE public\.agent_role_assignments TO supabase_auth_admin/i.test(migration) &&
      /CREATE POLICY "supabase_auth_admin can read agent role assignments"[\s\S]*?FOR SELECT\s+TO supabase_auth_admin\s+USING \(true\)/i.test(migration),
  ],
  [
    "client roles are revoked and hook execution is explicitly granted to supabase_auth_admin",
    /GRANT EXECUTE ON FUNCTION public\.custom_access_token_hook\(jsonb\)\s+TO supabase_auth_admin/i.test(migration) &&
      /REVOKE ALL PRIVILEGES ON FUNCTION public\.custom_access_token_hook\(jsonb\)\s+FROM PUBLIC, anon, authenticated, service_role,\s+agent_contributor, agent_reviewer/i.test(migration),
  ],
  [
    "hook validates incoming user id and claims object",
    /jsonb_typeof\(claims\) IS DISTINCT FROM 'object'/i.test(functionSql) &&
      /subject_id := \(event ->> 'user_id'\)::uuid/i.test(functionSql),
  ],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} role-hook contract checks passed.`);
if (failed) process.exitCode = 1;
