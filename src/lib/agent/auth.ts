import { createHmac, timingSafeEqual } from "node:crypto";

export type AgentClaims = {
  sub: string;
  role: string;
  exp: number;
  nbf?: number;
  iss?: string;
};

export type AgentAuthResult =
  | { ok: true; claims: AgentClaims }
  | { ok: false; status: 401 | 403; error: string };

function decodeSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

/**
 * Verify Supabase-compatible HS256 JWTs for the dedicated agent API.
 * The secret must be the server-only SUPABASE_JWT_SECRET. Never use the
 * service-role key as a signing secret.
 */
export function verifyAgentToken(
  authorization: string | null,
  nowSeconds = Math.floor(Date.now() / 1000)
): AgentAuthResult {
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Bearer token required" };
  }

  const token = authorization.slice(7).trim();
  const parts = token.split(".");
  if (!token || parts.length !== 3) {
    return { ok: false, status: 401, error: "Invalid bearer token" };
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    return { ok: false, status: 401, error: "Agent authentication is not configured" };
  }

  try {
    const header = decodeSegment(parts[0]) as { alg?: string; typ?: string };
    if (header.alg !== "HS256") {
      return { ok: false, status: 401, error: "Unsupported token algorithm" };
    }

    const expected = createHmac("sha256", secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest();
    const supplied = Buffer.from(parts[2], "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return { ok: false, status: 401, error: "Invalid bearer token signature" };
    }

    const claims = decodeSegment(parts[1]) as Partial<AgentClaims>;
    if (
      typeof claims.sub !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.sub) ||
      typeof claims.role !== "string" ||
      typeof claims.exp !== "number" ||
      claims.exp <= nowSeconds ||
      (typeof claims.nbf === "number" && claims.nbf > nowSeconds)
    ) {
      return { ok: false, status: 401, error: "Token claims are invalid or expired" };
    }

    const expectedIssuer = process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1`
      : undefined;
    if (expectedIssuer && claims.iss !== expectedIssuer) {
      return { ok: false, status: 401, error: "Invalid token issuer" };
    }

    if (claims.role !== "agent_contributor") {
      return { ok: false, status: 403, error: "agent_contributor role required" };
    }

    return { ok: true, claims: claims as AgentClaims };
  } catch {
    return { ok: false, status: 401, error: "Malformed bearer token" };
  }
}
