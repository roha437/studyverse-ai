import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixedWindowRateLimiter } from './rateLimiter.ts';

test('fixed-window rate limiter rejects excess requests and resets after the window', () => {
  const limit = createFixedWindowRateLimiter(2, 60_000);

  assert.equal(limit('student-1', 1_000).allowed, true);
  assert.equal(limit('student-1', 2_000).allowed, true);
  assert.deepEqual(limit('student-1', 3_000), {
    allowed: false,
    retryAfterSeconds: 58,
  });
  assert.equal(limit('student-1', 61_000).allowed, true);
});

test('fixed-window rate limiter keeps client buckets independent', () => {
  const limit = createFixedWindowRateLimiter(1, 60_000);

  assert.equal(limit('student-1', 1_000).allowed, true);
  assert.equal(limit('student-2', 1_000).allowed, true);
});
