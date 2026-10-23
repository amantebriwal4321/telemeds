import assert from "node:assert/strict";
import test from "node:test";

import { loadStateFromEvent } from "./model-progress.ts";

test("a download with no content length shows bytes instead of a fake 100 percent", () => {
  const state = loadStateFromEvent("Language model", {
    status: "progress",
    file: "onnx/model_quantized.onnx?token=secret",
    progress: 100,
    loaded: 8_000_000,
    total: 8_000_000,
  });
  assert.equal(state?.phase, "downloading");
  assert.match(state?.label ?? "", /downloading model_quantized\.onnx \(8 MB\)/);
  assert.doesNotMatch(state?.label ?? "", /token/);
});

test("a known file length shows a percentage", () => {
  const state = loadStateFromEvent("Speech model", {
    status: "progress",
    file: "onnx/decoder_model_merged_quantized.onnx",
    progress: 42.4,
    loaded: 42,
    total: 100,
  });
  assert.equal(state?.label, "Speech model: downloading decoder_model_merged_quantized.onnx 42%");
});

test("ready and failed are distinct from downloading", () => {
  assert.equal(loadStateFromEvent("Voice", { status: "ready" })?.phase, "ready");
  assert.equal(loadStateFromEvent("Voice", { status: "error" })?.phase, "failed");
  assert.equal(loadStateFromEvent("Voice", { status: "download", file: "model.onnx" })?.phase, "downloading");
});
