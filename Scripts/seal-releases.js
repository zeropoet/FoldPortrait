import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifyOnly = process.argv.includes("--verify");
const mintRoot = path.join(root, "Mint");
const sealsRoot = path.join(mintRoot, "seals");
const authorityPath = path.join(mintRoot, "seal-authority.json");
const ledgerPath = path.join(mintRoot, "seal-ledger.json");
const policyPath = path.join(mintRoot, "collection-policy.json");

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const digest = (value) => crypto.createHash("sha256").update(
  typeof value === "string" || Buffer.isBuffer(value) ? value : canonical(value)
).digest("hex");
const fileDigest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, serialize(value));
};
const fail = (message) => { throw new Error(message); };

if (!fs.existsSync(authorityPath)) fail("Missing Mint/seal-authority.json");
const authority = read(authorityPath);
const publicKey = crypto.createPublicKey(authority.public_key_pem);
const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
const fingerprint = digest(publicKeyDer);
if (fingerprint !== authority.public_key_sha256) fail("Seal authority public-key fingerprint differs");

const catalog = read(path.join(mintRoot, "catalog.json"));
const existingLedger = fs.existsSync(ledgerPath) ? read(ledgerPath) : null;
const existingEntries = existingLedger?.entries || [];
if (existingEntries.length > catalog.works.length) fail("Seal ledger cannot shrink to the current catalog");

const privateKeyPem = process.env.FP_RELEASE_SIGNING_KEY;
const privateKey = privateKeyPem ? crypto.createPrivateKey(privateKeyPem) : null;
if (!verifyOnly && !privateKey && existingEntries.length !== catalog.works.length) {
  fail("FP_RELEASE_SIGNING_KEY is required to seal new releases");
}
if (privateKey) {
  const derived = crypto.createPublicKey(privateKey).export({ type: "spki", format: "der" });
  if (!crypto.timingSafeEqual(derived, publicKeyDer)) fail("Signing key does not match the published seal authority");
}

const policy = read(policyPath);
const policyDigest = digest(policy.declaration);
if (policy.declaration_sha256 && policy.declaration_sha256 !== policyDigest) fail("Collection policy declaration changed");
if (!policy.signature && !verifyOnly) {
  if (!privateKey) fail("Signing key is required to ratify the collection policy");
  policy.declaration_sha256 = policyDigest;
  policy.signature = crypto.sign(null, Buffer.from(canonical(policy.declaration)), privateKey).toString("base64");
  write(policyPath, policy);
}
if (!policy.signature || !crypto.verify(null, Buffer.from(canonical(policy.declaration)), publicKey, Buffer.from(policy.signature, "base64"))) {
  fail("Collection policy signature is invalid");
}
if (catalog.works.length > policy.declaration.canonical_supply_ceiling) fail("Canonical collection exceeds its signed supply ceiling");

let previousSealSha256 = null;
const entries = catalog.works.map((work, offset) => {
  const sequence = offset + 1;
  if (work.sequence !== sequence) fail(`${work.artifact_id}: catalog sequence is not contiguous`);
  const sourcePath = path.join(root, work.source_file);
  if (!fs.existsSync(sourcePath)) fail(`${work.artifact_id}: source bytes are missing`);
  const sourceSha256 = fileDigest(sourcePath);
  if (sourceSha256 !== work.sha256) fail(`${work.artifact_id}: source bytes differ from catalog identity`);

  const metadata = read(path.join(root, work.metadata_file));
  const metadataCore = { ...metadata, xrpl: null };
  const candidatePath = work.era === 2 ? path.join(root, "Output/reflections/mint", `${work.artifact_id}.json`) : null;
  const candidate = candidatePath && fs.existsSync(candidatePath) ? read(candidatePath) : null;
  const payload = {
    schema: "foldportrait-sealed-release/v1",
    authority: authority.authority,
    authority_key_sha256: fingerprint,
    collection: "FoldPortrait",
    edition: { designation: "unique", size: 1, number: 1 },
    sequence,
    era: work.era,
    artifact_id: work.artifact_id,
    title: work.title,
    description: work.description,
    source_file: work.source_file,
    source_sha256: sourceSha256,
    byte_size: work.byte_size,
    metadata_uri: work.metadata_uri,
    metadata_core_sha256: digest(metadataCore),
    lineage: candidate ? {
      cycle_id: candidate.lineage.cycleID,
      previous_cycle_id: candidate.lineage.previousCycleID,
      witness_digest: candidate.lineage.witnessDigest,
      foldkernel_identity: candidate.lineage.foldKernelIdentity,
      render_hash: candidate.lineage.renderHash,
      source_svg_sha256: candidate.source.sha256,
      composition_regime: candidate.lineage.compositionRegime || null,
      composition_season: candidate.lineage.compositionSeason || null,
      palette_id: candidate.lineage.paletteID || null
    } : null,
    previous_seal_sha256: previousSealSha256,
    scarcity_policy: authority.scarcity_policy
  };
  if (sequence >= policy.declaration.effective_at_sequence) payload.collection_policy_sha256 = policyDigest;
  const payloadSha256 = digest(payload);
  const existingEntry = existingEntries[offset];
  const sealPath = path.join(sealsRoot, `${work.artifact_id}.json`);
  let seal;

  if (existingEntry) {
    if (existingEntry.artifact_id !== work.artifact_id || existingEntry.sequence !== sequence) {
      fail(`${work.artifact_id}: append-only ledger identity or sequence changed`);
    }
    if (!fs.existsSync(sealPath)) fail(`${work.artifact_id}: sealed manifest is missing`);
    seal = read(sealPath);
    if (seal.payload_sha256 !== payloadSha256 || canonical(seal.payload) !== canonical(payload)) {
      fail(`${work.artifact_id}: sealed release content changed`);
    }
  } else {
    if (!privateKey) fail(`${work.artifact_id}: signing key unavailable`);
    const signature = crypto.sign(null, Buffer.from(canonical(payload)), privateKey).toString("base64");
    seal = {
      schema: "foldportrait-release-seal/v1",
      algorithm: "Ed25519",
      payload_sha256: payloadSha256,
      signature,
      payload
    };
    write(sealPath, seal);
  }

  if (!crypto.verify(null, Buffer.from(canonical(payload)), publicKey, Buffer.from(seal.signature, "base64"))) {
    fail(`${work.artifact_id}: release signature is invalid`);
  }
  const sealSha256 = digest(seal);
  if (existingEntry && existingEntry.seal_sha256 !== sealSha256) fail(`${work.artifact_id}: ledger seal commitment changed`);
  const entry = { sequence, artifact_id: work.artifact_id, payload_sha256: payloadSha256, seal_sha256: sealSha256 };
  previousSealSha256 = sealSha256;
  return entry;
});

const ledger = {
  schema: "foldportrait-seal-ledger/v1",
  authority: authority.authority,
  authority_key_sha256: fingerprint,
  append_only: true,
  release_count: entries.length,
  chain_tip_sha256: previousSealSha256,
  entries
};

if (verifyOnly) {
  if (!existingLedger || canonical(existingLedger) !== canonical(ledger)) fail("Seal ledger is stale or changed");
  console.log(`Verified ${entries.length} signed, append-only FoldPortrait release seals.`);
} else {
  write(ledgerPath, ledger);
  console.log(`Sealed ${entries.length} append-only FoldPortrait releases.`);
}
