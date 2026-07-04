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

## Completed Archive

FoldPortrait is complete. The canonical archive contains 52 SVG studies in
`Output/iterations`, plus 52 rendered PNG counterparts in `Output/png`.

The command-line target is intentionally frozen:

```sh
swift run fold-portrait "zero poet"
```

It exits before writing new artwork and reports that the project is complete.
The former generation workflow has been removed so GitHub Actions cannot
schedule or manually dispatch additional iterations.

The completed sequence preserves twelve anchor portraits and revision passes:

```text
v1 -> v2 -> ... -> v12
v1.2 -> v2.2 -> ... -> v12.2
v1.3 -> v2.3 -> ... -> v12.3
v1.4 -> v2.4 -> ... -> v12.4
v1.5 -> v2.5 -> v3.5
```

The PNG set was rendered at 1600 x 1600 for downstream archive and minting
preparation. `Scripts/prepare-witness-batch.js` prepares the completed set for
the Sovereign Standard Witness archive, copying PNGs into that repo and writing
per-work metadata plus a batch XRPL mint-intent manifest.

```sh
node Scripts/prepare-witness-batch.js /Users/zeropoet/WebstormProjects/sovereign-standard
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
- completed archive status

The gallery button opens the full evolution archive as a minimal lineage matrix.
Selecting a card drills into that portrait's topology, `Latest` returns to the
newest study, and the left and right arrow keys step backward or forward through
the ledger without opening the gallery.

## Test

```sh
swift test
```
