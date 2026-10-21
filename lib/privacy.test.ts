import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

test("source does not persist the conversation or record audio to disk", () => {
  const files = ["app", "components", "lib"].flatMap((dir) => walk(dir));
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
  ];
  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file) || file.endsWith(".test.ts")) continue;
    const text = readFileSync(file, "utf8");
    for (const word of banned) {
      assert.equal(text.includes(word), false, `${file} contains ${word}`);
    }
  }
});
