export class SlidingWindowRateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly log = new Map<string, number[]>();

  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }

  isRateLimited(key: string) {
    const now = Date.now();
    const recent = (this.log.get(key) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    recent.push(now);
    this.log.set(key, recent);
    return recent.length > this.max;
  }
}
