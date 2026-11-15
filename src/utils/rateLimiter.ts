export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function createFixedWindowRateLimiter(maxRequests: number, windowMs: number) {
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    throw new Error('Rate limiter requires a positive request limit and window.');
  }

  const buckets = new Map<string, { startedAt: number; count: number }>();
  let lastCleanup = 0;

  return (key: string, now = Date.now()): RateLimitDecision => {
    if (now - lastCleanup >= windowMs) {
      for (const [bucketKey, bucket] of buckets) {
        if (now - bucket.startedAt >= windowMs) buckets.delete(bucketKey);
      }
      lastCleanup = now;
    }

    const bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (bucket.count >= maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.startedAt + windowMs - now) / 1000)),
      };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
