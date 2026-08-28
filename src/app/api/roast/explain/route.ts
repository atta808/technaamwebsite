import { NextResponse } from "next/server";
import { parseRoastInput } from "@/lib/roast/request";
import { roastMyStack } from "@/lib/roast";
import { getAdvisorCatalog } from "@/lib/queries/advisor-catalog";
import { buildSanitizedContext, shouldSkipProvider } from "@/lib/roast/ai/context";
import { DeepSeekRoastProvider } from "@/lib/roast/ai/provider";
import { SlidingWindowRateLimiter } from "@/lib/advisor/ai/rate-limit";

export const maxDuration = 15;

const limiter = new SlidingWindowRateLimiter(10, 60_000);

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    if (limiter.isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = parseRoastInput(body);
    if (!parseResult.ok) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.errors },
        { status: 400 }
      );
    }

    const input = parseResult.value;

    if (shouldSkipProvider(input)) {
      return NextResponse.json({ available: false, reason: "offline" });
    }

    const catalog = await getAdvisorCatalog();
    const result = roastMyStack(input, catalog);
    const sanitizedContext = buildSanitizedContext(input, result);

    const provider = new DeepSeekRoastProvider({
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    const aiResult = await provider.explain(sanitizedContext);
    return NextResponse.json(aiResult);
  } catch (error) {
    console.error("Roast AI unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
