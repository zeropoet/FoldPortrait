# FoldPortrait

FoldPortrait is a small executable experiment built on top of
[FoldKernel](../FoldKernel). It derives a deterministic memory signature and
convergence hash from a text seed, then interprets that protocol output as an
SVG portrait.

The current renderer is intentionally simple:

- build a valid 4x4 permutation from the seed
- encode FoldKernel events with `MemoryEncoder`
- derive a convergence hash with `HashEngine`
- map the resulting bytes into named portrait parameters
- render those parameters as portrait structure, light, palette, and Fold marks

The parameter layer is the bridge toward photorealism. `PortraitParameters`
turns raw protocol bytes into bounded, inspectable values for identity geometry,
feature geometry, surface, lighting, camera behavior, and visible Fold signature
marks.

## Usage

```sh
swift run fold-portrait "zero poet"
```

The command writes:

```text
Output/iterations/foldportrait-v0001-zero-poet-2cfdfa64.svg
```

Every run creates a new SVG file. The filename convention is:

```text
foldportrait-vNNNN-seed-slug-hashprefix.svg
```

Running the same seed produces the same portrait and hash every time, but the
iteration number preserves the visible journey of the experiment.

## Test

```sh
swift test
```
