import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("@huggingface/transformers"));
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "onnx");
mkdirSync(dest, { recursive: true });

const files = ["ort-wasm-simd-threaded.jsep.wasm", "ort-wasm-simd-threaded.jsep.mjs"];
for (const name of files) {
  cpSync(join(dist, name), join(dest, name));
}
