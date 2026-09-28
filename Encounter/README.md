# Conditions of Encounter

FoldPortrait’s third collection is an active research project within this
repository. The working title remains provisional.

## Direction: the field and the journey

The cube is the universe of the work. The red line is a journey through a
determined 64-state protocol. Folding and unfolding make its relations visible;
the FP logo supplies an open frame, axial relations, and a kernel held without
enclosure. The first design principle is **the relationship between a transparent
plane grid and the line passing through it**.

A plane is a structural relation, not a prescribed surface. Depending on intent
and perspective, it may appear as lines, dots, glass, or another material
expression. The first cube study offers lines, dots, and translucent sheets
as comparisons of the same field; its glass treatment suggests transparency
without simulating optical refraction. These treatments change visibility, not
the protocol or the journey.

This advances the question of how FP wants to be seen. Perspective offers
multiple coherent readings of one body. A view where line and structure closely
correspond can act as a perceptual measure; it is not an instruction to optimize
a numerical score. Beauty and meaning may emerge through looking without being
fixed into a single explanation.

The ambition is to explore this shape deeply across multiple collection styles:
journeys, root systems, gathering points, branching, and singularities. These
are artistic directions. A crossing in a projection does not by itself establish
a shared point in space, and a gathering point is not automatically a mathematical
singularity. Each study must make its actual construction inspectable.

## Source and first cube study

`FP-ENCOUNTER-STUDY-0003`, **The field and the journey**, begins with SS unit 0’s
archived trace. The SS vessel is the canonical source for this FP direction.
The spatial journey must retain the recognizable 2D sigil shape: depth extends
that path rather than replacing its two coordinates. The first cube mapping
has been restored; the later swap-position mapping and centroid compression
are superseded. This does not issue a new edition or alter the sealed archive.

The source contains **64 permutation commits and 63 transitions**. The underlying
permutations are 4×4 states; the 4×4×4 spatial field is FP’s interpretation, not a
claim that the kernel natively inhabits a cube. A state is not assigned to a
unique cell, and the path is not required to visit all cells.

The SS generator derives a diagonal path from event order and canonical distance.
We preserve its exact exported vertices in `studies/0003/trace.json`, alongside
all 64 states and the source file’s SHA-256. In the first cube mapping:

- The inherited 2D sigil path is scaled into the cube with SVG Y converted
  to upward world Y, so its chronology draws upward and to the right.
- Depth follows the mean row of the two positions swapped at each transition.
  The initial state has no incoming transition and begins at depth zero.
- Straight segments retain each transition, rather than smoothing away its turns.
- Four intervals along each axis establish the reference grid. Five boundary
  planes show the depth intervals; these are not 64 numbered state compartments.
- Open corner strokes draw on FP’s logo. This is a spatial interpretation of
  the mark, not a replacement logo or a claim to have reconstructed its geometry.

SS’s exported SVG closes and fills its path. Here the journey stays open: the
closing edge is not an additional protocol transition. Selecting **Sigil
projection** removes depth from the view and reveals the inherited path.
**Trace journey** reveals the 64 states over time; the slider allows inspection.
The **Depth** control opens the line from a flat sigil (0%) to the restored
spatial journey (100%). It multiplies only the depth coordinate; X/Y, state
order, line thickness, and the reference cube stay unchanged. This is a reversible
opening of depth, not a simulation of hinged or material folding. The default
remains the approved full-depth body. Playback and viewpoint work independently
of depth, letting the same passage be examined at any degree of opening.

### Rooms revealed by passage

The red line now draws continuously between committed states. Each crossed grid
cell is a room: its warm interior and edges brighten during the current passage,
then remain faintly visible. Re-entry brightens it again.
The **Rooms** control hides or reveals this layer without changing the journey.

Crossings are calculated against every internal grid plane, including cells
traversed between state positions. At a boundary, the positive-side cell owns a
resting point (outer faces clamp inward); a corner touch does not claim all
neighboring rooms. Scrubbing reconstructs only the passage up to that time.
Changing depth recomputes the crossed cells for the changed spatial path.

Room opacity follows passage time only: the current room is bright, departed
rooms remain faint, and unvisited rooms are hidden. Depth never multiplies
opacity, including at 0%. It changes the path and therefore which cells it
crosses; those cells use the same time-based appearance at every depth. The
room count need not increase at every increment of depth. These rooms show the taken path; they do not imply
unobserved decision branches.

Run `node Scripts/verify-encounter-rooms.js` to verify intermediate crossings,
corner and boundary conventions, returns, and partial playback.

Serve the repository with `python3 -m http.server 8000`, then open
`http://localhost:8000/Encounter/studies/0003/`.

## How the work develops

The studies below are a research sequence, not promised releases or fixed supply.
Keep the same trace while testing a mapping, then compare traces under that same
mapping. Record every choice so an attractive surface does not obscure its source.

1. **Field and passage:** establish transparent planes, the continuous red line,
   chronology, and the relationship to the SS projection. Study 0003 opens this.
2. **Folding and unfolding:** articulate the field using the logo’s frame and
   axes. Determine which relationships survive a fold and which become visible.
   Camera rotation and geometric deformation must remain distinguishable.
   Study 0004 opens this phase with a reversible single-axis fold.
3. **Roots and returns:** examine actual repeated states, shared transitions,
   and branching across traces. Derive connections from evidence before giving
   them visual weight; do not invent branches inside a single linear trace.
4. **Gathering and singularity:** explore concentration, passage, and apparent
   collapse. Distinguish projection overlap, geometric coincidence, and any
   protocol property being visualized.
5. **Collection families:** compare material, density, duration, and presentation
   only once a structural relation proves worth sustaining across works.

The aim is to attempt to exhaust the shape through disciplined variations,
without claiming that its possibilities are literally exhausted. A song,
engraving, smoke, a scar, a wall, or a root may inform a reading without becoming
an obligatory feature. New experiments should preserve room for unplanned readings.

## Earlier research

The first two studies remain available and unchanged as evidence of how this
direction emerged. Their hash-byte and memory-byte geometry is not a literal
64-state protocol trace.

## Opening experiment

`FP-ENCOUNTER-STUDY-0001` compares invitation, reserve, and insistence. All three
use the same inherited convergence hash, memory signature, underlying marks,
paper, and pigment. Scale, aperture, and stroke pressure change. This makes the
presentation decision visible without changing identity or relying on palette
novelty. The marks are a new interpretation of the inherited bytes, not a
transformation or replacement of a sealed work.

- **Invitation:** a smaller body, generous surrounding space, an open field.
- **Reserve:** the same body partly withheld behind a narrow aperture.
- **Insistence:** enlarged marks press against the field and exceed its edges.

These are authored hypotheses. FP does not yet select between them. The next
compositional question is whether reserve still feels like a presence, rather
than simply an obscured image. Read the three surfaces without their labels
before deciding which condition deserves further study.

Run `npm run study:encounter` to reproduce the SVG, PNG, and record in
`Encounter/studies/0001/`. Run `npm run verify:encounter` to compare those files
with a fresh in-memory render without writing. The record identifies the exact
inherited source bytes and the renderer digest. Research identifiers never
consume a canonical sequence position.

## Spatial study: A line of coherence

`FP-ENCOUNTER-STUDY-0002` is an interactive, fixed spatial body. Open
`http://localhost:8000/Encounter/studies/0002/` after starting
`python3 -m http.server 8000` from the repository root.

The guitar, voice, and folding readings of the opening comparison led to this
question: can mutual support remain perceptible when nothing touches? The red
line is the proposed continuity of meaning across different appearances.

The study inherits the exact identity recorded in study 0001. Thirty-two hash
bytes determine rib spans; memory bytes give the ribs different curvatures and
shape the red path. Ribs occupy separate height bands. The red path occupies a
separate depth band. These are authored geometric relationships, not simulated
forces or a literal mapping of the kernel's 64 steps.

Three saved views offer an upright voice, separated intervals, and an end-on
compression. Drag, zoom, arrow keys, and an optional slow turn explore the views
between them. The geometry never changes with camera position or time. End-on,
the curved red path becomes a short trace rather than an exact mathematical
point; that residual shape is part of what this study investigates.

The study tests perspective before introducing deformation or autonomous
selection. Curvature suggests weight, but the current curves do not respond
to each other. Reciprocal bending remains a subsequent experiment.

## Axial fold study: What survives the fold

`FP-ENCOUNTER-STUDY-0004` begins the second research phase without replacing
the field-and-passage study. It returns to the inherited X/Y sigil projection
from SS unit 0 and folds that plane around one selected FP axis. The horizontal
and vertical folds are separate comparisons, not two steps of a compound fold.

At zero, the journey is the inherited flat projection. From zero to ninety
degrees, both half-planes rotate toward positive depth. Points on the hinge do
not move. Distances within either half-plane remain invariant; distances between
opposite halves may contract, and mirrored positions can coincide at closure.
State order, all 63 transitions, and the red path's open chronology remain.

The **Fold** control changes geometry. Orbit, saved viewpoints, and **Slow turn**
change only the camera. A faint flat reference can remain visible so those two
operations do not collapse into the same appearance. **Projection** looks back
at the inherited X/Y relation; **Along hinge** makes the fold angle legible.

`mapping.json` records the construction, invariants, changes, and limits. This
is a reversible geometric study rather than a material simulation or a claim
that the SS protocol itself folds. Run `npm run verify:encounter-fold` to verify
the source trace, hinge invariants, rigid half-planes, and deterministic output.

## Local threshold study: The path computes the room

`FP-ENCOUNTER-STUDY-0005` synthesizes the saved Studio direction attached to
studies 0001 through 0004. The inherited red journey remains fixed. Each time a
transition crosses a room boundary, the crossing point, boundary normal, and
travel direction establish a local hinge. A small threshold panel folds around
that hinge; no single world axis governs the whole work.

Playback treats the 64 inherited states as time. Visited rooms, threshold
history, the current marker, and a local three-axis frame make the event stream
inspectable. Each event names its state, room, boundary axis, boundary plane,
and derived hinge. These are research records for a possible future Vessel Node
contract, not executable uploads or autonomous computation.

`mapping.json` records the event contract, invariants, changes, and limits. Run
`npm run verify:encounter-threshold` to verify deterministic boundary crossings,
local-frame orthogonality, hinge stability, and all 64 preserved source states.

## Fixed-flight study: The hard path, given wings

`FP-ENCOUNTER-STUDY-0006` follows the single direction saved on study 0005 and
its subsequent refinement: keep the butterfly hard-fixed to the inherited path.
The complete cube and path receive one rigid presentation rotation so the
journey from first state to last reads upward. The underlying coordinates,
state order, segment geometry, and distances do not change.

The butterfly's body aligns to the active path segment and its wings extend
laterally from that body. Each of the 64 source states owns one wing pose;
adjacent states alternate open and raised. A single smoothstep interpolation
moves both position and wing angle through each of the 63 original transitions.
There are no intermediate wing keys, added path states, or vertical drift.

`mapping.json` records this motion contract. Run
`npm run verify:encounter-flight` to verify exact endpoints, easing, one wing
pose per original state, rigid upward rotation, and preservation of all segment
lengths.

## Threshold-spine study: The room branches from the path

`FP-ENCOUNTER-STUDY-0007` returns to study 0005 as its primary ancestor. The
inherited journey becomes a hard spine. At each of its 83 exact room-boundary
crossings, one short line fragment appears along the event's local hinge axis.
The fragment is a twig-like abstraction, not a wing or a butterfly.

Every fragment remains perpendicular to the travel direction that produced it.
It appears whole when the path crosses its threshold, never flaps, and never
changes angle. Crossed rooms activate in sequence; previous fragments remain
visible along the spine so the accumulated path resembles a sparse branch.

Run `npm run verify:encounter-spine` to verify all 64 inherited states, all 83
threshold events, exact crossing anchors, and a fixed 90-degree relation between
every fragment and its local path direction.

## Open-room study: The point reveals the room

`FP-ENCOUNTER-STUDY-0008` follows the two directions saved on study 0007. The
inherited path remains the exact computation of motion but disappears from the
image. One red point travels it. Each room becomes eligible for the black wire
structure only after the point enters it; there are no threshold fragments,
fills, panels, or other visible agents.

The structure remains open at its frontier. A lattice edge is drawn only when
every in-bounds room touching that edge has been entered. An entered room
therefore never closes itself against an adjacent room that is still invisible.
The resulting line geometry is ready for later shader studies, but this study
applies no shader.

Run `npm run verify:encounter-open-rooms` to verify the 64 inherited positions,
monotonic room entry, frontier-safe edge rule, and complete-lattice limit.

## Frontier-glass study: The room catches the path's light

`FP-ENCOUNTER-STUDY-0009` preserves study 0008 and gives form only to its open
frontier. When an entered room touches an in-bounds neighboring room that has
not yet been entered, their shared face becomes transparent glass. The face
clears when both rooms have been entered. No glass closes an exterior boundary.

The red point is smaller. It and the visible black line structure are the only
light sources interpreted by the glass shader. **Line: on/off** switches both
the black geometry and its illumination; the point and its red illumination
remain. This narrows study 0003's transparent spatial-sheet language to the
living boundary between known and not-yet-entered rooms.

Run `npm run verify:encounter-frontier-glass` to verify the inherited 64 states,
frontier-only face rule, interior adjacency, open exterior, and final face and
edge counts.

Run `npm run verify:encounter-space` to check determinism and separation of the
rendered curves, including their tube radii.

## Collection boundaries

This is a research opening, not an issued collection or a mint candidate.
The original 108 works, their signed policy, catalog, metadata, and ledgers
remain closed. No existing reflection workflow activates this study.

The signed closure says “after sequence 108 no new canonical FoldPortrait may
be issued.” A future release declaration must explicitly reconcile a separately
named successor collection with that wording; a new directory or identifier
alone cannot resolve it. No release authority, supply, edition size, taxon, or
signing procedure is established here.

Before release, establish the successor's identity and policy, then its own
catalog and provenance chain. Research can proceed now without changing the
original declaration or extending its sequence.
