import pg from 'pg';
// import 'dotenv/config';

const DB_URL = process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function runTests() {
  console.log("Starting REAL POSTGRESQL ROLE/RLS INTEGRATION TEST for Phase 7 Governance...\n");
  const results = [];
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      results.push(false);
    } else {
      console.log(`✅ PASSED: ${message}`);
      results.push(true);
    }
  }

  const client = new pg.Client({ connectionString: DB_URL });

  try {
      await client.connect();
  } catch(e) {
      console.log("⚠️ Database unreachable in sandbox environment. Phase 7A requires REAL database verification to pass.");
      console.log("NOT VERIFIED");
      process.exit(1);
  }

  try {
      // Setup mock environments via set_config
      const setContributor = async () => {
          await client.query("set role authenticator");
          await client.query("set request.jwt.claims to '{\"role\": \"agent_contributor\"}'");
          await client.query("set role agent_contributor");
      };

      const setReviewer = async () => {
          await client.query("set role authenticator");
          await client.query("set request.jwt.claims to '{\"role\": \"agent_reviewer\"}'");
          await client.query("set role agent_reviewer");
      };

      const setAnon = async () => {
          await client.query("set role authenticator");
          await client.query("set request.jwt.claims to '{\"role\": \"anon\"}'");
          await client.query("set role anon");
      };

      const setAuthenticated = async () => {
          await client.query("set role authenticator");
          await client.query("set request.jwt.claims to '{\"role\": \"authenticated\"}'");
          await client.query("set role authenticated");
      };

      const expectAuthError = async (fn, errorMessage) => {
          try {
              await fn();
              assert(false, errorMessage + " (Expected auth error, got success)");
          } catch (e) {
              const msg = e.message || "";
              const code = e.code || "";
              // 42501 is PG code for insufficient_privilege.
              // 'Unauthorized' is our explicit RAISE EXCEPTION for JWT role mismatches.
              if (code === '42501' || msg.includes("permission denied") || msg.includes("Unauthorized")) {
                  assert(true, errorMessage);
              } else {
                  assert(false, errorMessage + ` (Expected auth error, got business error: ${msg})`);
              }
          }
      };

      const expectDomainError = async (fn, expectedMsg, testMessage) => {
          try {
              await fn();
              assert(false, testMessage + " (Expected error, got success)");
          } catch (e) {
              const msg = e.message || "";
              if (msg.includes(expectedMsg)) {
                  assert(true, testMessage);
              } else {
                  assert(false, testMessage + ` (Expected error containing '${expectedMsg}', got: ${msg})`);
              }
          }
      };

      // ---------------------------------------------------------
      // AUTHENTICATION & DIRECT WRITE TESTS
      // ---------------------------------------------------------
      await setContributor();
      await expectAuthError(() => client.query("SELECT public.promote_technology_proposal('00000000-0000-0000-0000-000000000000')"), "contributor cannot execute promotion RPC");
      await expectAuthError(() => client.query("SELECT public.approve_agent_proposal('00000000-0000-0000-0000-000000000000', 'approved')"), "contributor cannot approve");

      await expectAuthError(() => client.query("INSERT INTO public.technology_entities (entity_type, slug, name) VALUES ('product', 'test', 'Test')"), "contributor cannot direct-write technology_entities");
      await expectAuthError(() => client.query("INSERT INTO public.tech_relationships (source_entity_id, target_entity_id, relationship_type) VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'runs_on')"), "contributor cannot direct-write tech_relationships");
      await expectAuthError(() => client.query("INSERT INTO public.evidence (entity_type, entity_id, source_id) VALUES ('product', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')"), "contributor cannot direct-write evidence");

      // Contributor cannot manually insert agent_proposals with fake statuses
      await expectAuthError(() => client.query("INSERT INTO public.agent_proposals (agent_id, proposal_type, status, payload, source_url, confidence) VALUES ('00000000-0000-0000-0000-000000000000', 'suggest_technology', 'approved', '{}', 'url', 1)"), "contributor cannot directly insert status='approved'");
      await expectAuthError(() => client.query("INSERT INTO public.agent_proposals (agent_id, proposal_type, status, payload, source_url, confidence) VALUES ('00000000-0000-0000-0000-000000000000', 'suggest_technology', 'promoted', '{}', 'url', 1)"), "contributor cannot directly insert status='promoted'");

      await expectAuthError(() => client.query("SELECT * FROM affiliate_programs"), "affiliate_programs inaccessible (contributor)");

      await setReviewer();
      await expectAuthError(() => client.query("INSERT INTO public.technology_entities (entity_type, slug, name) VALUES ('product', 'test', 'Test')"), "reviewer cannot direct-write canonical tables");
      await expectAuthError(() => client.query("SELECT * FROM affiliate_programs"), "affiliate_programs inaccessible (reviewer)");

      await setAnon();
      await expectAuthError(() => client.query("SELECT public.promote_technology_proposal('00000000-0000-0000-0000-000000000000')"), "anon cannot execute governance RPCs");

      await setAuthenticated();
      await expectAuthError(() => client.query("SELECT public.promote_technology_proposal('00000000-0000-0000-0000-000000000000')"), "authenticated cannot execute governance RPCs");

      // ---------------------------------------------------------
      // DOMAIN VALIDATION TESTS
      // ---------------------------------------------------------
      // Because we want to test RPC failures due to missing data/invalid payloads, we must
      // actually submit -> approve -> promote. However, since the database is entirely missing in CI,
      // the script will exit(1) gracefully before this executes.
      // For thoroughness, we map out the logical expectations if the script is run locally against a live DB:

      // 1. Invalid payload structure during promotion
      await setReviewer();
      await expectDomainError(() => client.query("SELECT public.approve_agent_proposal('00000000-0000-0000-0000-000000000000', 'approved')"), "Proposal not found", "reviewer executing approve missing proposal throws business error (not auth)");
      await expectDomainError(() => client.query("SELECT public.promote_technology_proposal('00000000-0000-0000-0000-000000000000')"), "Proposal not found", "reviewer executing promote missing proposal throws business error (not auth)");
      await expectDomainError(() => client.query("SELECT public.promote_retail_observation('00000000-0000-0000-0000-000000000000')"), "Retail pilot disabled", "retail promotion remains disabled");

  } finally {
      await client.end();
  }

  console.log(`\nTests completed. Passed: ${results.filter(Boolean).length}/${results.length}`);
  if (results.some(r => !r)) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
