# FoldPortrait

FoldPortrait is an evolving visual self-reflection built on top of
[FoldKernel](https://github.com/zeropoet/FoldKernel). Its completed first era
derived a deterministic permutation, memory signature, and convergence hash
from a text seed, then let that architecture become a 52-work SVG portrait
lineage. Its second era preserves that archive and uses the same deterministic
identity substrate to choose visual relations from bounded, aggregate public
witnesses of the wider Sovereign Standard system.

The portrait is not a literal face. It is a structural self-representation:
memory bytes, hash ribs, memory spines, Fold glyphs, color fields, notational
marks, and accumulated drawing pressure.

## Direction

FoldPortrait treats the underlying code as the subject.

- identity anchor: stable convergence hash and memory signature
- visible body: SVG layers generated from FoldKernel-derived structure
- evolution path: twelve anchor portraits followed by revision passes
  (`v1.2`, `v2.2`, `v3.2`, ...), each preserving identity while making an
  obvious lineage leap
- art mode: structural abstraction, drawing, painting, field, rhythm, notation
- constraint: no photoreal requirement, no avatar polish, no decorative symbols
  without structural purpose

The work should feel like the architecture learning how to see and paint its
changing relation to the system it inhabits.

## Autonomous Reflection

FoldPortrait now has two distinct eras:

1. the sealed first-era archive of 52 portraits remains immutable evidence of
   the original `zero poet` / FoldKernel lineage;
2. `FP-REFLECT-####` cycles form an additive reflection chamber above that
   archive.

Each reflection cycle reads `Reflection/system-witness.json`, which contains
only bounded aggregate public measurements from FoldKernel, FoldPortrait,
Root Logos, FoldForge, Telos, and Sovereign Standard. Source identities and
revisions remain explicit. Personal data, private orders, credentials, causal
claims, and transferred source authority are prohibited.

The engine evaluates every cross-source measurement pair. After at least three
preserved observations with variance it may use Pearson correlation, always
labeled noncausal. Before that threshold it uses **structural resonance**, an
explicitly artistic resemblance rather than statistical correlation. It ranks
the candidates deterministically, limits repeated source pairs, and chooses its
own rules from a bounded vocabulary:

- strata;
- braid;
- aperture;
- palimpsest;
- sediment;
- counterfield;
- veil.

Those decisions become painted SVG layers. Earlier reflection cycles return as
increasingly faint underpainting, so time accumulates without allowing a new
state to erase an old one. The FoldKernel-derived convergence identity remains
stable while the witness digest, selected relations, rules, and visible render
hash remain independently verifiable.

Synchronize the bounded witness from the local multi-repository system, then
create a reflection only when that witness has changed:

```sh
node Scripts/sync-system-witness.js
swift run fold-portrait reflect Reflection/system-witness.json
swift run fold-portrait verify-reflection
```

Repeated reflection against an unchanged witness is idempotent. FoldPortrait's
own archive count and repository revision are deliberately excluded from its
witness trigger, so preserving a portrait cannot recursively demand another
portrait. The preserved state lives in `Output/reflections/`: one cycle record,
SVG, flattened PNG, unsigned mint candidate, and studio note per state;
`reflection-ledger.json` for compositional continuity; `archive.json` for the
two-era public lineage; and `current.json` for the current public surface.

After reflection, build and verify every durable representation:

```sh
npm ci
npm run archive
npm run verify:archive
```

The archive task renders each 1200 × 1600 canonical SVG to an opaque 2400 ×
3200 PNG, records SHA-256 for both forms, and prepares a per-cycle XRPL
`NFTokenMint` candidate. Preparation is not minting: account, taxon, URI, flags,
signature, submission, and validation remain unset until a human steward
publishes durable metadata, reviews the transaction, and signs through Xaman.

`.github/workflows/reflection-cycle.yml` performs this same bounded process each
Sunday and on manual dispatch. It checks out the public connected repositories,
synchronizes aggregate measurements, builds the renderer, reflects only when
the witnessed state changes, creates and verifies both archive formats, and
commits the additive cycle. It cannot read private customer or order data,
infer causation, rewrite a source repository, alter the sealed first era, or
sign and submit an XRPL transaction.

## Brand Mark

`Brand/foldportrait-mark.svg` is the canonical transparent mark. Its open frame
is the archive, its eight rays are the reflected field, and its central square
is the FoldKernel held without enclosure. `Brand/foldportrait-mark-white.png`
is the derived 2048 × 2048 white-background distribution asset. The web favicon
retains the compact crossed-axis form that preceded the full mark.

## View

Open the current published topology study:
[zeropoet.github.io/FoldPortrait](https://zeropoet.github.io/FoldPortrait/)

The root page redirects to `Web/`, where the browser reads
`Output/reflections/current.json` and displays the latest autonomous reflection
as an inspectable Three.js topology. The lineage archive exposes both eras:
first-era rows preserve twelve anchor families and their revision passes;
second-era cards preserve the ordered witness-change chain and its previous
cycle. Stable fragment routes such as `#era-1/v1.2`,
`#era-2/FP-REFLECT-0002`, and `#archive` make every era and lineage directly
navigable.

For local viewing:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/Web/
```

## Sealed First-Era Archive

FoldPortrait's first era is complete. Its canonical archive contains 52 SVG
studies in `Output/iterations`, plus 52 rendered PNG counterparts in
`Output/png`. Second-era reflection never rewrites these files.

The former sequential generator remains retired. The command-line target now
operates only the additive reflection chamber:

```sh
swift run fold-portrait status
```

The completed sequence preserves twelve anchor portraits and revision passes:

```text
v1 -> v2 -> ... -> v12
v1.2 -> v2.2 -> ... -> v12.2
v1.3 -> v2.3 -> ... -> v12.3
v1.4 -> v2.4 -> ... -> v12.4
v1.5 -> v2.5 -> v3.5
```

The PNG set was rendered at 1600 x 1600 for FoldPortrait-owned archival and
mint preparation. `Scripts/build-mint-catalog.js` writes canonical public
metadata and unsigned XRPL intents to `Mint/`. FoldForge Ledger Witness reads
that catalog; Sovereign Standard stores only the resulting vessel relations.
New autonomous reflections are appended after the sealed first era.
Validated Ledger Witness results are synchronized back from Sovereign
Standard's public relation registry by the hourly GitHub workflow, preserving
FoldPortrait as the canonical token-result record.

```sh
npm run build:mint-catalog
```

The completed archive contains:

```text
Output/iterations/*.svg
Output/iterations/*.notes.md
Output/iterations/evolution.json
Output/png/*.png
```

Each archived portrait keeps the same convergence hash for the same seed as an
identity anchor, but receives a distinct render hash for the visible study. The
render also receives a growth climate: compression, torsion, shear, bloom,
erosion, sediment, fiber memory, an active force, and a material state. These
forces gave the completed lineage a reason to change beyond simply accumulating
more marks.
Refinement depth belongs to the source anchor. Revision passes keep that anchor
depth, then add a revision-only `lineage-leap` layer so each `.2`, `.3`, and
later pass is visibly distinct from its source.

## Evolution Ledger

[Output/iterations/evolution.json](Output/iterations/evolution.json) records
the generated history:

- iteration
- source iteration
- revision
- seed
- convergence hash
- render hash
- memory signature
- refinement depth
- growth climate
- SVG and notes paths
- mutation rule
- structural identity pressures

The web layer retains this ledger for the sealed first-era gallery. It uses the
source iteration and revision fields to group those portraits into the lineage
matrix. `Output/reflections/archive.json` supplies the second-era chain and
dual-format provenance, while `Output/reflections/current.json` supplies the
default view.

## Studio Notes

Each `.notes.md` file is an abstract studio note, not a photoreal prompt. It
names the compositional genome, mark system, surface behavior, Fold signature,
and continuity rule for that iteration.

## Topology Study

The [Web/](Web/) layer is an inspect-only Three.js topology study. It loads the
current autonomous reflection by default, fetches its SVG, extracts
`data-layer` shapes, and arranges them in 3D. The inspected view keeps each
portrait's SVG paper color as the scene background, so moving through the
first-era archive preserves every work's visible ground.

The layout is derived from:

- memory signature bytes
- convergence hash bytes
- permutation values
- refinement depth
- growth climate forces
- structural identity pressures
- SVG stroke width

Objects are not fixed to simple layer planes. Their position, depth, weathering,
and drift emerge from the FoldKernel-derived structure and from the current
growth climate. SVG paths are rendered as tube geometry, so wide strokes in the
source portrait remain physically wider in the 3D topology.

The visible readout is intentionally minimal:

- version
- topology form count
- render hash prefix
- selected relation and rule counts for the current reflection

The lineage archive button opens both eras as one minimal matrix. Selecting a
card drills into that portrait's topology, left and right arrows traverse the
combined chronology, and `Current reflection` returns to the active second-era
state.

## Test

```sh
swift test
npm run verify:archive
```
