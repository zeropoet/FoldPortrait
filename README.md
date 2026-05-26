# FoldPortrait

FoldPortrait is a ritual abstract study built on top of
[FoldKernel](https://github.com/zeropoet/FoldKernel). It derives a deterministic
permutation, memory signature, and convergence hash from a text seed, then lets
that architecture become an SVG portrait of itself.

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

The work should feel like the architecture learning how to draw itself.

## View

Open the current published topology study:
[zeropoet.github.io/FoldPortrait](https://zeropoet.github.io/FoldPortrait/)

The root page redirects to `Web/`, where the browser reads
[Output/iterations/evolution.json](Output/iterations/evolution.json) and
displays the latest generated SVG as an inspectable Three.js topology. The
gallery view is a lineage matrix: each row is one of the twelve anchors, and
revision passes appear beside their source anchor. The left and right arrow keys
move directly through the ledger order.

For local viewing:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/Web/
```

## Generator

Run the next portrait:

```sh
swift run fold-portrait "zero poet"
```

The first pass fills twelve anchors: `v1` through `v12`. After all twelve
anchors exist, generation moves through revision passes in anchor order:

```text
v1.2 -> v2.2 -> v3.2 -> ... -> v12.2
v1.3 -> v2.3 -> v3.3 -> ... -> v12.3
```

You can target a specific anchor and revision:

```sh
swift run fold-portrait --iteration 2 --revision 2 "zero poet"
```

The generator writes:

```text
Output/iterations/foldportrait-vN-zero-poet-2cfdfa64.svg
Output/iterations/foldportrait-vN-zero-poet-2cfdfa64.notes.md
Output/iterations/foldportrait-vN.R-zero-poet-2cfdfa64.svg
Output/iterations/foldportrait-vN.R-zero-poet-2cfdfa64.notes.md
Output/iterations/evolution.json
```

Each run keeps the same convergence hash for the same seed as an identity
anchor, but receives a distinct render hash for the visible study. The render
also receives a growth climate: compression, torsion, shear, bloom, erosion,
sediment, fiber memory, an active force, and a material state. These forces give
future portraits a reason to change beyond simply accumulating more marks.
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

The web layer reads this ledger and always loads the latest generated study. It
also uses the source iteration and revision fields to group portraits into the
lineage matrix.

## Studio Notes

Each `.notes.md` file is an abstract studio note, not a photoreal prompt. It
names the compositional genome, mark system, surface behavior, Fold signature,
and continuity rule for that iteration.

## Topology Study

The [Web/](Web/) layer is an inspect-only Three.js topology study. It loads the
latest ledger entry, fetches the SVG, extracts `data-layer` shapes, and arranges
them in 3D. The inspected view keeps each iteration's SVG paper color as the
scene background, so moving through older studies preserves their visible
ground.

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
- countdown to the next daily study

The gallery button opens the full evolution archive as a minimal lineage matrix.
Selecting a card drills into that portrait's topology, `Latest` returns to the
newest study, and the left and right arrow keys step backward or forward through
the ledger without opening the gallery.

## Daily Ritual

GitHub Actions generates the next study without needing a local machine:
[Daily FoldPortrait](https://github.com/zeropoet/FoldPortrait/actions/workflows/daily-foldportrait.yml).

Schedule:

```text
Every day at 12:00 AM America/New_York
```

The workflow checks out `FoldPortrait` and the sibling
[FoldKernel](https://github.com/zeropoet/FoldKernel) dependency, runs the test
suite, generates the next `zero poet` portrait in the anchor/revision sequence,
commits the new `Output/iterations` artifacts, and pushes them back to `main`.
GitHub Pages then serves the updated browser study from the repository.

The workflow also supports manual dispatch from the GitHub Actions tab.

## Test

```sh
swift test
```
