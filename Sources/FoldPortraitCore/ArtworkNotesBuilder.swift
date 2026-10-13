import Foundation

public struct ArtworkNotesBuilder: Sendable {
    public init() {}

    public func notes(
        seed: String,
        iteration: Int? = nil,
        revision: Int = 1,
        refinementDepth: Int? = nil,
        convergenceHashHex: String,
        renderHashHex: String,
        memorySignatureHex: String,
        parameters: PortraitParameters,
        growth: PortraitGrowth,
        doctrine: PortraitDoctrine = .constitutionalRitual
    ) -> String {
        let iterationLine = iteration.map {
            let version = revision <= 1 ? "v\($0)" : "v\($0).\(revision)"
            return "Sketch iteration: \(version)\n"
        } ?? ""
        let refinementLine = refinementDepth.map {
            "Visual refinement depth: \($0). Later archived iterations should contain more surface detail, layered geometry, texture, and material specificity.\n"
        } ?? ""

        return """
        # FoldPortrait Abstract Studio Notes

        Seed: \(seed)
        \(iterationLine)Convergence hash: \(convergenceHashHex)
        Render hash: \(renderHashHex)
        Memory signature: \(memorySignatureHex)

        ## Artwork

        Build an intentionally abstract portrait of \(doctrine.subjectAnchor).
        Let the work read first as a painting or drawing, not as a literal face.
        The portrait may imply presence through weight, rhythm, pressure, field, and recurring Fold notation.

        ## Compositional Genome

        - Field width pressure: \(format(parameters.faceWidth))
        - Vertical field pressure: \(format(parameters.faceHeight))
        - Lower mass taper: \(format(parameters.jawTaper))
        - Internal horizon: \(format(parameters.cheekboneHeight))
        - Axis tilt: \(format(parameters.headTilt))
        - Natural asymmetry: \(format(parameters.asymmetry))

        ## Mark System

        - Paired interval: \(format(parameters.eyeSpacing))
        - Mark scale: \(format(parameters.eyeSize))
        - Diagonal tension: \(format(parameters.browSlope))
        - Central descent: \(format(parameters.noseLength))
        - Central breadth: \(format(parameters.noseWidth))
        - Lateral span: \(format(parameters.mouthWidth))
        - Curve pressure: \(format(parameters.mouthCurve))

        ## Surface And Material

        Ground color: \(parameters.skinTone).
        Dense mark color: \(parameters.hairTone).
        Structural color: \(parameters.garmentTone).
        Treat these as paint, graphite, wash, stain, and paper behavior.
        Surface activity: \(format(parameters.skinTexture)).
        Massing: \(format(parameters.hairMass)).

        ## Growth Climate

        Evolution age: \(growth.age).
        Seasonal phase: \(growth.season).
        Active force: \(growth.activeForce).
        Material state: \(growth.materialState).
        Compression: \(format(growth.compression)).
        Torsion: \(format(growth.torsion)).
        Shear: \(format(growth.shear)).
        Bloom: \(format(growth.bloom)).
        Erosion: \(format(growth.erosion)).
        Sediment: \(format(growth.sediment)).
        Fiber memory: \(format(growth.fiberMemory)).
        Let these forces alter placement, curve behavior, density, weathering, and material residue over time.

        ## Fold Signature

        \(doctrine.foldVisibility).
        Use Fold marks as quiet constitutional traces, not decorative motifs.
        They may appear as grid pressure, small notation, scratched lines, washed fields, or repeated structural intervals.
        Fold mark scale: \(format(parameters.foldMarkScale)).
        Fold mark opacity: \(format(parameters.foldMarkOpacity)).
        \(refinementLine)Preserve the identity hash while increasing visual resolution across future archived iterations.

        ## Light And Space

        Light angle: \(format(parameters.keyLightAngle)).
        Light strength: \(format(parameters.keyLightStrength)).
        Shadow softness: \(format(parameters.shadowSoftness)).
        Viewing distance: \(format(parameters.cameraDistance)).
        Compression: \(format(parameters.lensCompression)).
        Use these as spatial pressures inside the artwork, not camera instructions.

        ## Negative Constraints

        \(doctrine.aestheticConstraints.map { "- \($0)" }.joined(separator: "\n"))

        Avoid forcing literal likeness. Avoid costume fantasy, avatar polish, and obvious character design.
        Preserve the sense that this is a durable constitutional identity emerging through accumulated marks.

        ## Continuity Rule

        \(doctrine.continuityRule)
        Each archived sketch iteration should be visibly distinct while preserving this convergence hash as the identity anchor.
        """
    }

    private func format(_ value: Double) -> String {
        String(format: "%.3f", value)
    }
}
