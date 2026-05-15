import FoldKernel
import Foundation

public struct PortraitParameters: Equatable, Sendable {
    public let faceWidth: Double
    public let faceHeight: Double
    public let jawTaper: Double
    public let cheekboneHeight: Double
    public let headTilt: Double
    public let asymmetry: Double

    public let eyeSpacing: Double
    public let eyeSize: Double
    public let browSlope: Double
    public let noseLength: Double
    public let noseWidth: Double
    public let mouthWidth: Double
    public let mouthCurve: Double

    public let skinTone: String
    public let skinTexture: Double
    public let hairTone: String
    public let hairMass: Double
    public let garmentTone: String

    public let keyLightAngle: Double
    public let keyLightStrength: Double
    public let shadowSoftness: Double
    public let cameraDistance: Double
    public let lensCompression: Double

    public let foldMarkScale: Double
    public let foldMarkOpacity: Double

    public init(hash: [UInt8], memorySignature: [UInt8], permutation: Permutation) {
        precondition(hash.count >= 32, "PortraitParameters requires a 32-byte convergence hash.")

        faceWidth = Self.map(hash[0], to: 0.84...1.16)
        faceHeight = Self.map(hash[1], to: 0.90...1.14)
        jawTaper = Self.map(hash[2], to: 0.76...1.20)
        cheekboneHeight = Self.map(hash[3], to: 0.42...0.58)
        headTilt = Self.mapSigned(hash[4], to: 7)
        asymmetry = Self.mapSigned(hash[5], to: 18)

        eyeSpacing = Self.map(hash[6], to: 0.86...1.18)
        eyeSize = Self.map(hash[7], to: 0.82...1.22)
        browSlope = Self.mapSigned(hash[8], to: 16)
        noseLength = Self.map(hash[9], to: 0.84...1.22)
        noseWidth = Self.map(hash[10], to: 0.78...1.16)
        mouthWidth = Self.map(hash[11], to: 0.84...1.20)
        mouthCurve = Self.mapSigned(hash[12], to: 42)

        let skinRed = UInt8(196 + Int(hash[13] % 42))
        let skinGreen = UInt8(138 + Int(hash[14] % 58))
        let skinBlue = UInt8(104 + Int(hash[15] % 56))
        skinTone = Self.color(skinRed, skinGreen, skinBlue)
        skinTexture = Self.map(hash[16], to: 0.05...0.45)
        hairTone = Self.color(hash[17], hash[18], hash[19], ceiling: 86)
        hairMass = Self.map(hash[20], to: 0.82...1.28)
        garmentTone = Self.color(hash[21], hash[22], hash[23], floor: 70)

        keyLightAngle = Self.map(hash[24], to: -58...58)
        keyLightStrength = Self.map(hash[25], to: 0.20...0.56)
        shadowSoftness = Self.map(hash[26], to: 0.18...0.64)
        cameraDistance = Self.map(hash[27], to: 0.84...1.12)
        lensCompression = Self.map(hash[28], to: 0.88...1.18)

        let memoryDensity = Double(memorySignature.reduce(0) { $0 + Int($1) } % 256) / 255
        let permutationBias = Double(permutation.values.reduce(0) { $0 + Int($1) } % 16) / 15
        foldMarkScale = 0.74 + memoryDensity * 0.52
        foldMarkOpacity = 0.28 + permutationBias * 0.30
    }

    public var reportLines: [String] {
        [
            "face width \(Self.format(faceWidth)) height \(Self.format(faceHeight)) jaw \(Self.format(jawTaper))",
            "eyes spacing \(Self.format(eyeSpacing)) size \(Self.format(eyeSize)) brow \(Self.format(browSlope))",
            "nose length \(Self.format(noseLength)) width \(Self.format(noseWidth))",
            "mouth width \(Self.format(mouthWidth)) curve \(Self.format(mouthCurve))",
            "skin texture \(Self.format(skinTexture)) hair mass \(Self.format(hairMass))",
            "light angle \(Self.format(keyLightAngle)) strength \(Self.format(keyLightStrength))",
        ]
    }

    private static func map(_ byte: UInt8, to range: ClosedRange<Double>) -> Double {
        let normalized = Double(byte) / 255
        return range.lowerBound + normalized * (range.upperBound - range.lowerBound)
    }

    private static func mapSigned(_ byte: UInt8, to magnitude: Double) -> Double {
        map(byte, to: -magnitude...magnitude)
    }

    private static func color(
        _ red: UInt8,
        _ green: UInt8,
        _ blue: UInt8,
        floor: UInt8 = 0,
        ceiling: UInt8 = 255
    ) -> String {
        let channels = [red, green, blue].map { value in
            min(ceiling, max(floor, value))
        }

        return "#\(channels.map { String(format: "%02x", $0) }.joined())"
    }

    private static func format(_ value: Double) -> String {
        String(format: "%.2f", value)
    }
}
