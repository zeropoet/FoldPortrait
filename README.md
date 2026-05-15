# FoldPortrait

FoldPortrait is a ritual abstract study built on top of
[FoldKernel](../FoldKernel). It derives a deterministic permutation, memory
signature, and convergence hash from a text seed, then lets that architecture
become an SVG portrait of itself.

The portrait is not a literal face. It is a structural self-representation:
memory bytes, hash ribs, memory spines, Fold glyphs, color fields, notational
marks, and accumulated drawing pressure.

## Direction

FoldPortrait treats the underlying code as the subject.

- identity anchor: stable convergence hash and memory signature
- visible body: SVG layers generated from FoldKernel-derived structure
- evolution path: each iteration preserves identity while increasing refinement
- art mode: structural abstraction, drawing, painting, field, rhythm, notation
- constraint: no photoreal requirement, no avatar polish, no decorative symbols
  without structural purpose

The work should feel like the architecture learning how to draw itself.

## View

Open the current published topology study:

```text
https://zeropoet.github.io/FoldPortrait/
```

The root page redirects to `Web/`, where the browser reads
`Output/iterations/evolution.json` and displays the latest generated SVG as an
inspectable Three.js topology.

For local viewing:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/Web/
```

## Generator

Run the next iteration:

```sh
swift run fold-portrait "zero poet"
```

The generator writes:

```text
Output/iterations/foldportrait-vNNNN-zero-poet-2cfdfa64.svg
Output/iterations/foldportrait-vNNNN-zero-poet-2cfdfa64.notes.md
Output/iterations/evolution.json
```

Each run keeps the same identity hash for the same seed, but the visible drawing
changes through the iteration number. Refinement depth grows with the iteration
and is used internally by the renderer and web topology.

## Evolution Ledger

`Output/iterations/evolution.json` records the generated history:

- iteration
- seed
- convergence hash
- memory signature
- refinement depth
- SVG and notes paths
- mutation rule
- structural identity pressures

The web layer reads this ledger and always loads the latest generated study.

## Studio Notes

Each `.notes.md` file is an abstract studio note, not a photoreal prompt. It
names the compositional genome, mark system, surface behavior, Fold signature,
and continuity rule for that iteration.

## Topology Study

The `Web/` layer is an inspect-only Three.js topology study. It has no controls
or options. It loads the latest ledger entry, fetches the SVG, extracts
`data-layer` shapes, and arranges them in 3D.

The layout is derived from:

- memory signature bytes
- convergence hash bytes
- permutation values
- refinement depth
- structural identity pressures

Objects are not fixed to simple layer planes. Their position, depth, and drift
emerge from the FoldKernel-derived structure.

The visible readout is intentionally minimal:

- iteration
- topology form count
- hash prefix
- countdown to the next daily study

## Daily Ritual

GitHub Actions generates the next study without needing a local machine:

```text
.github/workflows/daily-foldportrait.yml
```

Schedule:

```text
Every day at 12:00 AM America/New_York
```

The workflow checks out `FoldPortrait` and the sibling `FoldKernel` dependency,
runs the test suite, generates the next `zero poet` portrait, commits the new
`Output/iterations` artifacts, and pushes them back to `main`. GitHub Pages then
serves the updated browser study from the repository.

The workflow also supports manual dispatch from the GitHub Actions tab.

## Test

```sh
swift test
```
