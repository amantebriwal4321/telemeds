import assert from "node:assert/strict";
import test from "node:test";

import { downsample, mixToMono } from "./pcm.ts";

test("mono mix and resample keep a steady tone", () => {
  const left = new Float32Array([0.5, 0.5, 0.5, 0.5]);
  const right = new Float32Array([0.5, 0.5, 0.5, 0.5]);
  const mono = mixToMono([left, right]);
  assert.equal(mono.length, 4);
  assert.ok(Math.abs(mono[0] - 0.5) < 0.001);
  const slower = downsample(mono, 4, 2);
  assert.equal(slower.length, 2);
  assert.ok(Math.abs(slower[0] - 0.5) < 0.001);
});
