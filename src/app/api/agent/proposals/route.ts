import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authenticateAgent } from "@/lib/agent/auth";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const requestLog = new Map<string, number[]>();

type ProposalType = "suggest_technology" | "suggest_relationship";
type JsonObject = Record<string, unknown>;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function validSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validatePayload(type: ProposalType, payload: unknown): string | null {
  if (!isObject(payload)) return "payload must be an object.";

  if (type === "suggest_technology") {
    if (!isNonEmptyString(payload.name, 160)) return "payload.name is required (max 160 characters).";
    if (!isNonEmptyString(payload.slug, 160) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) {
      return "payload.slug must be a lowercase URL-safe slug.";
    }
    if (!["product", "hardware", "os", "mobile", "other"].includes(String(payload.entity_type))) {
      return "payload.entity_type is invalid.";
    }
    if (payload.identifiers !== undefined) {
      if (!Array.isArray(payload.identifiers) || payload.identifiers.length > 50) {
        return "payload.identifiers must be an array of at most 50 items.";
      }
      for (const identifier of payload.identifiers) {
        if (!isObject(identifier) || !isNonEmptyString(identifier.type, 80) ||
            !isNonEmptyString(identifier.value, 300)) {
          return "Each identifier requires a non-empty type and value.";
        }
      }
    }
    return null;
  }

  if (!isNonEmptyString(payload.source_entity_id, 36) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.source_entity_id)) {
    return "payload.source_entity_id must be a UUID.";
  }
  if (!isNonEmptyString(payload.target_entity_id, 36) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.target_entity_id)) {
    return "payload.target_entity_id must be a UUID.";
  }
  if (payload.source_entity_id === payload.target_entity_id) {
    return "A relationship cannot connect an entity to itself.";
  }
  const relationships = [
    "runs_on", "requires", "compatible_with", "incompatible_with", "depends_on",
    "integrates_with", "alternative_to", "replaces", "uses_model", "requires_hardware",
    "powered_by", "contains",
  ];
  if (!relationships.includes(String(payload.relationship_type))) return "payload.relationship_type is invalid.";
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const clientKey = `${auth.userId}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
  if (rateLimited(clientKey)) return jsonError("Rate limit exceeded. Try again shortly.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }
  if (!isObject(body)) return jsonError("Request body must be a JSON object.", 400);

  const type = body.type;
  if (type === "suggest_retail_observation") {
    return jsonError("Retail observations are disabled for this pilot.", 403);
  }
  if (type !== "suggest_technology" && type !== "suggest_relationship") {
    return jsonError("type must be suggest_technology or suggest_relationship.", 400);
  }
  const payloadError = validatePayload(type, body.payload);
  if (payloadError) return jsonError(payloadError, 400);
  if (!validSourceUrl(body.source_url)) {
    return jsonError("source_url must be a valid HTTPS URL without embedded credentials.", 400);
  }
  if (typeof body.confidence !== "number" || !Number.isFinite(body.confidence) ||
      body.confidence < 0 || body.confidence > 1) {
    return jsonError("confidence must be a number between 0 and 1.", 400);
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return jsonError("Proposal service is not configured.", 503);

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${auth.token}` } },
  });

  // Best-effort idempotency: identical pending payloads from the same agent return
  // the existing proposal. The database schema has no unique fingerprint constraint,
  // so this read-before-write check is not atomic under concurrent requests.
  const { data: pending, error: lookupError } = await client
    .from("agent_proposals")
    .select("id,payload,source_url,confidence")
    .eq("agent_id", auth.userId)
    .eq("proposal_type", type)
    .eq("status", "pending_review")
    .limit(100);

  if (lookupError) {
    return jsonError("Unable to check for duplicate proposals.", 502);
  }

  const fingerprint = stable({
    type,
    payload: body.payload,
    source_url: body.source_url.trim(),
    confidence: body.confidence,
  });
  const duplicate = (pending ?? []).find((item) => stable({
    type,
    payload: item.payload,
    source_url: item.source_url,
    confidence: Number(item.confidence),
  }) === fingerprint);
  if (duplicate) {
    return NextResponse.json({ id: duplicate.id, status: "pending_review", duplicate: true }, { status: 200 });
  }

  const { data, error } = await client.rpc("submit_agent_proposal", {
    p_type: type,
    p_payload: body.payload,
    p_source: body.source_url.trim(),
    p_confidence: body.confidence,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("unauthorized")) return jsonError("Agent contributor role required.", 403);
    if (message.includes("retail pilot disabled")) return jsonError("Retail observations are disabled.", 403);
    if (message.includes("invalid") || message.includes("required")) return jsonError("Proposal rejected by governance validation.", 400);
    return jsonError("Unable to submit proposal.", 502);
  }

  return NextResponse.json({ id: data, status: "pending_review", duplicate: false }, { status: 201 });
}

export async function GET() {
  return jsonError("Method not allowed.", 405);
}
