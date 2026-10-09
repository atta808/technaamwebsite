import { createClient } from "@supabase/supabase-js";

export type AgentPrincipal = {
  userId: string;
  role: "agent_contributor";
  accessToken: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Supabase Auth validates the token signature and user status. Only after that
 * verification do we trust the role claim decoded from the signed JWT.
 */
export async function verifyAgentContributorToken(
  authorizationHeader: string | null
): Promise<AgentPrincipal | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;

  const accessToken = authorizationHeader.slice("Bearer ".length).trim();
  if (!accessToken || accessToken.length > 16_384) return null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  const payload = decodeJwtPayload(accessToken);
  if (!payload || payload.role !== "agent_contributor" || typeof payload.sub !== "string") {
    return null;
  }

  const verifier = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.getUser(accessToken);

  if (error || !data.user || data.user.id !== payload.sub) return null;

  return {
    userId: data.user.id,
    role: "agent_contributor",
    accessToken,
  };
}
