import { createClient } from "@supabase/supabase-js";

export type AgentAuthResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; status: 401 | 403; error: string };

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

  // The database RPC independently enforces the agent_contributor JWT role.
  // User authentication alone does not grant agent-contributor privileges.
  return { ok: true, userId: data.user.id, token: match[1] };
}
