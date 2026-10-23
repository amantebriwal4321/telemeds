import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { contentSecurityPolicy } from "./csp.ts";

test("the content security policy only opens model-file hosts", () => {
  const policy = contentSecurityPolicy(false);
  assert.match(policy, /connect-src 'self' https:\/\/huggingface\.co/);
  assert.match(policy, /https:\/\/\*\.aws\.cdn\.hf\.co/);
  assert.match(policy, /wasm-unsafe-eval/);
  assert.match(policy, /upgrade-insecure-requests/);
  assert.doesNotMatch(policy, /openai/i);
  assert.doesNotMatch(policy, /jsdelivr/i);
  assert.doesNotMatch(policy, /google/i);
  assert.doesNotMatch(policy, /'unsafe-eval'/);
  assert.match(contentSecurityPolicy(true), /'unsafe-eval'/);

  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /securityHeaders/);
  assert.doesNotMatch(config, /openai/i);
});
