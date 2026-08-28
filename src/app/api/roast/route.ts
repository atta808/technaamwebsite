import { NextResponse, type NextRequest } from "next/server";
import { roastMyStack } from "@/lib/roast";
import { parseRoastInput } from "@/lib/roast/request";
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

  const parsed = parseRoastInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.errors }, { status: 400 });
  }

  try {
    const catalog = await getAdvisorCatalog();

    // TEMPORARY DIAGNOSTIC LOGGING
    console.log("=== ROAST DIAGNOSTIC START ===");
    console.log("Input technologies count:", parsed.value.technologies.length);
    console.log("Input technologies names:", parsed.value.technologies.map(t => t.name));
    console.log("Catalog size:", catalog.length);

    const relevantNames = ["next.js", "supabase", "firebase", "vercel", "cursor"];
    for (const name of relevantNames) {
      const exists = catalog.some(p => p.name.toLowerCase() === name || p.slug.toLowerCase() === name);
      console.log(`Exists in catalog (${name}): ${exists}`);
    }

    const result = roastMyStack(parsed.value, catalog);

    console.log("Resolved count:", result.resolved_technologies.length);
    console.log("Unresolved count:", result.unresolved_technologies.length);
    console.log("=== ROAST DIAGNOSTIC END ===");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Roast error:", error);
    return NextResponse.json(
      { error: "Unable to process stack roast." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
