/**
 * Process-local sliding-window rate limiter for authenticated agent endpoints.
 *
 * Capacity policy (important): an active bucket is NEVER evicted to make room
 * for a new identity. Evicting an active bucket would silently grant that user
 * a fresh quota before their window expires, which defeats the limiter. When
 * the limiter has no room for a new identity, it fails closed — the new
 * identity is reported as limited until an existing bucket's window expires
 * and its (now-idle) slot is reclaimed.
 *
 * IMPORTANT: This limiter is intentionally process-local. It protects a single
 * Node.js runtime and bounds its own memory. It is NOT distributed protection
 * across multiple instances, serverless invocations, or restarts. Production
 * global rate limiting should use a shared store (Supabase-backed atomic
 * counters or Redis) — see the repository's Phase 7B notes for a
 * recommendation.
 */

export interface RateLimitDecision {
  limited: boolean;
  /** Number of requests still allowed within the current window. */
  remaining: number;
  /** Epoch milliseconds at which the current window fully rolls over. */
  resetAt: number;
}

export interface SlidingWindowRateLimiterOptions {
  /** Injectable clock for deterministic tests. Defaults to Date.now. */
  now?: () => number;
  /**
   * Maximum number of distinct identities tracked at once. New identities are
   * rejected (fail closed) while this many active buckets exist. Defaults to
   * 10_000.
   */
  maxBuckets?: number;
}

export class SlidingWindowRateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly maxBuckets: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(
    max: number,
    windowMs: number,
    options: SlidingWindowRateLimiterOptions = {},
  ) {
    if (!Number.isFinite(max) || max <= 0) {
      throw new Error("SlidingWindowRateLimiter max must be a positive number.");
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error(
        "SlidingWindowRateLimiter windowMs must be a positive number.",
      );
    }
    this.max = Math.floor(max);
    this.windowMs = Math.floor(windowMs);
    this.now = options.now ?? Date.now;
    this.maxBuckets = Math.max(1, Math.floor(options.maxBuckets ?? 10_000));
  }

  /**
   * Records a request for `key` and reports whether that request is limited.
   *
   * The key is the sole identity dimension: callers must pass a stable,
   * server-controlled identity (for authenticated agents, the Supabase user ID)
   * and never append client-controlled headers such as x-forwarded-for.
   */
  check(key: string): RateLimitDecision {
    const now = this.now();
    const existing = this.buckets.get(key);

    if (existing) {
      const recent = existing.filter((t) => now - t < this.windowMs);
      if (recent.length >= this.max) {
        this.buckets.set(key, recent);
        return { limited: true, remaining: 0, resetAt: recent[0] + this.windowMs };
      }
      recent.push(now);
      this.buckets.set(key, recent);
      return {
        limited: false,
        remaining: this.max - recent.length,
        resetAt: recent[0] + this.windowMs,
      };
    }

    // New identity. Reclaim slots only from buckets whose window has fully
    // expired; never evict an active bucket. If no slot is available, fail
    // closed rather than displacing an existing user's quota.
    if (this.buckets.size >= this.maxBuckets) {
      this.pruneExpired(now);
    }
    if (this.buckets.size >= this.maxBuckets) {
      return { limited: true, remaining: 0, resetAt: now + this.windowMs };
    }

    this.buckets.set(key, [now]);
    return { limited: false, remaining: this.max - 1, resetAt: now + this.windowMs };
  }

  /** Number of keys currently tracked. Exposed for tests and observability. */
  size(): number {
    return this.buckets.size;
  }

  private pruneExpired(now: number): void {
    for (const [key, times] of this.buckets) {
      if (times.length === 0 || now - times[times.length - 1] >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}
