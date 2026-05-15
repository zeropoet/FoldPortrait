# FoldPortrait

FoldPortrait is a small executable experiment built on top of
[FoldKernel](../FoldKernel). It derives a deterministic memory signature and
convergence hash from a text seed, then interprets that protocol output as an
SVG portrait.

The current renderer is intentionally simple:

- build a valid 4x4 permutation from the seed
- encode FoldKernel events with `MemoryEncoder`
- derive a convergence hash with `HashEngine`
- map the resulting bytes into portrait structure, palette, and marks

## Usage

```sh
swift run fold-portrait "zero poet"
```

The command writes:

```text
Output/portrait.svg
```

Running the same seed produces the same portrait and hash every time.

## Test

```sh
swift test
```
