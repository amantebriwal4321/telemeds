import assert from "node:assert/strict";
import test from "node:test";

import { language } from "./language.ts";
import { systemPrompt } from "./prompt.ts";

test("the english prompt leads the required check-in and refuses diagnosis", () => {
  const prompt = systemPrompt();
  for (const topic of ["sleep", "Food and water", "Pregnancy", "Menstrual", "fever", "trouble breathing"]) {
    assert.match(prompt, new RegExp(topic, "i"));
  }
  assert.match(prompt, /never diagnose/i);
  assert.match(prompt, /one question at a time/i);
  assert.match(prompt, /hurting herself/i);
  assert.equal(language.tts.voice, "shimmer");
  assert.equal(language.stt.language, "en");
  assert.equal(language.direction, "ltr");
});
