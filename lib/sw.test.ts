import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the service worker returns downloads before it finishes caching them", () => {
  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.equal(source.includes("await cache.put"), false);
  assert.match(source, /cache\.put\(request, response\.clone\(\)\)/);
  assert.doesNotMatch(source, /huggingface\.co/);
});
