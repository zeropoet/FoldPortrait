import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const FINAL_VESSEL_ID = 0;
const sourcePath = new URL('../Encounter/studies/0013/vessels.json', import.meta.url);
const destination = new URL('../Encounter/piece/piece.json', import.meta.url);
const sourceRaw = readFileSync(sourcePath);
const source = JSON.parse(sourceRaw);
const vessel = source.vessels.find(candidate => candidate.id === FINAL_VESSEL_ID);
if (!vessel || vessel.points.length !== 64) throw new Error('The locked final vessel is unavailable');
const record = {
  schema: 'foldportrait-encounter-piece/v1',
  status: 'unissued-final-piece-surface',
  source: {
    study: 'FP-ENCOUNTER-STUDY-0013',
    vessel_id: vessel.id,
    vessel_hash: vessel.hash,
    vessel_range_sha256: createHash('sha256').update(sourceRaw).digest('hex')
  },
  points: vessel.points
};
const rendered = JSON.stringify(record) + '\n';
if (process.argv.includes('--verify')) {
  if (readFileSync(destination, 'utf8') !== rendered) throw new Error('Encounter/piece/piece.json is not current');
  console.log(`Verified the locked final-piece source at SS vessel ${FINAL_VESSEL_ID}.`);
} else {
  writeFileSync(destination, rendered);
  console.log(`Wrote the locked final-piece source at SS vessel ${FINAL_VESSEL_ID}.`);
}
