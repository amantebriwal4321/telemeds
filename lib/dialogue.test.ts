import assert from "node:assert/strict";
import test from "node:test";

import { acknowledgementInstruction, emptyNotes, openingTurn, planReply } from "./dialogue.ts";
import { language } from "./language.ts";
import { limits } from "./limits.ts";

const base = {
  notes: emptyNotes(),
  modelAcknowledgement: null as string | null,
  modelAttempted: false,
};

test("the opening is a greeting and one question", () => {
  const turn = openingTurn();
  assert.match(turn.reply, /Assalaam-o-alaikum/);
  assert.doesNotMatch(turn.reply, /Khuda hafiz/);
  assert.equal(turn.phase, "wellbeing");
  assert.equal(turn.summary, null);
  assert.equal((turn.reply.match(/\?/g) ?? []).length, 1);
});

test("an ordinary answer moves one question ahead", () => {
  const planned = planReply({
    ...base,
    phase: "wellbeing",
    latestUser: "I am tired.",
    modelAcknowledgement: "Thank you, dear.",
    modelAttempted: true,
  });
  assert.equal(planned.prepared, false);
  assert.match(planned.turn.reply, /Thank you, dear/);
  assert.match(planned.turn.reply, /troubling you/);
  assert.equal(planned.turn.phase, "concern");
  assert.equal(planned.turn.summary, null);
  assert.equal((planned.turn.reply.match(/\?/g) ?? []).length, 1);
  assert.equal(planned.notes.wellbeing, "I am tired.");
});

test("unsafe model text is dropped and the prepared line is used", () => {
  const planned = planReply({
    ...base,
    phase: "wellbeing",
    latestUser: "My head hurts.",
    modelAcknowledgement: "You have a migraine. Take 500mg of ibuprofen.",
    modelAttempted: true,
  });
  assert.equal(planned.prepared, true);
  assert.equal(planned.turn.reply.includes("ibuprofen"), false);
  assert.equal(planned.turn.reply.includes("500"), false);
  assert.match(planned.turn.reply, /Thank you for telling me/);
});

test("bleeding closes with first aid, a clinician line, and Khuda hafiz", () => {
  const planned = planReply({
    ...base,
    phase: "concern",
    latestUser: "I have heavy bleeding.",
  });
  assert.equal(planned.turn.phase, "summary");
  assert.equal(planned.turn.urgentKind, "medical");
  assert.match(planned.turn.reply, /press a clean cloth/);
  assert.match(planned.turn.reply, /chest/);
  assert.match(planned.turn.reply, /seek a clinician/i);
  assert.match(planned.turn.reply, /Khuda hafiz/);
  assert.match(planned.turn.summary?.forClinician ?? "", /not a diagnosis/i);
  assert.match(planned.turn.summary?.firstAid ?? "", /XABCDE/);
  assert.ok(planned.turn.reply.length <= limits.replyChars);
});

test("a fever asks her to seek a clinician without the bleeding script", () => {
  const planned = planReply({
    ...base,
    phase: "wellbeing",
    latestUser: "I have a fever.",
  });
  assert.equal(planned.turn.urgentKind, "medical");
  assert.match(planned.turn.reply, /seek a clinician/i);
  assert.match(planned.turn.reply, /Khuda hafiz/);
  assert.doesNotMatch(planned.turn.reply, /press a clean cloth/);
});

test("a negated fever does not become an emergency", () => {
  const planned = planReply({
    ...base,
    phase: "wellbeing",
    latestUser: "I have no fever.",
  });
  assert.equal(planned.turn.urgent, false);
  assert.equal(planned.turn.phase, "concern");
});

test("self-harm stops the questions and does not repeat a dose", () => {
  const planned = planReply({
    ...base,
    phase: "care",
    latestUser: "I want to die",
    modelAcknowledgement: "Take 500mg and overdose",
    modelAttempted: true,
  });
  assert.equal(planned.turn.phase, "urgent_stop");
  assert.match(planned.turn.reply, /Khuda hafiz/);
  assert.equal(planned.turn.reply.includes("500"), false);
  assert.equal(planned.notes.concern, "");
});

test("finish closes with Khuda hafiz", () => {
  const planned = planReply({
    ...base,
    phase: "care",
    latestUser: language.ui.finishUtterance,
    notes: { ...emptyNotes(), wellbeing: "Tired", comfort: "Rest and water" },
  });
  assert.equal(planned.turn.phase, "summary");
  assert.match(planned.turn.reply, /Khuda hafiz/);
  assert.equal(planned.turn.summary?.wellbeing, "Tired");
  assert.equal(planned.turn.summary?.comfort, "Rest and water");
});

test("a recited instruction is dropped", () => {
  const planned = planReply({
    ...base,
    phase: "wellbeing",
    latestUser: "I am tired.",
    modelAcknowledgement:
      "If she says she wants to die, hurt herself, or end her life, she is not a doctor.",
    modelAttempted: true,
  });
  assert.equal(planned.prepared, true);
  assert.doesNotMatch(planned.turn.reply, /die|hurt herself/);
  assert.match(planned.turn.reply, /Thank you for telling me/);
  assert.match(planned.turn.reply, /troubling you/);
});

test("the model is asked only for a short thanks", () => {
  const instruction = acknowledgementInstruction("My stomach hurts.");
  assert.match(instruction, /My stomach hurts/);
  assert.match(instruction, /Do not diagnose/);
  assert.match(instruction, /Do not ask a question/);
});
