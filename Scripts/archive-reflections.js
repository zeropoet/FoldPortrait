#!/usr/bin/env node

import { Resvg } from "@resvg/resvg-js";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "Output/reflections");
const pngDirectory = resolve(output, "png");
const mintDirectory = resolve(output, "mint");
const archivePath = resolve(output, "archive.json");
const brandSVGPath = resolve(root, "Brand/foldportrait-mark.svg");
const brandPNGPath = resolve(root, "Brand/foldportrait-mark-white.png");
const verifyOnly = process.argv.includes("--verify");
const cycles = JSON.parse(readFileSync(resolve(output, "reflection-ledger.json"), "utf8"));

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (path) => path.replace(`${root}/`, "");
const pngDimensions = (bytes) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });

const brandSVG = readFileSync(brandSVGPath);
const brandRenderer = new Resvg(brandSVG, {
  background: "#ffffff",
  fitTo: { mode: "width", value: 2048 },
});
const expectedBrandPNG = brandRenderer.render().asPng();
if (!verifyOnly) {
  mkdirSync(pngDirectory, { recursive: true });
  mkdirSync(mintDirectory, { recursive: true });
  writeFileSync(brandPNGPath, expectedBrandPNG);
}
if (!existsSync(brandPNGPath)) throw new Error("Missing white-background FoldPortrait mark PNG.");
const storedBrandPNG = readFileSync(brandPNGPath);
if (hash(storedBrandPNG) !== hash(expectedBrandPNG)) throw new Error("FoldPortrait mark PNG is stale.");
const brandDimensions = pngDimensions(storedBrandPNG);
if (brandDimensions.width !== 2048 || brandDimensions.height !== 2048) {
  throw new Error(`Unexpected brand PNG dimensions: ${brandDimensions.width}x${brandDimensions.height}`);
}

const archivedCycles = cycles.map((cycle) => {
  const stem = `foldportrait-reflection-${String(cycle.sequence).padStart(4, "0")}`;
  const svgPath = resolve(root, cycle.artifact);
  const pngPath = resolve(pngDirectory, `${stem}.png`);
  const mintPath = resolve(mintDirectory, `${stem}.json`);
  const svg = readFileSync(svgPath);
  if (!verifyOnly) {
    const renderer = new Resvg(svg, {
      background: "#ffffff",
      fitTo: { mode: "width", value: 2400 },
    });
    writeFileSync(pngPath, renderer.render().asPng());
  }
  if (!existsSync(pngPath)) throw new Error(`Missing flattened PNG: ${relative(pngPath)}`);
  const png = readFileSync(pngPath);
  const dimensions = pngDimensions(png);
  if (dimensions.width !== 2400 || dimensions.height !== 3200) {
    throw new Error(`Unexpected PNG dimensions for ${cycle.cycleID}: ${dimensions.width}x${dimensions.height}`);
  }
  const record = {
    schema: "foldportrait-reflection-archive-entry/v1",
    era: 2,
    cycleID: cycle.cycleID,
    sequence: cycle.sequence,
    witnessedAt: cycle.witnessedAt,
    previousCycleID: cycle.previousCycleID || null,
    witnessDigest: cycle.witnessDigest,
    foldKernelIdentity: cycle.foldKernelIdentity,
    renderHash: cycle.renderHash,
    chosenRules: cycle.chosenRules,
    correlationCount: cycle.correlations.length,
    svg: { path: cycle.artifact, mimeType: "image/svg+xml", sha256: hash(svg) },
    png: { path: relative(pngPath), mimeType: "image/png", sha256: hash(png), dimensions },
    notesPath: cycle.notes,
    mint: {
      status: "prepared_unsigned",
      network: "XRPL mainnet",
      transactionType: "NFTokenMint",
      signingAuthority: "human steward through Xaman",
      payloadPath: relative(mintPath),
    },
    boundary: "Prepared for witness only. FoldPortrait cannot sign, submit, transfer, or claim XRPL value.",
  };
  const mint = {
    schema: "foldportrait-xrpl-mint-candidate/v1",
    status: "prepared_unsigned",
    title: `FoldPortrait ${cycle.cycleID}`,
    description: `Autonomous system reflection ${cycle.cycleID}, preserving its FoldKernel identity, public witness digest, and prior-cycle lineage.`,
    image: record.png,
    source: record.svg,
    lineage: {
      era: 2,
      cycleID: cycle.cycleID,
      previousCycleID: cycle.previousCycleID || null,
      witnessDigest: cycle.witnessDigest,
      foldKernelIdentity: cycle.foldKernelIdentity,
      renderHash: cycle.renderHash,
    },
    xrpl: {
      network: "mainnet",
      transactionType: "NFTokenMint",
      account: null,
      nftokenTaxon: null,
      uri: null,
      flags: null,
      signed: false,
      submitted: false,
      validated: false,
    },
    handoff: "A human steward must publish durable metadata, review the transaction fields, and sign with Xaman.",
  };
  if (verifyOnly) {
    if (!existsSync(mintPath)) throw new Error(`Missing mint candidate: ${relative(mintPath)}`);
    const stored = JSON.parse(readFileSync(mintPath, "utf8"));
    if (JSON.stringify(stored) !== JSON.stringify(mint)) throw new Error(`Stale mint candidate: ${relative(mintPath)}`);
  } else {
    writeFileSync(mintPath, `${JSON.stringify(mint, null, 2)}\n`);
  }
  return record;
});

const archive = {
  schema: "foldportrait-lineage-archive/v1",
  eras: [
    {
      era: 1,
      id: "sealed-portrait-lineage",
      title: "Sealed Portrait Lineage",
      status: "complete",
      ledgerPath: "Output/iterations/evolution.json",
      portraitCount: 52,
      anchorCount: 12,
    },
    {
      era: 2,
      id: "autonomous-system-reflection",
      title: "Autonomous System Reflection",
      status: "growing-on-witness-change",
      previousEra: "sealed-portrait-lineage",
      cycles: archivedCycles,
    },
  ],
  currentCycleID: archivedCycles.at(-1)?.cycleID || null,
  mintingBoundary: "Archive preparation is autonomous; XRPL publication and Xaman signing are human-authorized acts.",
};

if (verifyOnly) {
  const stored = JSON.parse(readFileSync(archivePath, "utf8"));
  if (JSON.stringify(stored) !== JSON.stringify(archive)) throw new Error("Reflection archive index is stale.");
  process.stdout.write(`Verified ${archivedCycles.length} dual-format reflection archives.\n`);
} else {
  writeFileSync(archivePath, `${JSON.stringify(archive, null, 2)}\n`);
  process.stdout.write(`Archived ${archivedCycles.length} reflections as SVG + flattened PNG.\n`);
}
