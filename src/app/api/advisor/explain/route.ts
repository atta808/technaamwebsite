import { NextResponse, type NextRequest } from "next/server";
import { buildRecommendations } from "@/lib/advisor";
import { parseAdvisorInput } from "@/lib/advisor/request";
import { getAdvisorCatalog } from "@/lib/queries/advisor-catalog";
import { buildSanitizedContext } from "@/lib/ai/context";
import { deepseekProvider } from "@/lib/ai/deepseek";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
  }

  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(clientKey)) {
    // Return graceful unavailable instead of failing the whole component via 429
    return NextResponse.json({ status: "unavailable" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 1. Strict Server-side Validation of Input
  const parsed = parseAdvisorInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.errors }, { status: 400 });
  }

  try {
    // 2. Recompute the deterministic AdvisorResult server-side (SECURITY REQUIREMENT)
    // Client cannot pass a spoofed AdvisorResult.
    const catalog = await getAdvisorCatalog();
    const result = buildRecommendations(parsed.value, catalog);

    // 3. Build the sanitized context
    const context = buildSanitizedContext(parsed.value, result);

    if (!context) {
      // offline mode requested
      return NextResponse.json({ status: "unavailable" });
    }

    // 4. Send to DeepSeek
    const explanation = await deepseekProvider.explain(context);

    return NextResponse.json({ status: "success", explanation });
  } catch {
    // Graceful fallback for timeout, 5xx, JSON parsing errors
    return NextResponse.json({ status: "unavailable" });
  }
}
