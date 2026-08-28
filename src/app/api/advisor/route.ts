import { NextResponse, type NextRequest } from "next/server";
import { buildRecommendations } from "@/lib/advisor";
import { parseAdvisorInput } from "@/lib/advisor/request";
import { getAdvisorCatalog } from "@/lib/queries/advisor-catalog";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
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
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAdvisorInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.errors }, { status: 400 });
  }

  try {
    const catalog = await getAdvisorCatalog();
    const result = buildRecommendations(parsed.value, catalog);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to build recommendation." },
      { status: 500 }
    );
  }
}
