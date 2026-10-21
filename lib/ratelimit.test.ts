import assert from "node:assert/strict";
import test from "node:test";

import { rateLimit, requestIp, resetRateLimits } from "./ratelimit.ts";

test("rate limit allows a burst and then waits", () => {
  resetRateLimits();
  const now = 1_000_000;
  assert.equal(rateLimit("chat:1", 2, 10_000, now).ok, true);
  assert.equal(rateLimit("chat:1", 2, 10_000, now + 1).ok, true);
  const blocked = rateLimit("chat:1", 2, 10_000, now + 2);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(rateLimit("chat:2", 2, 10_000, now).ok, true);
  assert.equal(rateLimit("chat:1", 2, 10_000, now + 10_001).ok, true);
});

test("request ip prefers the platform real ip", () => {
  const request = new Request("http://localhost/api/chat", {
    headers: { "x-real-ip": "203.0.113.8", "x-forwarded-for": "1.2.3.4" },
  });
  assert.equal(requestIp(request), "203.0.113.8");
});
