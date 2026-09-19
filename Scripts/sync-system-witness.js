#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projects = resolve(root, "..");
const paths = {
  foldportrait: root,
  foldkernel: resolve(projects, "FoldKernel"),
  foldforge: resolve(projects, "FoldForge"),
  rootLogos: resolve(projects, "root-logos"),
  telos: resolve(projects, "..", "Documents", "Telos"),
};

for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!flag?.startsWith("--") || !value) throw new Error(`Invalid path override: ${flag || "<missing>"}`);
  const key = flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  if (!(key in paths)) throw new Error(`Unknown repository path: ${flag}`);
  paths[key] = resolve(value);
}

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const git = (repository, format) => execFileSync("git", ["-C", repository, "show", "-s", `--format=${format}`, "HEAD"], { encoding: "utf8" }).trim();
const revision = (repository) => git(repository, "%H");
const repositoryObservedAt = Math.max(...Object.values(paths).map((repository) => Date.parse(git(repository, "%cI"))));
const observedAt = new Date(repositoryObservedAt).toISOString();

const rootComposition = json(resolve(paths.rootLogos, "works/library-composition.json"));
const cultivation = json(resolve(paths.rootLogos, "cultivation/state.json"));
const attractors = json(resolve(paths.rootLogos, "content/attractor-packets.json"));
const registry = json(resolve(paths.rootLogos, "sources/registry.json"));
const foldforge = json(resolve(paths.rootLogos, "sources/foldforge.snapshot.json"));
const portraitWitness = json(resolve(paths.rootLogos, "sources/foldportrait.snapshot.json"));
const telosMap = json(resolve(paths.telos, "SYSTEM_MAP.json"));
const telosPolicy = json(resolve(paths.telos, "deploy/linux/sovereign-standard-acquisition.prepare.json"));
const sovereignStandard = json(resolve(paths.rootLogos, "sources/sovereign-standard.public-witness.json"));
const firstEra = json(resolve(paths.foldportrait, "Output/iterations/evolution.json"));
const firstEraDigest = createHash("sha256")
  .update(readFileSync(resolve(paths.foldportrait, "Output/iterations/evolution.json")))
  .digest("hex");

const measurement = (id, label, unit, value) => ({ id, label, unit, value });
const witness = {
  schema: "foldportrait-system-witness/v1",
  systemID: "sovereign-standard-relational-system",
  observedAt,
  sources: [
    {
      id: "foldkernel",
      revision: revision(paths.foldkernel),
      role: "deterministic identity and coherence substrate",
      measurements: [
        measurement("permutation_size", "Canonical permutation positions", "positions", 16),
        measurement("symmetry_transforms", "D4 symmetry transforms", "transforms", 8),
        measurement("memory_event_kinds", "Fold memory event kinds", "event-kinds", 3),
        measurement("convergence_hash_bits", "Convergence hash width", "bits", 256),
      ],
    },
    {
      id: "foldportrait",
      revision: `sealed-era:${firstEraDigest}`,
      role: "sealed visual lineage and change-triggered system self-reflection",
      measurements: [
        measurement("sealed_first_era_portraits", "Sealed first-era portraits", "portraits", firstEra.length),
        measurement("first_era_anchors", "First-era anchor lineages", "anchors", new Set(firstEra.map(({ sourceIteration, iteration }) => sourceIteration || Number(/^v(\d+)/.exec(iteration)?.[1]))).size),
        measurement("embodied_portraits", "Portraits embodied by Sovereign Standard", "portraits", portraitWitness.measures.embodied_renders),
      ],
    },
    {
      id: "root-logos",
      revision: revision(paths.rootLogos),
      role: "constitutional orientation, library composition, and cultivation",
      measurements: [
        measurement("coherent_works", "Coherent Library works", "works", rootComposition.measures.works),
        measurement("witnessed_relations", "Witnessed Library relations", "relations", rootComposition.measures.relations),
        measurement("cultivation_cycles", "Completed cultivation cycles", "cycles", Math.max(0, cultivation.next_cycle - 1)),
        measurement("x_witnessed_fragments", "X-witnessed founding fragments", "fragments", attractors.packets.filter(({ publication }) => publication?.status === "published").length),
        measurement("founding_fragments", "Mapped founding fragments", "fragments", attractors.packets.length),
        measurement("connected_sources", "Bounded connected sources", "sources", registry.sources.length),
      ],
    },
    {
      id: "foldforge",
      revision: revision(paths.foldforge),
      role: "evidence-bound composition grammar",
      measurements: [
        measurement("compositions", "Governed compositions", "compositions", foldforge.compositions.length),
        measurement("witnessed_relations", "Witnessed compositional relations", "relations", foldforge.relations.length),
        measurement("primitives", "Composition primitives", "primitives", foldforge.primitives.length),
        measurement("movement_phases", "Resonant movement phases", "phases", foldforge.movement.length),
        measurement("displacement_steps", "Root-to-crown displacement steps", "steps", 64),
      ],
    },
    {
      id: "telos",
      revision: revision(paths.telos),
      role: "bounded Sovereign Standard customer-acquisition operator and system mapper",
      measurements: [
        measurement("mapped_repositories", "Mapped system repositories", "repositories", telosMap.repositories.length),
        measurement("operating_components", "Mapped operating components", "components", telosMap.operating_components.length),
        measurement("prepared_campaigns", "Bounded prepared campaigns", "campaigns", telosPolicy.audiences.length * telosPolicy.themes.length),
        measurement("maximum_active_campaigns", "Maximum simultaneously active campaigns", "campaigns", 1),
        measurement("first_subscriber_threshold", "First subscriber threshold", "subscribers", telosMap.success_ladder[0].target),
        measurement("second_subscriber_threshold", "Second subscriber threshold", "subscribers", telosMap.success_ladder[1].target),
      ],
    },
    {
      id: "sovereign-standard",
      revision: sovereignStandard.witness,
      role: "material practice, monthly collection, and embodied continuation",
      measurements: [
        measurement("published_vessel_records", "Published Black Tin Vessel records", "records", sovereignStandard.public_state.published_vessel_records),
        measurement("embodied_foldportraits", "Embodied FoldPortrait lineages", "portraits", portraitWitness.measures.embodied_renders),
      ],
    },
  ],
  boundaries: [
    "aggregate-public-measurements-only",
    "no-personal-data",
    "no-private-orders",
    "no-credentials",
    "no-causal-claims-from-correlation",
    "source-authority-remains-separate",
  ],
};

const destination = resolve(root, "Reflection/system-witness.json");
writeFileSync(destination, `${JSON.stringify(witness, null, 2)}\n`);
process.stdout.write(`FoldPortrait system witness synchronized at ${observedAt}.\n`);
