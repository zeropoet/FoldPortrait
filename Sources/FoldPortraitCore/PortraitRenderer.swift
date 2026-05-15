import FoldKernel
import Foundation

public struct PortraitRenderResult: Equatable {
    public let svg: String
    public let convergenceHashHex: String
    public let memorySignatureHex: String
}

public struct PortraitRenderer {
    public init() {}

    public func render(seed: String) -> PortraitRenderResult {
        let permutation = permutationFromSeed(seed)
        let events = events(for: permutation, seed: seed)
        let memorySignature = MemoryEncoder().encode(events)
        let convergenceHash = HashEngine().convergenceHash(memorySignature: memorySignature)
        let svg = svgDocument(
            permutation: permutation,
            convergenceHash: convergenceHash,
            seed: seed
        )

        return PortraitRenderResult(
            svg: svg,
            convergenceHashHex: Self.hex(convergenceHash),
            memorySignatureHex: Self.hex(memorySignature)
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
        seed: String
    ) -> String {
        let width = 1200
        let height = 1600
        let centerX = width / 2
        let faceCenterY = 690
        let palette = palette(from: convergenceHash)
        let escapedSeed = Self.escape(seed)
        let marks = facialMarks(permutation: permutation, hash: convergenceHash)
        let hair = hairPath(hash: convergenceHash, centerX: centerX, faceCenterY: faceCenterY)

        return """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \(width) \(height)" role="img" aria-labelledby="title desc">
          <title id="title">Fold portrait for \(escapedSeed)</title>
          <desc id="desc">A deterministic portrait generated from a FoldKernel memory signature and convergence hash.</desc>
          <rect width="1200" height="1600" fill="\(palette.background)"/>
          <path d="M0 1190 C180 1060 310 1130 480 1020 C690 880 860 910 1200 760 L1200 1600 L0 1600 Z" fill="\(palette.shadow)" opacity="0.42"/>
          <path d="\(hair)" fill="\(palette.hair)"/>
          <ellipse cx="600" cy="705" rx="286" ry="382" fill="\(palette.skin)"/>
          <path d="M384 664 C430 622 492 622 538 664" fill="none" stroke="\(palette.line)" stroke-width="18" stroke-linecap="round"/>
          <path d="M662 664 C708 622 770 622 816 664" fill="none" stroke="\(palette.line)" stroke-width="18" stroke-linecap="round"/>
          <circle cx="462" cy="706" r="25" fill="\(palette.eye)"/>
          <circle cx="738" cy="706" r="25" fill="\(palette.eye)"/>
          <path d="M600 726 C572 804 568 850 626 858" fill="none" stroke="\(palette.line)" stroke-width="14" stroke-linecap="round"/>
          <path d="M484 964 C550 1028 654 1028 718 964" fill="none" stroke="\(palette.line)" stroke-width="18" stroke-linecap="round"/>
          <path d="M392 1096 C512 1190 696 1190 808 1096 L880 1600 L320 1600 Z" fill="\(palette.garment)"/>
          <g opacity="0.82">
        \(marks)
          </g>
          <text x="600" y="1490" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="30" fill="\(palette.line)">\(Self.hex(convergenceHash.prefix(8)))</text>
        </svg>
        """
    }

    private func facialMarks(permutation: Permutation, hash: [UInt8]) -> String {
        permutation.values.enumerated().map { index, value in
            let row = index / 4
            let column = index % 4
            let side = column < 2 ? -1 : 1
            let x = 600 + side * (78 + column % 2 * 82)
            let y = 540 + row * 138 + Int(hash[index] % 34)
            let radius = 6 + Int(value % 13)
            let opacity = 0.22 + Double(hash[(index + 7) % hash.count] % 48) / 100
            let formattedOpacity = String(format: "%.2f", opacity)

            return "    <circle cx=\"\(x)\" cy=\"\(y)\" r=\"\(radius)\" fill=\"#1f2933\" opacity=\"\(formattedOpacity)\"/>"
        }.joined(separator: "\n")
    }

    private func hairPath(hash: [UInt8], centerX: Int, faceCenterY: Int) -> String {
        let leftLift = 250 + Int(hash[0] % 120)
        let rightLift = 230 + Int(hash[1] % 130)
        let crown = faceCenterY - 430 - Int(hash[2] % 90)
        let leftEdge = centerX - 315 - Int(hash[3] % 70)
        let rightEdge = centerX + 310 + Int(hash[4] % 70)

        return "M\(leftEdge) \(faceCenterY + 60) C\(leftEdge + 10) \(faceCenterY - leftLift) \(centerX - 180) \(crown) \(centerX) \(crown) C\(centerX + 210) \(crown) \(rightEdge - 30) \(faceCenterY - rightLift) \(rightEdge) \(faceCenterY + 80) C\(830) 448 716 388 600 396 C486 392 370 462 \(leftEdge) \(faceCenterY + 60) Z"
    }

    private func palette(from hash: [UInt8]) -> (
        background: String,
        shadow: String,
        skin: String,
        hair: String,
        eye: String,
        line: String,
        garment: String
    ) {
        (
            background: Self.color(hash[0], hash[1], hash[2], floor: 178),
            shadow: Self.color(hash[3], hash[4], hash[5], floor: 74),
            skin: Self.color(222, 174 + hash[6] % 42, 134 + hash[7] % 52),
            hair: Self.color(hash[8], hash[9], hash[10], ceiling: 92),
            eye: Self.color(hash[11], hash[12], hash[13], ceiling: 58),
            line: "#1f2933",
            garment: Self.color(hash[14], hash[15], hash[16], floor: 84)
        )
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

    private static func escape(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}
