import assert from "node:assert/strict";
import test from "node:test";

import { parseTurn } from "./turn.ts";

const summary = {
  wellbeing: "Tired",
  concern: "Headache",
  comfort: "Rest and water",
  firstAid: "Not discussed",
  urgentConcerns: "None she mentioned",
  forClinician: "This is not a diagnosis. She feels tired.",
};

test("parseTurn accepts a spoken question and drops a mid-check-in summary", () => {
  const turn = parseTurn(
    JSON.stringify({
      reply: "Thank you. How did you sleep?",
      phase: "concern",
      urgent: false,
      urgentKind: "none",
      summary,
    }),
  );
  assert.ok(turn);
  assert.equal(turn?.phase, "concern");
  assert.equal(turn?.summary, null);
});

test("parseTurn requires a summary when the check-in closes", () => {
  assert.equal(
    parseTurn(
      JSON.stringify({
        reply: "Here is a summary.",
        phase: "summary",
        urgent: false,
        urgentKind: "none",
        summary: null,
      }),
    ),
    null,
  );
  const turn = parseTurn(
    JSON.stringify({
      reply: "Here is a short summary you can show a doctor. Khuda hafiz.",
      phase: "summary",
      urgent: false,
      urgentKind: "none",
      summary,
    }),
  );
  assert.equal(turn?.summary?.wellbeing, "Tired");
  assert.equal(turn?.summary?.concern, "Headache");
});
