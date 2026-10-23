import assert from "node:assert/strict";
import test from "node:test";

import { formatSummary } from "./summary.ts";

test("the clinician summary says it is not a diagnosis", () => {
  const text = formatSummary({
    wellbeing: "Low",
    concern: "Back pain",
    comfort: "Rest and water",
    firstAid: "Not discussed",
    urgentConcerns: "None she mentioned",
    forClinician: "This is not a diagnosis. She reports back pain.",
  });
  assert.match(text, /Not a diagnosis/);
  assert.match(text, /Back pain/);
  assert.match(text, /did not save it/);
});
