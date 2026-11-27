import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repository = path.resolve(import.meta.dirname, '..');
const sovereign = path.resolve(process.env.SOVEREIGN_STANDARD_ROOT || path.join(repository, '..', 'sovereign-standard'));
const destinations = ['0011', '0012', '0013'].map(study => path.join(repository, 'Encounter', 'studies', study, 'vessels.json'));
const unitsPath = path.join(sovereign, 'units.json');
const unitsRaw = readFileSync(unitsPath);
const units = JSON.parse(unitsRaw);
const pointPattern = /[ML]\s+([^\s]+)\s+([^\s<]+)/g;

function digest(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

function vessel(unit) {
  const sourcePath = path.join(sovereign, 'output', String(unit.id), 'data.json');
  const sourceRaw = readFileSync(sourcePath);
  const source = JSON.parse(sourceRaw);
  const sigilPoints = [...source.sigil_svg.matchAll(pointPattern)].map(match => [Number(match[1]), Number(match[2])]);
  if (source.unit_id !== unit.id || source.events.length !== 64 || sigilPoints.length !== 64) {
    throw new Error(`SS unit ${unit.id} does not contain one 64-state sigil`);
  }
  let prior = null;
  const points = source.events.map((event, index) => {
    const permutation = event.permutation;
    if (event.type !== 'permutation_commit' || permutation.length !== 16 || [...permutation].sort((a,b) => a-b).some((value, position) => value !== position + 1)) {
      throw new Error(`SS unit ${unit.id} has an invalid event at state ${index + 1}`);
    }
    const changed = prior ? permutation.flatMap((value, position) => value !== prior[position] ? [position] : []) : [];
    if (prior && (changed.length !== 2 || changed.some((position, side) => permutation[position] !== prior[changed[1 - side]]))) {
      throw new Error(`SS unit ${unit.id} does not make one swap at state ${index + 1}`);
    }
    const depth = index ? (changed.reduce((sum, position) => sum + Math.floor(position / 4), 0) / 2 - 1.5) * 2 : 0;
    const [x, y] = sigilPoints[index];
    if (![x, y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error(`SS unit ${unit.id} has an invalid sigil point`);
    prior = permutation;
    return [(x - .5) * 6, (.5 - y) * 6, depth];
  });
  if (source.hash !== unit.convergence_hash) throw new Error(`SS unit ${unit.id} hash differs from units.json`);
  return { id: unit.id, hash: source.hash, source_sha256: digest(sourceRaw), points };
}

const ordered = [...units.units].sort((a,b) => a.id - b.id);
if (ordered.some((unit, index) => unit.id !== index)) throw new Error('The current SS vessel range must remain contiguous from zero');
const record = {
  schema: 'foldportrait-vessel-range/v1',
  generated_at: units.generated_at,
  source: { repository: 'sovereign-standard', path: 'units.json + output/{id}/data.json', units_sha256: digest(unitsRaw), count: ordered.length },
  vessels: ordered.map(vessel)
};
const rendered = JSON.stringify(record) + '\n';
if (process.argv.includes('--verify')) {
  for (const destination of destinations) {
    if (readFileSync(destination, 'utf8') !== rendered) throw new Error(`${path.relative(repository, destination)} is not current`);
  }
  console.log(`Verified ${record.vessels.length} canonical SS sigils in the locked room instrument.`);
} else {
  for (const destination of destinations) writeFileSync(destination, rendered);
  console.log(`Wrote ${record.vessels.length} canonical SS sigils to ${destinations.map(destination => path.relative(repository, destination)).join(' and ')}.`);
}
