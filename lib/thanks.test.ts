import assert from "node:assert/strict";
import test from "node:test";

import { thanksWithin } from "./thanks.ts";

test("a slow model thank-you is dropped and the caller is not left waiting", async () => {
  const started = Date.now();
  const slow = new Promise<string | null>((resolve) => {
    setTimeout(() => resolve("Thank you, dear."), 400);
  });
  const result = await thanksWithin(slow, 40);
  assert.equal(result, null);
  assert.ok(Date.now() - started < 250);
});

test("a fast model thank-you is returned", async () => {
  const result = await thanksWithin(Promise.resolve("Thank you, dear."), 200);
  assert.equal(result, "Thank you, dear.");
});

test("a model failure is a silent fallback", async () => {
  const result = await thanksWithin(Promise.reject(new Error("still downloading")), 200);
  assert.equal(result, null);
});
