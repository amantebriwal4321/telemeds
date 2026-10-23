import assert from "node:assert/strict";
import test from "node:test";

import { inputDisabled, microphoneDisabled } from "./composer-state.ts";

test("the microphone stays enabled while the language model is downloading or thinking", () => {
  for (const status of ["idle", "preparing", "thinking", "speaking", "listening"] as const) {
    assert.equal(microphoneDisabled(status), false, status);
  }
  assert.equal(microphoneDisabled("transcribing"), true);
});

test("the text field stays open while the language model works", () => {
  assert.equal(inputDisabled("thinking"), false);
  assert.equal(inputDisabled("preparing"), false);
  assert.equal(inputDisabled("speaking"), false);
  assert.equal(inputDisabled("listening"), true);
  assert.equal(inputDisabled("transcribing"), true);
});
