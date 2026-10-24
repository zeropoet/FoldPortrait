import Foundation

public struct PortraitGrowth: Equatable, Sendable {
    public let age: Int
    public let season: Int
    public let compression: Double
    public let torsion: Double
    public let shear: Double
    public let bloom: Double
    public let erosion: Double
    public let sediment: Double
    public let fiberMemory: Double
    public let activeForce: String
    public let materialState: String

    public var reportLines: [String] {
        [
            "age \(age) season \(season) active force \(activeForce)",
            "compression \(Self.format(compression)) torsion \(Self.format(torsion)) shear \(Self.format(shear))",
            "bloom \(Self.format(bloom)) erosion \(Self.format(erosion)) sediment \(Self.format(sediment))",
            "fiber memory \(Self.format(fiberMemory)) material \(materialState)",
        ]
    }

    public init(
        convergenceHash: [UInt8],
        sketchHash: [UInt8],
        refinementDepth: Int
    ) {
        precondition(convergenceHash.count >= 32, "PortraitGrowth requires a 32-byte convergence hash.")
        precondition(sketchHash.count >= 32, "PortraitGrowth requires a 32-byte sketch hash.")

        age = max(1, refinementDepth)
        season = ((age - 1) / 13) % 8

        let seasonalPulse = sin(Double(age) * 0.38196601125 + Double(season))
        let longArc = sin(Double(age) * 0.07142857143)

        compression = Self.clamp(Self.map(convergenceHash[29], to: 0.18...0.86) + seasonalPulse * 0.08)
        torsion = Self.clamp(Self.map(sketchHash[5], to: 0.10...0.92) + longArc * 0.06)
        shear = Self.clamp(Self.map(sketchHash[11], to: 0.12...0.88) - seasonalPulse * 0.05)
        bloom = Self.clamp(Self.map(sketchHash[17], to: 0.08...0.94) + Double(season) * 0.018)
        erosion = Self.clamp(Self.map(sketchHash[23], to: 0.06...0.84) + Double(age % 37) / 370)
        sediment = Self.clamp(Self.map(convergenceHash[30], to: 0.10...0.90) + Double(age % 89) / 890)
        fiberMemory = Self.clamp(Self.map(convergenceHash[31], to: 0.22...0.96) + longArc * 0.04)

        let forces = [
            "compression",
            "torsion",
            "shear",
            "bloom",
            "erosion",
            "sediment",
            "fiber-memory",
            "counter-growth",
        ]
        let materials = [
            "dry graphite",
            "wet wash",
            "creased paper",
            "stained fiber",
            "abraded ink",
            "settled pigment",
            "burnished edge",
            "reopened fold",
        ]

        activeForce = forces[(Int(sketchHash[27]) + season + age) % forces.count]
        materialState = materials[(Int(convergenceHash[28]) + season + age / 5) % materials.count]
    }

    private static func map(_ byte: UInt8, to range: ClosedRange<Double>) -> Double {
        let normalized = Double(byte) / 255
        return range.lowerBound + normalized * (range.upperBound - range.lowerBound)
    }

    private static func clamp(_ value: Double) -> Double {
        min(1, max(0, value))
    }

    private static func format(_ value: Double) -> String {
        String(format: "%.2f", value)
    }
}
