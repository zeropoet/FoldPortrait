import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "Mint/collection-policy.json"), "utf8")).declaration;
const ledger = JSON.parse(fs.readFileSync(path.join(root, "Output/reflections/reflection-ledger.json"), "utf8"));
const candidate = ledger.at(-1);
const prior = ledger.slice(0, -1);
const resultPath = path.join(root, "Output/reflections/admission.json");
const writeResult = (result) => fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);

if (!candidate) throw new Error("No reflection candidate exists");
if (candidate.sequence > policy.reflection_supply_ceiling) {
  writeResult({ schema: "foldportrait-admission/v1", admitted: false, candidate: candidate.cycleID, reason: "canonical-collection-closed", score: 0 });
  console.log(`${candidate.cycleID} remains private: the canonical collection is closed.`);
  process.exit(0);
}
if (candidate.sequence < policy.effective_at_sequence - policy.first_era_supply) {
  writeResult({ schema: "foldportrait-admission/v1", admitted: true, candidate: candidate.cycleID, reason: "pre-selective-lineage", score: 1 });
  process.exit(0);
}

const recent = prior.slice(-8);
const pair = (cycle) => `${cycle.compositionSeason || "none"}/${cycle.paletteID || "none"}`;
const candidateRules = new Set(candidate.chosenRules || []);
const ruleDistance = (cycle) => {
  const other = new Set(cycle.chosenRules || []);
  const union = new Set([...candidateRules, ...other]);
  const shared = [...candidateRules].filter((rule) => other.has(rule)).length;
  return union.size ? 1 - shared / union.size : 0;
};
const nearestRuleDistance = recent.length ? Math.min(...recent.map(ruleDistance)) : 1;
const magnitude = Number(candidate.changeMagnitude || 0);
const magnitudeScore = Math.min(1, magnitude / 0.025);
const paletteNovelty = recent.slice(-4).some((cycle) => cycle.paletteID === candidate.paletteID) ? 0 : 1;
const seasonNovelty = recent.slice(-2).some((cycle) => cycle.compositionSeason === candidate.compositionSeason) ? 0 : 1;
const pairingNovelty = recent.some((cycle) => pair(cycle) === pair(candidate)) ? 0 : 1;
const relationShift = recent.at(-1)?.correlations?.length === candidate.correlations?.length ? 0 : 1;
const score = Number((
  magnitudeScore * 0.30 +
  nearestRuleDistance * 0.30 +
  paletteNovelty * 0.12 +
  seasonNovelty * 0.08 +
  pairingNovelty * 0.12 +
  relationShift * 0.08
).toFixed(6));
const admitted = score >= 0.44 && candidate.witnessDigest !== prior.at(-1)?.witnessDigest;
const result = {
  schema: "foldportrait-admission/v1",
  admitted,
  candidate: candidate.cycleID,
  score,
  threshold: 0.44,
  evidence: { change_magnitude: magnitude, nearest_rule_distance: nearestRuleDistance, palette_novelty: paletteNovelty, season_novelty: seasonNovelty, pairing_novelty: pairingNovelty, relation_count_shift: relationShift },
  reason: admitted ? "material-compositional-difference" : "insufficient-material-difference"
};
writeResult(result);
console.log(`${candidate.cycleID} ${admitted ? "admitted" : "remains private"}: ${result.reason} (${score.toFixed(3)} / 0.440).`);
