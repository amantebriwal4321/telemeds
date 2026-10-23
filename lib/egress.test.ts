import assert from "node:assert/strict";
import test from "node:test";

import {
  assertEgressAllowed,
  clearSensitive,
  EgressError,
  installEgressGuard,
  noteSensitive,
  uninstallEgressGuard,
} from "./egress.ts";

test("model file reads are allowed and user payloads are not", async () => {
  clearSensitive();
  await assertEgressAllowed("https://huggingface.co/onnx-community/whisper-tiny/resolve/main/config.json");
  await assertEgressAllowed("https://us.aws.cdn.hf.co/xet-bridge-us/abc/model.onnx");
  await assertEgressAllowed("/favicon.ico");

  await assert.rejects(assertEgressAllowed("https://api.openai.com/v1/chat/completions", { method: "POST", body: "hello" }), EgressError);
  await assert.rejects(assertEgressAllowed("https://example.com/collect"), EgressError);
  await assert.rejects(assertEgressAllowed("/api/chat", { method: "POST", body: "{\"messages\":[]}" }), EgressError);
  await assert.rejects(
    assertEgressAllowed("https://huggingface.co/onnx-community/whisper-tiny/resolve/main/config.json", {
      method: "POST",
      body: "I feel unwell",
    }),
    EgressError,
  );
  await assert.rejects(
    assertEgressAllowed("https://huggingface.co/onnx-community/whisper-tiny/resolve/main/onnx/model.onnx", {
      body: "audio-bytes",
    }),
    EgressError,
  );
});

test("a noted phrase cannot leave in a URL", async () => {
  clearSensitive();
  noteSensitive("I feel very unwell today");
  await assert.rejects(
    assertEgressAllowed("https://huggingface.co/search?q=I%20feel%20very%20unwell%20today"),
    (error: unknown) => error instanceof EgressError && error.code === "sensitive",
  );
  clearSensitive();
});

test("sendBeacon is turned off", () => {
  const original = globalThis.navigator;
  let called = false;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      sendBeacon() {
        called = true;
        return true;
      },
    },
  });
  uninstallEgressGuard();
  installEgressGuard();
  const sent = navigator.sendBeacon("https://example.com/beacon", "I feel very unwell today");
  assert.equal(sent, false);
  assert.equal(called, false);
  uninstallEgressGuard();
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: original });
});
