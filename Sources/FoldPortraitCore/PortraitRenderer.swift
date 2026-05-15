import FoldKernel
import Foundation

public struct PortraitRenderResult: Equatable, Sendable {
    public let svg: String
    public let photorealPrompt: String
    public let convergenceHashHex: String
    public let memorySignatureHex: String
    public let parameters: PortraitParameters
}

public struct PortraitRenderer: Sendable {
    public init() {}

    public func render(seed: String) -> PortraitRenderResult {
        let permutation = permutationFromSeed(seed)
        let events = events(for: permutation, seed: seed)
        let memorySignature = MemoryEncoder().encode(events)
        let convergenceHash = HashEngine().convergenceHash(memorySignature: memorySignature)
        let parameters = PortraitParameters(
            hash: convergenceHash,
            memorySignature: memorySignature,
            permutation: permutation
        )
        let svg = svgDocument(
            permutation: permutation,
            convergenceHash: convergenceHash,
            seed: seed,
            parameters: parameters
        )
        let convergenceHashHex = Self.hex(convergenceHash)
        let memorySignatureHex = Self.hex(memorySignature)
        let photorealPrompt = PhotorealPromptBuilder().prompt(
            seed: seed,
            convergenceHashHex: convergenceHashHex,
            memorySignatureHex: memorySignatureHex,
            parameters: parameters
        )

        return PortraitRenderResult(
            svg: svg,
            photorealPrompt: photorealPrompt,
            convergenceHashHex: convergenceHashHex,
            memorySignatureHex: memorySignatureHex,
            parameters: parameters
        )
    }

    private func events(for permutation: Permutation, seed: String) -> [FoldEvent] {
        let seedBytes = Array(seed.utf8)
        let lockState = seedBytes.reduce(UInt8(0)) { $0 ^ $1 }
        let topology = UInt8(seedBytes.count % 16)

        return [
            .permutationCommit(permutation),
            .lockStateChange(lockState),
            .foldTopologyChange(topology),
        ]
    }

    private func permutationFromSeed(_ seed: String) -> Permutation {
        var values = CanonicalSquare.S0.values
        let seedBytes = Array(seed.utf8.isEmpty ? "FoldPortrait".utf8 : seed.utf8)

        for index in values.indices.reversed() {
            let byte = Int(seedBytes[index % seedBytes.count])
            let swapIndex = (byte + index * 7) % (index + 1)
            values.swapAt(index, swapIndex)
        }

        return try! Permutation(values)
    }

    private func svgDocument(
        permutation: Permutation,
        convergenceHash: [UInt8],
        seed: String,
        parameters: PortraitParameters
    ) -> String {
        let width = 1200
        let height = 1600
        let centerX = width / 2
        let faceCenterY = 690
        let escapedSeed = Self.escape(seed)
        let background = Self.color(convergenceHash[0], convergenceHash[1], convergenceHash[2], floor: 178)
        let shadow = Self.color(convergenceHash[3], convergenceHash[4], convergenceHash[5], floor: 74)
        let eyeTone = Self.color(convergenceHash[29], convergenceHash[30], convergenceHash[31], ceiling: 58)
        let line = "#1f2933"
        let marks = facialMarks(
            permutation: permutation,
            hash: convergenceHash,
            parameters: parameters
        )
        let hair = hairPath(
            hash: convergenceHash,
            centerX: centerX,
            faceCenterY: faceCenterY,
            parameters: parameters
        )
        let faceRadiusX = Int(286 * parameters.faceWidth * parameters.lensCompression)
        let faceRadiusY = Int(382 * parameters.faceHeight / parameters.cameraDistance)
        let eyeDistance = Int(138 * parameters.eyeSpacing)
        let eyeRadius = Int(25 * parameters.eyeSize)
        let noseLength = Int(118 * parameters.noseLength)
        let noseWidth = Int(30 * parameters.noseWidth)
        let mouthHalfWidth = Int(116 * parameters.mouthWidth)
        let mouthY = 964 + Int(parameters.mouthCurve / 4)
        let smileDepth = Int(46 + parameters.mouthCurve)
        let cheekY = faceCenterY - Int(faceRadiusY) + Int(Double(faceRadiusY * 2) * parameters.cheekboneHeight)
        let jawInset = Int(72 * parameters.jawTaper)
        let report = parameterReport(parameters)

        return """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \(width) \(height)" role="img" aria-labelledby="title desc">
          <title id="title">Fold portrait for \(escapedSeed)</title>
          <desc id="desc">A deterministic portrait generated from a FoldKernel memory signature and convergence hash.</desc>
          <defs>
            <radialGradient id="skinLight" cx="\(50 + Int(parameters.keyLightAngle / 2))%" cy="38%" r="64%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="\(Self.format(parameters.keyLightStrength))"/>
              <stop offset="48%" stop-color="\(parameters.skinTone)" stop-opacity="1"/>
              <stop offset="100%" stop-color="\(shadow)" stop-opacity="\(Self.format(parameters.shadowSoftness))"/>
            </radialGradient>
          </defs>
          <rect width="1200" height="1600" fill="\(background)"/>
          <path d="M0 1190 C180 1060 310 1130 480 1020 C690 880 860 910 1200 760 L1200 1600 L0 1600 Z" fill="\(shadow)" opacity="0.42"/>
          <g transform="rotate(\(Self.format(parameters.headTilt)) 600 760)">
          <path d="\(hair)" fill="\(parameters.hairTone)"/>
          <path d="M\(600 - faceRadiusX) \(faceCenterY) C\(600 - faceRadiusX) \(faceCenterY - faceRadiusY / 2) \(600 - jawInset) \(faceCenterY - faceRadiusY) 600 \(faceCenterY - faceRadiusY) C\(600 + jawInset) \(faceCenterY - faceRadiusY) \(600 + faceRadiusX) \(faceCenterY - faceRadiusY / 2) \(600 + faceRadiusX) \(faceCenterY) C\(600 + faceRadiusX) \(cheekY) \(600 + jawInset) \(faceCenterY + faceRadiusY) 600 \(faceCenterY + faceRadiusY) C\(600 - jawInset) \(faceCenterY + faceRadiusY) \(600 - faceRadiusX) \(cheekY) \(600 - faceRadiusX) \(faceCenterY) Z" fill="url(#skinLight)"/>
          <path d="M\(394 + Int(parameters.asymmetry)) \(664 - Int(parameters.browSlope / 2)) C430 622 492 622 \(538 + Int(parameters.browSlope)) 664" fill="none" stroke="\(line)" stroke-width="18" stroke-linecap="round"/>
          <path d="M\(662 + Int(parameters.browSlope)) 664 C708 622 770 622 \(806 + Int(parameters.asymmetry)) \(664 + Int(parameters.browSlope / 2))" fill="none" stroke="\(line)" stroke-width="18" stroke-linecap="round"/>
          <circle cx="\(600 - eyeDistance)" cy="706" r="\(eyeRadius)" fill="\(eyeTone)"/>
          <circle cx="\(600 + eyeDistance + Int(parameters.asymmetry / 3))" cy="706" r="\(eyeRadius)" fill="\(eyeTone)"/>
          <path d="M600 726 C\(600 - noseWidth) \(726 + noseLength / 2) \(600 - noseWidth) \(726 + noseLength) \(626 + Int(parameters.asymmetry / 4)) \(738 + noseLength)" fill="none" stroke="\(line)" stroke-width="14" stroke-linecap="round"/>
          <path d="M\(600 - mouthHalfWidth) \(mouthY) C550 \(mouthY + smileDepth) 654 \(mouthY + smileDepth) \(600 + mouthHalfWidth) \(mouthY)" fill="none" stroke="\(line)" stroke-width="18" stroke-linecap="round"/>
          <path d="M392 1096 C512 1190 696 1190 808 1096 L880 1600 L320 1600 Z" fill="\(parameters.garmentTone)"/>
          <g opacity="0.82">
        \(marks)
          </g>
          </g>
          <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="\(line)">
            <text x="600" y="1460" text-anchor="middle" font-size="30">\(Self.hex(convergenceHash.prefix(8)))</text>
        \(report)
          </g>
        </svg>
        """
    }

    private func facialMarks(
        permutation: Permutation,
        hash: [UInt8],
        parameters: PortraitParameters
    ) -> String {
        permutation.values.enumerated().map { index, value in
            let row = index / 4
            let column = index % 4
            let side = column < 2 ? -1 : 1
            let x = 600 + side * Int(Double(78 + column % 2 * 82) * parameters.faceWidth)
            let y = 540 + row * 138 + Int(hash[index] % 34)
            let radius = Int(Double(6 + Int(value % 13)) * parameters.foldMarkScale)
            let opacity = parameters.foldMarkOpacity + Double(hash[(index + 7) % hash.count] % 22) / 100
            let formattedOpacity = String(format: "%.2f", opacity)

            return "    <circle cx=\"\(x)\" cy=\"\(y)\" r=\"\(radius)\" fill=\"#1f2933\" opacity=\"\(formattedOpacity)\"/>"
        }.joined(separator: "\n")
    }

    private func hairPath(
        hash: [UInt8],
        centerX: Int,
        faceCenterY: Int,
        parameters: PortraitParameters
    ) -> String {
        let leftLift = Int(Double(250 + Int(hash[0] % 120)) * parameters.hairMass)
        let rightLift = Int(Double(230 + Int(hash[1] % 130)) * parameters.hairMass)
        let crown = faceCenterY - 430 - Int(hash[2] % 90)
        let leftEdge = centerX - 315 - Int(hash[3] % 70)
        let rightEdge = centerX + 310 + Int(hash[4] % 70)

        return "M\(leftEdge) \(faceCenterY + 60) C\(leftEdge + 10) \(faceCenterY - leftLift) \(centerX - 180) \(crown) \(centerX) \(crown) C\(centerX + 210) \(crown) \(rightEdge - 30) \(faceCenterY - rightLift) \(rightEdge) \(faceCenterY + 80) C\(830) 448 716 388 600 396 C486 392 370 462 \(leftEdge) \(faceCenterY + 60) Z"
    }

    private func parameterReport(_ parameters: PortraitParameters) -> String {
        parameters.reportLines.enumerated().map { index, line in
            let y = 1492 + index * 20
            return "    <text x=\"600\" y=\"\(y)\" text-anchor=\"middle\" font-size=\"15\" opacity=\"0.72\">\(Self.escape(line))</text>"
        }.joined(separator: "\n")
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

        return "#\(hex(channels))"
    }

    private static func hex<S: Sequence>(_ bytes: S) -> String where S.Element == UInt8 {
        bytes.map { String(format: "%02x", $0) }.joined()
    }

    private static func format(_ value: Double) -> String {
        String(format: "%.2f", value)
    }

    private static func escape(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}
