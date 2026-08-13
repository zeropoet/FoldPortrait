import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "Mint/catalog.json");
const source = process.argv[2] || "https://raw.githubusercontent.com/zeropoet/sovereign-standard/main/foldportrait-relations.json";
const registry = /^https?:/.test(source)
  ? await fetch(source).then((response) => { if (!response.ok) throw new Error(`Relation fetch failed: ${response.status}`); return response.json(); })
  : JSON.parse(fs.readFileSync(path.resolve(source), "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const relationByID = new Map(registry.works.map((work) => [work.artifact_id, work]));
let changed = 0;
for (const work of catalog.works) {
  const relation = relationByID.get(work.artifact_id);
  if (!relation || relation.file_sha256 !== work.sha256 || relation.mint_status !== "minted") continue;
  const before = JSON.stringify({ mint_status: work.mint_status, xrpl: work.xrpl });
  work.mint_status = "minted";
  work.xrpl = relation.xrpl;
  const metadataPath = path.join(root, work.metadata_file);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  metadata.xrpl = relation.xrpl;
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  if (before !== JSON.stringify({ mint_status: work.mint_status, xrpl: work.xrpl })) changed += 1;
}
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Synchronized ${changed} new FoldPortrait mint results.`);
