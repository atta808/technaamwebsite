import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SlidingWindowRateLimiter } from "../src/lib/agent/rate-limit";
import { agentRateLimitGate } from "../src/lib/agent/rate-limit-gate";
import { authenticateAgent } from "../src/lib/agent/auth";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

function fakeResponse(
  status: number,
  body: unknown,
): { ok: boolean; status: number; headers: { get: () => null }; json: () => Promise<unknown> } {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.signature`;
}

let failures = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}: ${(err as Error).message}`);
  }
}

async function run() {
  console.log("Phase 7B — Agent proposal rate limiting tests");

  // ---- Behavioral limiter tests with a mocked clock -----------------------
  {
    let nowMs = 1_000_000_000;
    const clock = () => nowMs;
    const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
      now: clock,
    });

    await test("1. first request is accepted", () => {
      const decision = limiter.check("user-a");
      assert.equal(decision.limited, false);
      assert.equal(decision.remaining, MAX_REQUESTS - 1);
    });

    await test("2. requests within the allowed limit are accepted", () => {
      for (let i = 0; i < MAX_REQUESTS - 1; i++) {
        const decision = limiter.check("user-a");
        assert.equal(decision.limited, false, `request ${i + 2} should be accepted`);
      }
    });

    await test("3. the 21st request within 60 seconds is limited", () => {
      const decision = limiter.check("user-a");
      assert.equal(decision.limited, true);
      assert.equal(decision.remaining, 0);
    });

    await test("4. limit resets after the rolling window expires", () => {
      nowMs += WINDOW_MS + 1;
      const decision = limiter.check("user-a");
      assert.equal(decision.limited, false);
      assert.equal(decision.remaining, MAX_REQUESTS - 1);
    });
  }

  // ---- Independent users --------------------------------------------------
  {
    const nowMs = 2_000_000_000;
    const clock = () => nowMs;
    const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
      now: clock,
    });

    await test("5. different authenticated users have independent limits", () => {
      for (let i = 0; i < MAX_REQUESTS; i++) {
        assert.equal(limiter.check("user-a").limited, false);
      }
      assert.equal(limiter.check("user-a").limited, true);
      assert.equal(limiter.check("user-b").limited, false);
      assert.equal(limiter.check("user-b").limited, false);
    });
  }

  // ---- Fail-closed capacity: never evict an active bucket -----------------
  {
    let nowMs = 3_000_000_000;
    const clock = () => nowMs;
    const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
      now: clock,
      maxBuckets: 2,
    });

    await test("active buckets are never evicted and exhaustion cannot reset quota", () => {
      for (let i = 0; i < MAX_REQUESTS; i++) {
        assert.equal(limiter.check("user-a").limited, false);
      }
      assert.equal(limiter.check("user-a").limited, true);

      assert.equal(limiter.check("user-b").limited, false);
      assert.equal(limiter.size(), 2);

      // Capacity is full: a new identity fails closed instead of evicting an
      // active bucket.
      assert.equal(limiter.check("user-c").limited, true);
      assert.equal(limiter.size(), 2);

      // user-a's quota is intact — it was not reset by an eviction.
      assert.equal(limiter.check("user-a").limited, true);
      // user-b's remaining quota is also intact.
      assert.equal(limiter.check("user-b").limited, false);
    });

    await test("expired buckets are reclaimed without touching active buckets", () => {
      nowMs += WINDOW_MS + 1;
      // user-a and user-b are now idle/expired, so a new identity can enter.
      assert.equal(limiter.check("user-c").limited, false);
      assert.equal(limiter.size(), 1);
    });
  }

  // ---- Memory bounds ------------------------------------------------------
  {
    let nowMs = 4_000_000_000;
    const clock = () => nowMs;
    const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
      now: clock,
      maxBuckets: 4,
    });

    await test("memory is bounded and active keys are not silently evicted", () => {
      for (let i = 0; i < 50; i++) {
        limiter.check(`user-${i}`);
      }
      assert.equal(limiter.size(), 4, "map must hold exactly the four active buckets");
      nowMs += WINDOW_MS + 1;
      limiter.check("fresh-user");
      assert.ok(limiter.size() <= 4, `expected <= 4 tracked keys after expiry, got ${limiter.size()}`);
    });
  }

  // ---- Concurrency (single-threaded simulation) --------------------------
  {
    const nowMs = 5_000_000_000;
    const clock = () => nowMs;
    const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
      now: clock,
    });

    await test("10. rate-limit behavior is deterministic under concurrent requests", async () => {
      const decisions = await Promise.all(
        Array.from({ length: 40 }, async () => limiter.check("user-concurrent")),
      );
      const accepted = decisions.filter((d) => !d.limited).length;
      const limited = decisions.filter((d) => d.limited).length;
      assert.equal(accepted, MAX_REQUESTS);
      assert.equal(limited, 40 - MAX_REQUESTS);
    });
  }

  // ---- Authorization-before-allocation gate (behavioral) -----------------
  {
    const nowMs = 6_000_000_000;
    const clock = () => nowMs;

    await test("ordinary authenticated user cannot consume bucket capacity", () => {
      const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
        now: clock,
        maxBuckets: 2,
      });
      const result = agentRateLimitGate(
        { ok: true, userId: "ordinary-user", token: "t", role: "authenticated" },
        limiter,
      );
      assert.equal(result.ok, false);
      assert.equal(result.status, 403);
      assert.equal(limiter.size(), 0, "no bucket should be allocated for an unauthorized user");
    });

    await test("authorized contributor allocates a bucket", () => {
      const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
        now: clock,
        maxBuckets: 2,
      });
      const result = agentRateLimitGate(
        { ok: true, userId: "contributor-a", token: "t", role: "agent_contributor" },
        limiter,
      );
      assert.equal(result.ok, true);
      assert.equal(limiter.size(), 1);
    });

    await test("contributor receives 429 after the 20th accepted request", () => {
      const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
        now: clock,
        maxBuckets: 100,
      });
      const auth = { ok: true, userId: "contributor-b", token: "t", role: "agent_contributor" } as const;
      for (let i = 0; i < MAX_REQUESTS; i++) {
        const r = agentRateLimitGate(auth, limiter);
        assert.equal(r.ok, true, `request ${i + 1} should be accepted`);
      }
      const exceeded = agentRateLimitGate(auth, limiter);
      assert.equal(exceeded.ok, false);
      assert.equal(exceeded.status, 429);
    });

    await test("independent authorized users retain independent limits", () => {
      const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
        now: clock,
        maxBuckets: 100,
      });
      const a = { ok: true, userId: "contrib-a", token: "t", role: "agent_contributor" } as const;
      const b = { ok: true, userId: "contrib-b", token: "t", role: "agent_contributor" } as const;
      for (let i = 0; i < MAX_REQUESTS; i++) {
        assert.equal(agentRateLimitGate(a, limiter).ok, true);
      }
      assert.equal(agentRateLimitGate(a, limiter).ok, false);
      assert.equal(agentRateLimitGate(b, limiter).ok, true);
    });

    await test("authentication failures pass through unchanged", () => {
      const limiter = new SlidingWindowRateLimiter(MAX_REQUESTS, WINDOW_MS, {
        now: clock,
        maxBuckets: 100,
      });
      const result = agentRateLimitGate(
        { ok: false, status: 401, error: "Invalid or expired bearer token." },
        limiter,
      );
      assert.equal(result.ok, false);
      assert.equal(result.status, 401);
      assert.equal(limiter.size(), 0);
    });
  }

  // ---- Route / header handling (source-level contract) --------------------
  {
    const route = await readFile("src/app/api/agent/proposals/route.ts", "utf8");
    const gateSource = await readFile("src/lib/agent/rate-limit-gate.ts", "utf8");

    await test("6. x-forwarded-for cannot reset the rate-limit window", () => {
      assert.equal(/headers\.get\(["']x-forwarded-for["']\)/.test(route), false);
      assert.equal(/headers\.get\(["']x-forwarded-for["']\)/.test(gateSource), false);
      assert.equal(/\$\{auth\.userId\}:/.test(route), false);
      assert.match(gateSource, /limiter\.check\(auth\.userId\)/);
      assert.match(route, /MAX_REQUESTS = 20/);
      assert.match(route, /WINDOW_MS = 60_000/);
      assert.match(gateSource, /Rate limit exceeded/);
    });

    await test("9. contributor authorization is enforced before bucket allocation", () => {
      assert.match(gateSource, /auth\.role !== "agent_contributor"/);
      assert.match(gateSource, /limiter\.check\(auth\.userId\)/);
      assert.match(route, /"Agent contributor role required\."/);
    });
  }

  // ---- Authentication (behavioral, mocked Supabase) ----------------------
  {
    const originalFetch = globalThis.fetch;
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_ANON_KEY;

    try {
      await test("7. missing bearer token returns 401", async () => {
        const request = new Request("http://localhost/api/agent/proposals", {
          method: "POST",
        });
        const result = await authenticateAgent(request);
        if (result.ok) throw new Error("expected authentication to fail");
        assert.equal(result.status, 401);
      });

      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      await test("8. invalid bearer token returns 401", async () => {
        globalThis.fetch = (async () =>
          fakeResponse(401, { error_code: "bad_jwt", msg: "JWT is invalid" })) as unknown as typeof fetch;
        const request = new Request("http://localhost/api/agent/proposals", {
          method: "POST",
          headers: { authorization: "Bearer not-a-real-token" },
        });
        const result = await authenticateAgent(request);
        if (result.ok) throw new Error("expected authentication to fail");
        assert.equal(result.status, 401);
      });

      await test("verified contributor token resolves user id and role", async () => {
        const userId = "11111111-1111-4111-8111-111111111111";
        globalThis.fetch = (async () =>
          fakeResponse(200, { id: userId, email: "agent@example.com" })) as unknown as typeof fetch;
        const token = makeJwt({ id: userId, role: "agent_contributor" });
        const request = new Request("http://localhost/api/agent/proposals", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
        const result = await authenticateAgent(request);
        if (!result.ok) throw new Error("expected authentication to succeed");
        assert.equal(result.userId, userId);
        assert.equal(result.role, "agent_contributor");
      });

      await test("verified ordinary token resolves role authenticated", async () => {
        const userId = "22222222-2222-4222-8222-222222222222";
        globalThis.fetch = (async () =>
          fakeResponse(200, { id: userId, email: "user@example.com" })) as unknown as typeof fetch;
        const token = makeJwt({ id: userId, role: "authenticated" });
        const request = new Request("http://localhost/api/agent/proposals", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
        const result = await authenticateAgent(request);
        if (!result.ok) throw new Error("expected authentication to succeed");
        assert.equal(result.role, "authenticated");
      });

      await test("role comes from the signed JWT, not the Auth user object", async () => {
        const userId = "33333333-3333-4333-8333-333333333333";
        // Simulate GoTrue /auth/v1/user, whose `role` reflects auth.users.role
        // (default "authenticated") and does NOT carry the hook-injected claim.
        globalThis.fetch = (async () =>
          fakeResponse(200, { id: userId, role: "authenticated", email: "agent@example.com" })) as unknown as typeof fetch;
        const token = makeJwt({ id: userId, role: "agent_contributor" });
        const request = new Request("http://localhost/api/agent/proposals", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
        const result = await authenticateAgent(request);
        if (!result.ok) throw new Error("expected authentication to succeed");
        assert.equal(result.role, "agent_contributor");
      });
    } finally {
      globalThis.fetch = originalFetch;
      if (originalUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.SUPABASE_ANON_KEY;
      else process.env.SUPABASE_ANON_KEY = originalKey;
    }
  }

  console.log(
    `\n${failures === 0 ? "All Phase 7B rate-limit tests passed." : `${failures} test(s) failed.`}`,
  );
  if (failures > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
