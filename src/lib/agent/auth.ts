import { createClient } from "@supabase/supabase-js";

export type AgentAuthResult =
  | { ok: true; userId: string; token: string; role: string }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Reads the `role` claim from a JWT that has already been verified by Supabase
 * Auth. This is only ever called after `client.auth.getUser(token)` has
 * confirmed the token signature and validity, so the payload is trustworthy —
 * we never trust an unverified token's claims. The role claim is set by the
 * server-side custom access token hook from the `agent_role_assignments`
 * table, so it is database-backed.
 *
 * Why decode the token instead of reading `data.user.role`? `auth.getUser`
 * returns the Supabase Auth user record, whose `role` field reflects the
 * `auth.users.role` column (default `authenticated`). The custom access token
 * hook only overrides the signed JWT's `role` claim at token issuance — it
 * never updates `auth.users.role` — so `data.user.role` would still say
 * `authenticated` for a contributor. The signed payload is therefore the only
 * place the hook-injected claim exists.
 */
function readJwtRole(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) return "";
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "=",
    );
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return typeof claims.role === "string" ? claims.role : "";
  } catch {
    return "";
  }
}

export async function authenticateAgent(request: Request): Promise<AgentAuthResult> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, status: 401, error: "Bearer token required." };
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 403, error: "Agent authentication is not configured." };
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });

  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired bearer token." };
  }

  // The database RPC independently enforces the agent_contributor JWT role, so
  // this route-level check is defense in depth, not the source of truth. The
  // role is read from the signature-verified token (set by the server-side
  // hook) so we can authorize BEFORE allocating a rate-limit bucket. We
  // deliberately do NOT use `data.user.role` here — see readJwtRole above.
  return {
    ok: true,
    userId: data.user.id,
    token: match[1],
    role: readJwtRole(match[1]),
  };
}
