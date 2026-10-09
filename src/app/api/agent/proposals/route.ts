import { NextRequest, NextResponse } from "next/server";
import { verifyAgentToken } from "@/lib/agent/auth";
import type { ProposalType, SuggestRelationshipPayload, SuggestTechnologyPayload } from "@/lib/agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 24 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

const RELATIONSHIP_TYPES = new Set([
  "runs_on", "requires", "compatible_with", "incompatible_with", "depends_on",
  "integrates_with", "alternative_to", "replaces", "uses_model",
  "requires_hardware", "powered_by", "contains",
]);
const ENTITY_TYPES = new Set(["product", "hardware", "os", "mobile", "other"]);
const IDENTIFIER_TYPES = new Set([
  "slug", "vendor_id", "model_number", "package_name", "domain", "url", "other",
]);

type Input = {
  proposal_type: ProposalType;
  payload: SuggestTechnologyPayload | SuggestRelationshipPayload;
  source_url: string;
  confidence: number;
};

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

function validateInput(value: unknown): { input?: Input; error?: string } {
  if (!isRecord(value)) return { error: "Request body must be a JSON object" };
  const proposalType = value.proposal_type;
  if (proposalType === "suggest_retail_observation") {
    return { error: "Retail observations are disabled for this pilot" };
  }
  if (proposalType !== "suggest_technology" && proposalType !== "suggest_relationship") {
    return { error: "Unsupported proposal_type" };
  }
  if (!isRecord(value.payload)) return { error: "payload must be an object" };
  if (!validSourceUrl(value.source_url)) return { error: "source_url must be a valid HTTP(S) URL without credentials" };
  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    return { error: "confidence must be a number between 0 and 1" };
  }

  const payload = value.payload;
  if (proposalType === "suggest_technology") {
    const name = payload.name;
    const slug = payload.slug;
    const entityType = payload.entity_type;
    if (typeof name !== "string" || !name.trim() || name.length > 160) return { error: "payload.name must be 1–160 characters" };
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) return { error: "payload.slug must be a lowercase URL slug" };
    if (typeof entityType !== "string" || !ENTITY_TYPES.has(entityType)) return { error: "payload.entity_type is invalid" };
    if (payload.identifiers !== undefined) {
      if (!Array.isArray(payload.identifiers) || payload.identifiers.length > 25) return { error: "payload.identifiers must contain at most 25 items" };
      for (const item of payload.identifiers) {
        if (!isRecord(item) || typeof item.type !== "string" || !IDENTIFIER_TYPES.has(item.type) ||
          typeof item.value !== "string" || !item.value.trim() || item.value.length > 512) {
          return { error: "Each identifier needs an allowed type and a non-empty value of at most 512 characters" };
        }
      }
    }
  } else {
    for (const key of ["source_entity_id", "target_entity_id"]) {
      if (typeof payload[key] !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload[key] as string)) {
        return { error: `payload.${key} must be a UUID` };
      }
    }
    if (payload.source_entity_id === payload.target_entity_id) return { error: "A relationship cannot connect an entity to itself" };
    if (typeof payload.relationship_type !== "string" || !RELATIONSHIP_TYPES.has(payload.relationship_type)) {
      return { error: "payload.relationship_type is invalid" };
    }
  }

  return {
    input: {
      proposal_type: proposalType,
      payload: payload as unknown as SuggestTechnologyPayload | SuggestRelationshipPayload,
      source_url: value.source_url,
      confidence: value.confidence,
    },
  };
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

function fingerprint(input: Input): string {
  // Stable key ordering avoids differences caused only by JSON property order.
  const stablePayload = Object.fromEntries(Object.entries(input.payload).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({
    proposal_type: input.proposal_type,
    payload: stablePayload,
    source_url: input.source_url,
    confidence: input.confidence,
  });
}

export async function POST(request: NextRequest) {
  const auth = verifyAgentToken(request.headers.get("authorization"));
  if (!auth.ok) return jsonError(auth.status, auth.error);

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`${auth.claims.sub}:${clientIp}`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY_BYTES) return jsonError(413, "Request body is too large");

  let raw: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return jsonError(413, "Request body is too large");
    raw = JSON.parse(text);
  } catch {
    return jsonError(400, "Request body must be valid JSON");
  }

  const validation = validateInput(raw);
  if (!validation.input) return jsonError(400, validation.error || "Invalid request");
  const input = validation.input;

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return jsonError(503, "Supabase API is not configured");

  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${request.headers.get("authorization")!.slice(7).trim()}`,
    Accept: "application/json",
  };

  try {
    // Fail closed if the duplicate lookup cannot be completed.
    const duplicateUrl = new URL(`${baseUrl}/rest/v1/agent_proposals`);
    duplicateUrl.searchParams.set("select", "payload,source_url,confidence,proposal_type");
    duplicateUrl.searchParams.set("agent_id", `eq.${auth.claims.sub}`);
    duplicateUrl.searchParams.set("status", "eq.pending_review");
    duplicateUrl.searchParams.set("proposal_type", `eq.${input.proposal_type}`);
    const duplicateResponse = await fetch(duplicateUrl, { headers, cache: "no-store" });
    if (!duplicateResponse.ok) {
      return jsonError(502, "Could not verify duplicate proposals; request was not submitted");
    }
    const pending = await duplicateResponse.json() as Array<{
      payload: Record<string, unknown>;
      source_url: string;
      confidence: number;
      proposal_type: string;
    }>;
    const proposedFingerprint = fingerprint(input);
    const duplicate = pending.some((row) => fingerprint({
      proposal_type: row.proposal_type as ProposalType,
      payload: row.payload as SuggestTechnologyPayload | SuggestRelationshipPayload,
      source_url: row.source_url,
      confidence: Number(row.confidence),
    }) === proposedFingerprint);
    if (duplicate) return NextResponse.json({ error: "An identical pending proposal already exists" }, { status: 409 });

    const response = await fetch(`${baseUrl}/rest/v1/rpc/submit_agent_proposal`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_type: input.proposal_type,
        p_payload: input.payload,
        p_source: input.source_url,
        p_confidence: input.confidence,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401 || response.status === 403) return jsonError(403, "The database rejected this agent role");
      console.error("submit_agent_proposal RPC failed", response.status, body.slice(0, 500));
      return jsonError(502, "Proposal submission failed at the database boundary");
    }
    const proposalId = await response.json();
    return NextResponse.json(
      { proposal_id: proposalId, status: "pending_review" },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Agent proposal API failed", error);
    return jsonError(502, "Proposal service is temporarily unavailable");
  }
}
