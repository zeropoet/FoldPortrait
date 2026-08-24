#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reflections = path.join(root, "Output/reflections");
const cycles = JSON.parse(fs.readFileSync(path.join(reflections, "reflection-ledger.json"), "utf8"));
const learned = cycles.filter((cycle) => cycle.sequence > 6);
const checkpoint = JSON.parse(fs.readFileSync(
  path.join(reflections, "research/pre-learning-post-0006/manifest.json"),
  "utf8",
));

const fail = (message) => { throw new Error(`Reflection diversity verification failed: ${message}`); };
if (learned.length === 0) fail("no post-calibration cycles exist");
if (learned.some((cycle) => cycle.compositionRegime !== "learned-composition-v1")) {
  fail("a post-calibration cycle is outside learned-composition-v1");
}
if (new Set(learned.map((cycle) => cycle.compositionSeason)).size < 5) {
  fail("the full compositional season cycle is not represented");
}
if (new Set(learned.map((cycle) => cycle.paletteID)).size < 4) {
  fail("palette diversity fell below four families");
}
if (new Set(learned.map((cycle) => cycle.correlations.length)).size < 3) {
  fail("active relation counts collapsed");
}

const signature = (cycle) => JSON.stringify({
  relations: cycle.correlations.map(({ left, right, visualRule }) => ({ left, right, visualRule })),
  season: cycle.compositionSeason,
  palette: cycle.paletteID,
});
for (let index = 1; index < learned.length; index += 1) {
  if (signature(learned[index - 1]) === signature(learned[index])) {
    fail(`${learned[index].cycleID} repeats the preceding composition`);
  }
}

const checkpointByID = new Map(checkpoint.records.map((record) => [record.cycleID, record]));
for (const cycle of learned) {
  const recorded = checkpointByID.get(cycle.cycleID);
  if (!recorded || recorded.witnessDigest !== cycle.witnessDigest) {
    fail(`${cycle.cycleID} is not bound to its preserved pre-learning witness`);
  }
}

process.stdout.write(`Verified ${learned.length} learned reflections across ${new Set(learned.map((cycle) => cycle.paletteID)).size} palettes and ${new Set(learned.map((cycle) => cycle.compositionSeason)).size} seasons.\n`);
