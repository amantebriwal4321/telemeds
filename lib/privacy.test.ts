import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    if (entry === "onnx" && dir.endsWith("public")) continue;
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

test("source does not persist the conversation or phone home", () => {
  const files = ["app", "components", "lib", "public"].flatMap((dir) => walk(dir));
  const banned = [
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "document.cookie",
    "cookies(",
    "writeFile",
    "createWriteStream",
    "@vercel/analytics",
    "@vercel/speed-insights",
    "jsdelivr",
    "googletagmanager",
    "google-analytics",
    "/api/chat",
    "/api/speak",
    "/api/transcribe",
    "api.openai.com",
    "OPENAI_API_KEY",
  ];
  for (const file of files) {
    if (!/\.(ts|tsx|js|mjs)$/.test(file) || file.endsWith(".test.ts")) continue;
    const text = readFileSync(file, "utf8");
    for (const word of banned) {
      assert.equal(text.includes(word), false, `${file} contains ${word}`);
    }
    assert.equal(/openai/i.test(text), false, `${file} mentions a remote model API`);
    if (!file.endsWith("lib/egress.ts")) {
      for (const channel of ["sendBeacon", "WebSocket", "EventSource"]) {
        assert.equal(text.includes(channel), false, `${file} contains ${channel}`);
      }
    }
  }
  assert.equal(existsSync("app/api"), false);
});
