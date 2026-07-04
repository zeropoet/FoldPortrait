const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const foldRoot = path.resolve(__dirname, "..");
const ssRoot = process.argv[2] || "/Users/zeropoet/WebstormProjects/sovereign-standard";
const publicSite = "https://sovereignstandard.co";
const witnessWallet = "rfYiNfgLefTAZGfEyun1EjG68mTtC75vDe";
const network = "MAINNET";
const collectionID = "foldportrait-complete-collection";
const collectionName = "FoldPortrait Complete Collection";
const taxon = 20260704;
const now = new Date().toISOString();

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function stringToHex(value) {
  return Buffer.from(String(value || ""), "utf8").toString("hex").toUpperCase();
}

function pngDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`Not a PNG: ${filePath}`);
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function versionOf(entry) {
  const match = String(entry.iteration || "").match(/^v(\d+)(?:\.(\d+))?$/);
  return {
    anchor: Number(entry.sourceIteration ?? match?.[1] ?? 0),
    revision: Number(entry.revision ?? match?.[2] ?? 1),
  };
}

function repoPath(...parts) {
  return parts.join("/").replace(/\/+/g, "/");
}

function publicURL(filePath) {
  return `${publicSite}/${filePath.replace(/^\/+/, "")}`;
}

const ledgerPath = path.join(foldRoot, "Output/iterations/evolution.json");
const ledger = readJSON(ledgerPath).sort((left, right) => {
  const leftVersion = versionOf(left);
  const rightVersion = versionOf(right);
  return leftVersion.revision - rightVersion.revision
    || leftVersion.anchor - rightVersion.anchor
    || String(left.iteration).localeCompare(String(right.iteration));
});

const archiveRoot = path.join(ssRoot, "witness/archive");
const batchRoot = path.join(ssRoot, "witness/batches");
fs.mkdirSync(batchRoot, { recursive: true });

const works = [];

for (const entry of ledger) {
  const sourceSVGBase = path.basename(entry.svgPath || "").replace(/\.svg$/, "");
  const artifactID = sourceSVGBase;
  const title = `FoldPortrait ${entry.iteration}`;
  const pngName = `${sourceSVGBase}.png`;
  const sourcePNG = path.join(foldRoot, "Output/png", pngName);

  if (!fs.existsSync(sourcePNG)) {
    throw new Error(`Missing rendered PNG: ${sourcePNG}`);
  }

  const artifactDir = path.join(archiveRoot, artifactID);
  fs.mkdirSync(artifactDir, { recursive: true });

  const archivedPNG = path.join(artifactDir, pngName);
  fs.copyFileSync(sourcePNG, archivedPNG);

  const hash = sha256(archivedPNG);
  const byteSize = fs.statSync(archivedPNG).size;
  const dimensions = pngDimensions(archivedPNG);
  const sequence = works.length + 1;

  const imageFile = repoPath("witness/archive", artifactID, pngName);
  const manifestFile = repoPath("witness/archive", artifactID, "manifest.json");
  const metadataFile = repoPath("witness/archive", artifactID, "metadata.json");
  const imageURL = publicURL(imageFile);
  const manifestURL = publicURL(manifestFile);
  const metadataURL = publicURL(metadataFile);
  const entryVersion = versionOf(entry);
  const description = [
    `FoldPortrait ${entry.iteration}, from the completed zero poet archive.`,
    `This XRPL Witness draft preserves the PNG render, convergence hash ${entry.convergenceHash},`,
    `and render hash ${entry.renderHash || "unavailable"}.`,
  ].join(" ");

  const manifest = {
    schema: "sovereign_standard_witness_archive_v1",
    archive_layer: "operating-archive-v0",
    archived_at: now,
    updated_at: now,
    artifact_id: artifactID,
    artifact_class: "canonical_witness_work",
    canonical_status: "canonical_work",
    title,
    description,
    source_project: "FoldPortrait",
    source_iteration: entry.sourceIteration ?? entryVersion.anchor,
    revision: entry.revision ?? entryVersion.revision,
    source_svg: path.relative(ssRoot, path.join(foldRoot, "Output/iterations", `${sourceSVGBase}.svg`)),
    source_ledger: path.relative(ssRoot, ledgerPath),
    source_file: imageFile,
    archived_file: imageFile,
    metadata_file: metadataFile,
    metadata_url: metadataURL,
    mime_type: "image/png",
    byte_size: byteSize,
    dimensions,
    sha256: hash,
    mint_status: "prepared",
    public_private_status: "public_xrpl_witness_record_prepared",
    collection: {
      id: collectionID,
      name: collectionName,
      sequence,
      total: ledger.length,
    },
    access: {
      mode: "public_archive",
      visible_on_units: [0],
    },
    foldportrait: {
      iteration: entry.iteration,
      seed: entry.seed,
      convergence_hash: entry.convergenceHash,
      render_hash: entry.renderHash || null,
      memory_signature: entry.memorySignature,
      refinement_depth: entry.refinementDepth,
      structural_identity: entry.structuralIdentity || null,
      growth_climate: entry.growthClimate || null,
    },
    verification: {
      command: "npm run verify:witness-archive",
      checks: [
        "archived file exists",
        "archived file sha256 matches manifest",
        "source file sha256 matches manifest",
        "source and archived bytes match",
        "metadata hash matches manifest",
      ],
    },
    xrpl: {
      network,
      witness_wallet: witnessWallet,
      transaction_type: "NFTokenMint",
      transaction_hash: null,
      nftoken_id: null,
      payload_uuid: null,
      transaction_result: null,
      validated: false,
    },
  };

  const metadata = {
    name: title,
    description,
    image: imageURL,
    external_url: manifestURL,
    attributes: [
      { trait_type: "Archive Layer", value: "operating-archive-v0" },
      { trait_type: "Artifact Class", value: "canonical_witness_work" },
      { trait_type: "Canonical Status", value: "canonical_work" },
      { trait_type: "Access Authority", value: "public_archive" },
      { trait_type: "Collection", value: collectionName },
      { trait_type: "FoldPortrait Iteration", value: entry.iteration },
      { trait_type: "Source Seed", value: entry.seed || "zero poet" },
    ],
    sovereign_standard: {
      schema: "sovereign_standard_witness_metadata_v1",
      artifact_id: artifactID,
      file_sha256: hash,
      manifest_url: manifestURL,
      visible_on_units: [0],
      collection: {
        id: collectionID,
        name: collectionName,
        sequence,
        total: ledger.length,
      },
      foldportrait: {
        iteration: entry.iteration,
        convergence_hash: entry.convergenceHash,
        render_hash: entry.renderHash || null,
        memory_signature: entry.memorySignature,
      },
      xrpl: {
        transaction_hash: null,
        nftoken_id: null,
        witness_wallet: witnessWallet,
        network,
      },
    },
  };

  writeJSON(path.join(artifactDir, "manifest.json"), manifest);
  writeJSON(path.join(artifactDir, "metadata.json"), metadata);

  const memo = {
    work_id: artifactID,
    title,
    file_sha256: hash,
    access_authority: "public_archive",
    collection: collectionID,
    foldportrait_iteration: entry.iteration,
  };
  const xrplTransaction = {
    TransactionType: "NFTokenMint",
    Account: witnessWallet,
    NFTokenTaxon: taxon,
    Flags: 0,
    URI: stringToHex(metadataURL),
    Memos: [
      {
        Memo: {
          MemoType: stringToHex("sovereign-standard:witness"),
          MemoData: stringToHex(JSON.stringify(memo)),
        },
      },
    ],
  };

  works.push({
    artifact_id: artifactID,
    title,
    description,
    iteration: entry.iteration,
    sequence,
    file: imageFile,
    metadata_file: metadataFile,
    manifest_file: manifestFile,
    image_url: imageURL,
    metadata_uri: metadataURL,
    sha256: hash,
    byte_size: byteSize,
    dimensions,
    xrpl_transaction: xrplTransaction,
    wallet_handoff: {
      ready: true,
      wallet: witnessWallet,
      network: "xrpl",
      transaction_type: "NFTokenMint",
      boundary: "xrpl_wallet_signs_archive_records",
    },
  });
}

const batch = {
  schema: "sovereign_standard_witness_batch_mint_v1",
  created_at: now,
  status: "prepared_unsigned",
  collection: {
    id: collectionID,
    name: collectionName,
    work_count: works.length,
    taxon,
  },
  rail: "xrpl",
  network,
  witness_wallet: witnessWallet,
  signing_app: "Witness",
  signing_boundary: "xaman_wallet_signs_each_nftokenmint",
  metadata_uri_rule: "https://sovereignstandard.co/witness/archive/<artifact-id>/metadata.json",
  source: {
    project: "FoldPortrait",
    ledger: path.relative(ssRoot, ledgerPath),
    png_directory: path.relative(ssRoot, path.join(foldRoot, "Output/png")),
  },
  instructions: [
    "Open Witness with the configured wallet.",
    "For each work, use the listed PNG, title, description, metadata_uri, and prepared NFTokenMint transaction fields.",
    "After Xaman signing, record transaction_hash, nftoken_id, payload_uuid, and validation result in the work manifest, then rebuild and verify the witness archive.",
  ],
  works,
};

const batchFile = path.join(batchRoot, `${collectionID}.json`);
writeJSON(batchFile, batch);

console.log(JSON.stringify({
  prepared: works.length,
  batch: batchFile,
  first: works[0]?.artifact_id || null,
  last: works.at(-1)?.artifact_id || null,
}, null, 2));
