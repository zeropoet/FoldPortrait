public struct PortraitDoctrine: Equatable, Sendable {
    public let identityTone: [String]
    public let subjectAnchor: String
    public let foldVisibility: String
    public let aestheticConstraints: [String]
    public let continuityRule: String

    public static let constitutionalRitual = PortraitDoctrine(
        identityTone: [
            "abstract portrait",
            "painterly",
            "gestural",
            "ritual",
        ],
        subjectAnchor: "an abstract constitutional identity expressed as drawing, painting, field, rhythm, and Fold notation",
        foldVisibility: "Fold marks remain visible as structural notation, gesture, field pressure, and accumulated drawing",
        aestheticConstraints: [
            "no literal realism requirement",
            "no generic avatar beauty",
            "no decorative symbolism without structure",
            "no fantasy costume logic",
            "no symmetry as default",
            "no polishing away the hand of the drawing",
        ],
        continuityRule: "Each future portrait should preserve the same Fold-derived identity genome while allowing mark density, field structure, material behavior, and painterly complexity to evolve."
    )
}
