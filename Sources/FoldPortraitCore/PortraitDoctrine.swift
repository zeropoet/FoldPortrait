public struct PortraitDoctrine: Equatable, Sendable {
    public let identityTone: [String]
    public let subjectAnchor: String
    public let foldVisibility: String
    public let aestheticConstraints: [String]
    public let continuityRule: String

    public static let constitutionalRitual = PortraitDoctrine(
        identityTone: [
            "ritual figure",
            "cinematic",
            "mythic",
            "serious",
        ],
        subjectAnchor: "an abstract constitutional identity designed to evolve into the distant future",
        foldVisibility: "Fold marks remain visible, subtle, and integrated into skin, catchlights, textile, or background geometry",
        aestheticConstraints: [
            "no horror",
            "no caricature",
            "no plastic skin",
            "no generic AI beauty",
            "no fantasy armor",
            "no exaggerated symmetry",
        ],
        continuityRule: "Each future portrait should preserve the same Fold-derived identity genome while allowing age, material, light, and context to evolve."
    )
}
