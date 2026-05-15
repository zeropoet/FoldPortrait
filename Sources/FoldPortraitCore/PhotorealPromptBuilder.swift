import Foundation

public struct PhotorealPromptBuilder: Sendable {
    public init() {}

    public func prompt(
        seed: String,
        convergenceHashHex: String,
        memorySignatureHex: String,
        parameters: PortraitParameters,
        doctrine: PortraitDoctrine = .constitutionalRitual
    ) -> String {
        """
        # FoldPortrait Photoreal Render Prompt

        Seed: \(seed)
        Convergence hash: \(convergenceHashHex)
        Memory signature: \(memorySignatureHex)

        ## Subject

        Create a photoreal cinematic portrait of \(doctrine.subjectAnchor).
        The figure should read as a ritual figure: cinematic, mythic, serious.
        The expression is composed, watchful, and grave without menace.

        ## Identity Geometry

        - Face width: \(format(parameters.faceWidth))
        - Face height: \(format(parameters.faceHeight))
        - Jaw taper: \(format(parameters.jawTaper))
        - Cheekbone height: \(format(parameters.cheekboneHeight))
        - Head tilt: \(format(parameters.headTilt))
        - Natural asymmetry: \(format(parameters.asymmetry))

        ## Feature Geometry

        - Eye spacing: \(format(parameters.eyeSpacing))
        - Eye size: \(format(parameters.eyeSize))
        - Brow slope: \(format(parameters.browSlope))
        - Nose length: \(format(parameters.noseLength))
        - Nose width: \(format(parameters.noseWidth))
        - Mouth width: \(format(parameters.mouthWidth))
        - Mouth curve: \(format(parameters.mouthCurve))

        ## Surface And Material

        Skin tone base: \(parameters.skinTone).
        Hair tone base: \(parameters.hairTone).
        Garment tone base: \(parameters.garmentTone).
        Skin should be real and textured, with pores, slight unevenness, and restrained surface detail.
        Skin texture intensity: \(format(parameters.skinTexture)).
        Hair mass: \(format(parameters.hairMass)).

        ## Fold Signature

        \(doctrine.foldVisibility).
        Use the Fold marks as quiet constitutional traces, not decorative tattoos.
        They may appear as faint cheek marks, tiny catchlight geometry, woven garment structure, or soft background alignments.
        Fold mark scale: \(format(parameters.foldMarkScale)).
        Fold mark opacity: \(format(parameters.foldMarkOpacity)).

        ## Lighting And Camera

        Cinematic portrait lighting with a solemn ritual atmosphere.
        Key light angle: \(format(parameters.keyLightAngle)).
        Key light strength: \(format(parameters.keyLightStrength)).
        Shadow softness: \(format(parameters.shadowSoftness)).
        Camera distance: \(format(parameters.cameraDistance)).
        Lens compression: \(format(parameters.lensCompression)).
        Use realistic optics, shallow but not extreme depth of field, and controlled contrast.

        ## Negative Constraints

        \(doctrine.aestheticConstraints.map { "- \($0)" }.joined(separator: "\n"))

        Avoid spectacle. Avoid costume fantasy. Avoid horror, parody, excessive beauty retouching, and impossible symmetry.
        Preserve the sense that this is a durable constitutional identity, not a transient character design.

        ## Continuity Rule

        \(doctrine.continuityRule)
        """
    }

    private func format(_ value: Double) -> String {
        String(format: "%.3f", value)
    }
}
