import assert from "node:assert/strict";
import test from "node:test";

import { language } from "./language.ts";
import { startInstruction, systemPrompt } from "./prompt.ts";

test("the english prompt is a deferential on-device companion", () => {
  const prompt = systemPrompt();
  for (const phrase of [
    "Assalaam-o-alaikum",
    "Khuda hafiz",
    "eXsanguinating hemorrhage",
    "Airway",
    "Breathing",
    "Circulation",
    "Disability",
    "Exposure",
    "home",
    "never diagnose",
    "one question at a time",
    "harming herself",
    "clinician",
    "do not probe",
    "pregnancy",
    "fever",
    "trouble breathing",
  ]) {
    assert.match(prompt, new RegExp(phrase, "i"));
  }
  assert.match(startInstruction(), /Assalaam-o-alaikum/);
  assert.equal(language.tts.engine, "kokoro");
  assert.equal(language.tts.voice, "af_heart");
  assert.equal(language.tts.preferLocal, true);
  assert.equal(language.stt.language, "en");
  assert.equal(language.stt.device, "wasm");
  assert.equal(language.llm.device, "wasm");
  assert.equal(language.direction, "ltr");
});
