import { NextResponse, type NextRequest } from "next/server";
import { verifyAgentContributorToken } from "@/lib/agent/auth";
import { proposalFingerprint, validateProposalRequest } from "@/lib/agent/validation";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map<string, number[]>();
const MAX_BODY_BYTES = 32_768;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(key, recent);

  // Keep this best-effort, process-local limiter from growing forever.
  if (requestLog.size > 10_000) {
    for (const [entryKey, timestamps] of requestLog) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) requestLog.delete(entryKey);
    }
  }
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function supabaseHeaders(accessToken: string, anonKey: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Agent API is not configured." }, { status: 503 });
  }

  let principal;
  try {
    principal = await verifyAgentContributorToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Agent API authentication is temporarily unavailable." }, { status: 503 });
  }
  if (!principal) {
    return NextResponse.json({ error: "A valid agent_contributor bearer token is required." }, { status: 401 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateLimitKey = `${principal.userId}:${forwardedFor || "unknown"}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: "Too many requests." }, {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawSize = new TextEncoder().encode(JSON.stringify(body)).length;
  if (rawSize > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  const parsed = validateProposalRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { value } = parsed;
  const headers = supabaseHeaders(principal.accessToken, anonKey);

  try {
    // Best-effort duplicate detection among this contributor's pending proposals.
    // This is not atomic: the Phase 7A schema has no fingerprint/unique constraint.
    const pendingUrl = new URL("/rest/v1/agent_proposals", supabaseUrl);
    pendingUrl.searchParams.set("select", "id,proposal_type,payload,source_url,confidence,status");
    pendingUrl.searchParams.set("agent_id", `eq.${principal.userId}`);
    pendingUrl.searchParams.set("status", "eq.pending_review");
    pendingUrl.searchParams.set("order", "created_at.desc");
    pendingUrl.searchParams.set("limit", "1000");

    const pendingResponse = await fetch(pendingUrl, { method: "GET", headers, cache: "no-store" });
    if (!pendingResponse.ok) {
      return NextResponse.json({ error: "Unable to check existing proposals." }, { status: 502 });
    }
    const pendingRows = await pendingResponse.json() as Array<{
      id: string; proposal_type: string; payload: unknown; source_url: string;
      confidence: number; status: string;
    }>;
    const fingerprint = await proposalFingerprint(value);
    for (const row of pendingRows) {
      if (row.status !== "pending_review") continue;
      const existingFingerprint = await proposalFingerprint({
        proposal_type: row.proposal_type,
        payload: row.payload,
        source_url: row.source_url,
        confidence: Number(row.confidence),
      });
      if (existingFingerprint === fingerprint) {
        return NextResponse.json({
          error: "An identical proposal is already pending review.",
          code: "duplicate_pending_proposal",
          proposal_id: row.id,
        }, { status: 409 });
      }
    }

    const submitResponse = await fetch(new URL("/rest/v1/rpc/submit_agent_proposal", supabaseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_type: value.proposal_type,
        p_payload: value.payload,
        p_source: value.source_url,
        p_confidence: value.confidence,
      }),
      cache: "no-store",
    });

    if (!submitResponse.ok) {
      const detail = await submitResponse.text();
      if (submitResponse.status === 401 || submitResponse.status === 403) {
        return NextResponse.json({ error: "The database rejected this agent role." }, { status: 403 });
      }
      console.error("Agent proposal RPC failed", { status: submitResponse.status, detail: detail.slice(0, 500) });
      return NextResponse.json({ error: "Unable to submit proposal." }, { status: 502 });
    }

    const proposalId = await submitResponse.json() as string;
    if (typeof proposalId !== "string") {
      return NextResponse.json({ error: "Unexpected response from proposal service." }, { status: 502 });
    }

    return NextResponse.json({
      proposal_id: proposalId,
      status: "pending_review",
      proposal_type: value.proposal_type,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Agent proposal service is temporarily unavailable." }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
