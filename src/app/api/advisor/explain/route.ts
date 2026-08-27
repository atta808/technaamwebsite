import { NextResponse, type NextRequest } from "next/server";
import { buildRecommendations } from "@/lib/advisor";
import { buildSanitizedContext, shouldSkipProvider } from "@/lib/advisor/ai/context";
import { DeepSeekProvider } from "@/lib/advisor/ai/provider";
import { SlidingWindowRateLimiter } from "@/lib/advisor/ai/rate-limit";
import { parseAdvisorInput } from "@/lib/advisor/request";
import { getAdvisorCatalog } from "@/lib/queries/advisor-catalog";

const EXPLAIN_RATE_LIMIT_WINDOW_MS = 60_000;
const EXPLAIN_RATE_LIMIT_MAX_REQUESTS = 10;
const explainRateLimiter = new SlidingWindowRateLimiter(
  EXPLAIN_RATE_LIMIT_MAX_REQUESTS,
  EXPLAIN_RATE_LIMIT_WINDOW_MS
);

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
  }

  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (explainRateLimiter.isRateLimited(clientKey)) {
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

  if (shouldSkipProvider(parsed.value)) {
    return NextResponse.json({ available: false, reason: "offline" });
  }

  try {
    const catalog = await getAdvisorCatalog();
    const result = buildRecommendations(parsed.value, catalog);
    const context = buildSanitizedContext(parsed.value, result);
    const provider = new DeepSeekProvider({
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    const response = await provider.explain(context);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({
      available: false,
      reason: "provider_unavailable",
    });
  }
}
