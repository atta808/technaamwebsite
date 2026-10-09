import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/agent/proposals/route";

process.env.SUPABASE_JWT_SECRET = "phase7b-test-secret-not-for-production";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";

function token(claimOverrides: Record<string, unknown> = {}, secret = process.env.SUPABASE_JWT_SECRET!) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const claims = encode({
    sub: "123e4567-e89b-42d3-a456-426614174000",
    role: "agent_contributor",
    iss: "https://example.supabase.co/auth/v1",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claimOverrides,
  });
  const signature = createHmac("sha256", secret).update(`${header}.${claims}`).digest("base64url");
  return `${header}.${claims}.${signature}`;
}

function request(body: unknown, bearer = token()) {
  return new NextRequest("http://localhost/api/agent/proposals", {
    method: "POST",
    headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  proposal_type: "suggest_technology",
  payload: { name: "Example Tool", slug: "example-tool", entity_type: "product" },
  source_url: "https://vendor.example/products/tool",
  confidence: 0.9,
};

async function main() {
  const originalFetch = globalThis.fetch;
  let rpcCalls = 0;
  let duplicateRows: unknown[] = [];
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/rest/v1/agent_proposals?")) {
      return new Response(JSON.stringify(duplicateRows), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/rest/v1/rpc/submit_agent_proposal")) {
      rpcCalls += 1;
      return new Response(JSON.stringify("223e4567-e89b-42d3-a456-426614174000"), { status: 200 });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const results: string[] = [];
  try {
    let response = await POST(new NextRequest("http://localhost/api/agent/proposals", { method: "POST", body: JSON.stringify(validBody) }));
    assert.equal(response.status, 401);
    results.push("rejects missing bearer token");

    response = await POST(request(validBody, token({ role: "authenticated" })));
    assert.equal(response.status, 403);
    results.push("rejects non-contributor role");

    response = await POST(request(validBody, token({}, "wrong-signing-secret")));
    assert.equal(response.status, 401);
    results.push("rejects invalid JWT signature");

    response = await POST(request(validBody, token({ exp: Math.floor(Date.now() / 1000) - 60 })));
    assert.equal(response.status, 401);
    results.push("rejects expired JWT");

    response = await POST(request({ ...validBody, proposal_type: "suggest_retail_observation" }));
    assert.equal(response.status, 400);
    results.push("keeps retail observations disabled");

    response = await POST(request({ ...validBody, source_url: "javascript:alert(1)" }));
    assert.equal(response.status, 400);
    results.push("rejects unsafe source URL schemes");

    response = await POST(request({ ...validBody, confidence: 2 }));
    assert.equal(response.status, 400);
    results.push("rejects out-of-range confidence");

    response = await POST(request({ ...validBody, payload: { ...validBody.payload, slug: "Not A Slug" } }));
    assert.equal(response.status, 400);
    results.push("validates technology payload");

    response = await POST(request({
      proposal_type: "suggest_relationship",
      payload: {
        source_entity_id: "123e4567-e89b-42d3-a456-426614174000",
        target_entity_id: "123e4567-e89b-42d3-a456-426614174000",
        relationship_type: "compatible_with",
      },
      source_url: validBody.source_url,
      confidence: 0.9,
    }));
    assert.equal(response.status, 400);
    results.push("rejects self-referential relationship");

    response = await POST(request(validBody));
    assert.equal(response.status, 201);
    assert.equal(rpcCalls, 1);
    results.push("submits valid proposal through the RPC boundary");

    duplicateRows = [{
      payload: validBody.payload,
      source_url: validBody.source_url,
      confidence: validBody.confidence,
      proposal_type: validBody.proposal_type,
    }];
    response = await POST(request(validBody));
    assert.equal(response.status, 409);
    assert.equal(rpcCalls, 1);
    results.push("rejects an identical pending proposal");

    console.log(`PASS: ${results.length} agent API checks`);
    for (const result of results) console.log(`  ✓ ${result}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
