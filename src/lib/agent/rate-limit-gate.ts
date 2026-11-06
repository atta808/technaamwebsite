import type { AgentAuthResult } from "./auth";
import { SlidingWindowRateLimiter } from "./rate-limit";

export type AgentRateLimitGateResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 429; error: string };

/**
 * Authorize first, then allocate rate-limit capacity.
 *
 * The order matters: an ordinary authenticated user (who has not been granted
 * the agent_contributor role) must not be able to consume a rate-limit bucket
 * or exhaust the limiter's identity capacity merely by hitting this endpoint.
 * The role comes from the signature-verified JWT (see authenticateAgent); the
 * database RPC `submit_agent_proposal` remains the authoritative check.
 */
export function agentRateLimitGate(
  auth: AgentAuthResult,
  limiter: SlidingWindowRateLimiter,
): AgentRateLimitGateResult {
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }

  if (auth.role !== "agent_contributor") {
    return {
      ok: false,
      status: 403,
      error: "Agent contributor role required.",
    };
  }

  if (limiter.check(auth.userId).limited) {
    return {
      ok: false,
      status: 429,
      error: "Rate limit exceeded. Try again shortly.",
    };
  }

  return { ok: true };
}
