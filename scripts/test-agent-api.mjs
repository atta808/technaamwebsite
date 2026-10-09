import assert from "node:assert/strict";
import { validateProposalRequest, stableStringify, proposalFingerprint } from "../src/lib/agent/validation.ts";

const technology = {
  proposal_type: "suggest_technology",
  payload: {
    name: "Example Tool",
    slug: "example-tool",
    entity_type: "product",
    identifiers: [{ type: "vendor_sku", value: "EX-1" }],
  },
  source_url: "https://example.com/products/example-tool",
  confidence: 0.92,
};
const relationship = {
  proposal_type: "suggest_relationship",
  payload: {
    source_entity_id: "123e4567-e89b-42d3-a456-426614174000",
    target_entity_id: "123e4567-e89b-42d3-a456-426614174001",
    relationship_type: "integrates_with",
  },
  source_url: "https://example.com/docs/integration",
  confidence: 0.8,
};

const tests = [
  ["accepts valid technology proposal", () => assert.equal(validateProposalRequest(technology).ok, true)],
  ["accepts valid relationship proposal", () => assert.equal(validateProposalRequest(relationship).ok, true)],
  ["rejects non-object body", () => assert.equal(validateProposalRequest(null).ok, false)],
  ["rejects retail observations", () => assert.equal(validateProposalRequest({ ...technology, proposal_type: "suggest_retail_observation" }).ok, false)],
  ["rejects unsupported proposal type", () => assert.equal(validateProposalRequest({ ...technology, proposal_type: "delete_everything" }).ok, false)],
  ["rejects malformed source URL", () => assert.equal(validateProposalRequest({ ...technology, source_url: "javascript:alert(1)" }).ok, false)],
  ["rejects URL credentials", () => assert.equal(validateProposalRequest({ ...technology, source_url: "https://user:pass@example.com/x" }).ok, false)],
  ["rejects confidence outside range", () => assert.equal(validateProposalRequest({ ...technology, confidence: 1.01 }).ok, false)],
  ["rejects non-numeric confidence", () => assert.equal(validateProposalRequest({ ...technology, confidence: "0.9" }).ok, false)],
  ["rejects invalid slug", () => assert.equal(validateProposalRequest({ ...technology, payload: { ...technology.payload, slug: "Not A Slug" } }).ok, false)],
  ["rejects invalid entity type", () => assert.equal(validateProposalRequest({ ...technology, payload: { ...technology.payload, entity_type: "secret" } }).ok, false)],
  ["rejects malformed identifiers", () => assert.equal(validateProposalRequest({ ...technology, payload: { ...technology.payload, identifiers: [{ type: "", value: "x" }] } }).ok, false)],
  ["rejects too many identifiers", () => assert.equal(validateProposalRequest({ ...technology, payload: { ...technology.payload, identifiers: Array.from({ length: 51 }, () => ({ type: "sku", value: "x" })) } }).ok, false)],
  ["rejects malformed relationship UUID", () => assert.equal(validateProposalRequest({ ...relationship, payload: { ...relationship.payload, source_entity_id: "not-a-uuid" } }).ok, false)],
  ["rejects unsupported relationship type", () => assert.equal(validateProposalRequest({ ...relationship, payload: { ...relationship.payload, relationship_type: "owns" } }).ok, false)],
  ["rejects self-relationship", () => assert.equal(validateProposalRequest({ ...relationship, payload: { ...relationship.payload, target_entity_id: relationship.payload.source_entity_id } }).ok, false)],
  ["stable stringify ignores object key order", () => assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }))],
  ["fingerprint is deterministic", async () => assert.equal(await proposalFingerprint(technology), await proposalFingerprint(technology))],
  ["fingerprint changes when payload changes", async () => assert.notEqual(await proposalFingerprint(technology), await proposalFingerprint({ ...technology, payload: { ...technology.payload, name: "Different" } }))],
];

let failed = 0;
for (const [name, run] of tests) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`, error);
  }
}
console.log(`\nAgent API validation tests: ${tests.length - failed}/${tests.length} passed`);
if (failed) process.exitCode = 1;
