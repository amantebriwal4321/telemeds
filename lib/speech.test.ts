import assert from "node:assert/strict";
import test from "node:test";

import { chooseVoice } from "./speech.ts";

test("only an on-device voice is chosen, and a female one when it exists", () => {
  const chosen = chooseVoice([
    { name: "Google UK English Female", localService: false },
    { name: "Daniel", localService: true },
    { name: "Samantha", localService: true },
  ]);
  assert.equal(chosen?.name, "Samantha");
  assert.equal(chooseVoice([{ name: "Google UK English Female", localService: false }]), null);
  assert.equal(chooseVoice([{ name: "Daniel", localService: true }])?.name, "Daniel");
});
