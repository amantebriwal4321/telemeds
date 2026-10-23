import assert from "node:assert/strict";
import test from "node:test";

import { mentionsMedicalRedFlag, mentionsSelfHarm, needsHandsOnFirstAid, replyIsUnsafe, selfHarmTurn } from "./safety.ts";

test("self-harm phrases are caught, including don't-want-to-live", () => {
  assert.equal(mentionsSelfHarm("I want to die"), true);
  assert.equal(mentionsSelfHarm("I don't want to live"), true);
  assert.equal(mentionsSelfHarm("I have had suicidal thoughts"), true);
});

test("negated self-harm phrases are not treated as a crisis", () => {
  assert.equal(mentionsSelfHarm("I do not want to die"), false);
  assert.equal(mentionsSelfHarm("I am not suicidal"), false);
  assert.equal(mentionsSelfHarm("I don't want to hurt myself"), false);
});

test("medical red flags respect a nearby negation", () => {
  assert.equal(mentionsMedicalRedFlag("I have a fever and trouble breathing"), true);
  assert.equal(mentionsMedicalRedFlag("I have no fever"), false);
  assert.equal(mentionsMedicalRedFlag("The pain is severe"), true);
});

test("the fixed crisis reply does not include a method", () => {
  const turn = selfHarmTurn();
  assert.equal(turn.urgentKind, "self_harm");
  assert.equal(turn.phase, "urgent_stop");
  assert.match(turn.reply, /102/);
  assert.match(turn.reply, /Khuda hafiz/);
  assert.doesNotMatch(turn.reply, /overdose|wrist|pills|rope/i);
  assert.match(turn.summary?.forClinician ?? "", /not a diagnosis/i);
});

test("hands-on first aid is separate from a negated fever", () => {
  assert.equal(needsHandsOnFirstAid("I have heavy bleeding"), true);
  assert.equal(needsHandsOnFirstAid("I am tired"), false);
  assert.equal(needsHandsOnFirstAid("I have no trouble breathing"), false);
});

test("model replies that name a dose or a diagnosis are refused", () => {
  assert.equal(replyIsUnsafe("Take 500mg of ibuprofen"), true);
  assert.equal(replyIsUnsafe("You have a fever"), true);
  assert.equal(replyIsUnsafe("Thank you for telling me."), false);
});
