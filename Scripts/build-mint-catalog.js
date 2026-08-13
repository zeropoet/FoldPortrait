import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ssRoot = process.argv.includes("--ss-root") ? path.resolve(process.argv[process.argv.indexOf("--ss-root") + 1]) : null;
const verifyOnly = process.argv.includes("--verify");
const mintRoot = path.join(root, "Mint");
const metadataRoot = path.join(mintRoot, "metadata");
const publicRoot = "https://zeropoet.github.io/FoldPortrait";
const witnessWallet = "rfYiNfgLefTAZGfEyun1EjG68mTtC75vDe";

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const write = (file, value) => {
  const content = serialize(value);
  if (verifyOnly) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) throw new Error(`Stale mint artifact: ${path.relative(root, file)}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const hex = (value) => Buffer.from(String(value), "utf8").toString("hex").toUpperCase();

const catalogPath = path.join(mintRoot, "catalog.json");
if (!fs.existsSync(catalogPath) && !ssRoot) throw new Error("Initial authority migration requires --ss-root /path/to/sovereign-standard");
const existing = fs.existsSync(catalogPath) ? read(catalogPath) : { works: [] };
const existingByID = new Map(existing.works.map((work) => [work.artifact_id, work]));
const batch = ssRoot ? read(path.join(ssRoot, "witness/batches/foldportrait-complete-collection.json")) : { collection: { taxon: 0 }, works: existing.works.filter((work) => work.era === 1 || !work.era) };
const priorIndex = ssRoot ? read(path.join(ssRoot, "witness-archive-index.json")) : { works: [] };
const priorByID = new Map(priorIndex.works.map((work) => [work.artifact_id, work]));

const firstEra = batch.works.map((source, offset) => {
  const artifactID = source.artifact_id;
  const pngName = path.basename(source.file || source.source_file);
  const pngPath = path.join(root, "Output/png", pngName);
  if (!fs.existsSync(pngPath)) throw new Error(`FoldPortrait source missing: Output/png/${pngName}`);
  const digest = sha256(pngPath);
  if (source.sha256 && digest !== source.sha256) throw new Error(`${artifactID}: FoldPortrait and prepared catalog bytes differ`);
  const prior = existingByID.get(artifactID) || priorByID.get(artifactID) || {};
  const imageURL = `${publicRoot}/Output/png/${encodeURIComponent(pngName)}`;
  const metadataURL = `${publicRoot}/Mint/metadata/${encodeURIComponent(artifactID)}.json`;
  const metadata = {
    schema: "foldportrait-xrpl-metadata/v1",
    name: source.title,
    description: source.description,
    image: imageURL,
    external_url: `${publicRoot}/#era-1/${encodeURIComponent(artifactID)}`,
    attributes: [
      { trait_type: "System", value: "FoldPortrait" },
      { trait_type: "Era", value: "First Era" },
      { trait_type: "Sequence", value: source.sequence || offset + 1 },
      ...(source.convergence_hash ? [{ trait_type: "Convergence Hash", value: source.convergence_hash }] : []),
      { trait_type: "File SHA-256", value: digest }
    ],
    provenance: { repository: "https://github.com/zeropoet/FoldPortrait", source_file: `Output/png/${pngName}`, file_sha256: digest },
    xrpl: prior.xrpl || null
  };
  write(path.join(metadataRoot, `${artifactID}.json`), metadata);
  const transaction = {
    TransactionType: "NFTokenMint",
    Account: witnessWallet,
    NFTokenTaxon: Number(source.xrpl_transaction?.NFTokenTaxon || batch.collection?.taxon || 0),
    Flags: Number(source.xrpl_transaction?.Flags || 0),
    URI: hex(metadataURL),
    Memos: [{ Memo: { MemoType: hex("foldportrait:ledger-witness"), MemoData: hex(JSON.stringify({ artifact_id: artifactID, file_sha256: digest })) } }]
  };
  return {
    sequence: source.sequence || offset + 1,
    era: 1,
    artifact_id: artifactID,
    title: source.title,
    description: source.description,
    image: imageURL,
    source_file: `Output/png/${pngName}`,
    sha256: digest,
    byte_size: fs.statSync(pngPath).size,
    metadata_uri: metadataURL,
    metadata_file: `Mint/metadata/${artifactID}.json`,
    mint_status: prior.mint_status || "prepared",
    xrpl: prior.xrpl || null,
    xrpl_transaction: transaction
  };
});

const reflectionRoot = path.join(root, "Output/reflections/mint");
const reflections = fs.existsSync(reflectionRoot) ? fs.readdirSync(reflectionRoot).filter((name) => name.endsWith(".json")).sort().map((name, offset) => {
  const candidate = read(path.join(reflectionRoot, name));
  const artifactID = path.basename(name, ".json");
  const prior = existingByID.get(artifactID) || {};
  const imagePath = candidate.image.path;
  const absoluteImage = path.join(root, imagePath);
  const digest = sha256(absoluteImage);
  if (digest !== candidate.image.sha256) throw new Error(`${artifactID}: reflection PNG hash differs from its mint candidate`);
  const sequence = firstEra.length + offset + 1;
  const imageURL = `${publicRoot}/${imagePath.split("/").map(encodeURIComponent).join("/")}`;
  const metadataURL = `${publicRoot}/Mint/metadata/${encodeURIComponent(artifactID)}.json`;
  const metadata = {
    schema: "foldportrait-xrpl-metadata/v1",
    name: candidate.title,
    description: candidate.description,
    image: imageURL,
    external_url: `${publicRoot}/#era-2/${encodeURIComponent(artifactID)}`,
    attributes: [
      { trait_type: "System", value: "FoldPortrait" },
      { trait_type: "Era", value: "Autonomous System Reflection" },
      { trait_type: "Sequence", value: sequence },
      { trait_type: "Witness Digest", value: candidate.lineage.witnessDigest },
      { trait_type: "File SHA-256", value: digest }
    ],
    provenance: { repository: "https://github.com/zeropoet/FoldPortrait", source_file: imagePath, file_sha256: digest },
    xrpl: prior.xrpl || null
  };
  write(path.join(metadataRoot, `${artifactID}.json`), metadata);
  return {
    sequence,
    era: 2,
    artifact_id: artifactID,
    title: candidate.title,
    description: candidate.description,
    image: imageURL,
    source_file: imagePath,
    sha256: digest,
    byte_size: fs.statSync(absoluteImage).size,
    metadata_uri: metadataURL,
    metadata_file: `Mint/metadata/${artifactID}.json`,
    mint_status: prior.mint_status || "prepared",
    xrpl: prior.xrpl || null,
    xrpl_transaction: {
      TransactionType: "NFTokenMint",
      Account: witnessWallet,
      NFTokenTaxon: 0,
      Flags: 0,
      URI: hex(metadataURL),
      Memos: [{ Memo: { MemoType: hex("foldportrait:ledger-witness"), MemoData: hex(JSON.stringify({ artifact_id: artifactID, file_sha256: digest })) } }]
    }
  };
}) : [];
const works = [...firstEra, ...reflections];

write(catalogPath, {
  schema: "foldportrait-mint-catalog/v1",
  authority: "FoldPortrait",
  issuance_channel: "FoldForge Ledger Witness",
  signing_boundary: "human steward through Xaman",
  public_root: publicRoot,
  work_count: works.length,
  works
});
console.log(`${verifyOnly ? "Verified" : "Prepared"} ${works.length} FoldPortrait-owned mint records.`);
