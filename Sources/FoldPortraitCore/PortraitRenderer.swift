import FoldKernel
import Foundation

public struct PortraitRenderResult: Equatable, Sendable {
    public let svg: String
    public let artworkNotes: String
    public let convergenceHashHex: String
    public let renderHashHex: String
    public let memorySignatureHex: String
    public let parameters: PortraitParameters
    public let iteration: Int?
    public let refinementDepth: Int
}

public struct PortraitRenderer: Sendable {
    public init() {}

    public func render(
        seed: String,
        iteration: Int? = nil,
        refinementDepth requestedRefinementDepth: Int? = nil
    ) -> PortraitRenderResult {
        let refinementDepth = Self.refinementDepth(for: requestedRefinementDepth ?? iteration)
        let permutation = permutationFromSeed(seed)
        let events = events(for: permutation, seed: seed)
        let memorySignature = MemoryEncoder().encode(events)
        let convergenceHash = HashEngine().convergenceHash(memorySignature: memorySignature)
        let sketchHash = Self.sketchVariationHash(
            convergenceHash: convergenceHash,
            seed: seed,
            iteration: refinementDepth
        )
        let parameters = PortraitParameters(
            hash: convergenceHash,
            memorySignature: memorySignature,
            permutation: permutation
        )
        let svg = svgDocument(
            permutation: permutation,
            memorySignature: memorySignature,
            convergenceHash: convergenceHash,
            sketchHash: sketchHash,
            seed: seed,
            iteration: iteration,
            refinementDepth: refinementDepth,
            parameters: parameters
        )
        let convergenceHashHex = Self.hex(convergenceHash)
        let renderHashHex = Self.hex(sketchHash)
        let memorySignatureHex = Self.hex(memorySignature)
        let artworkNotes = ArtworkNotesBuilder().notes(
            seed: seed,
            iteration: iteration,
            refinementDepth: refinementDepth,
            convergenceHashHex: convergenceHashHex,
            renderHashHex: renderHashHex,
            memorySignatureHex: memorySignatureHex,
            parameters: parameters
        )

        return PortraitRenderResult(
            svg: svg,
            artworkNotes: artworkNotes,
            convergenceHashHex: convergenceHashHex,
            renderHashHex: renderHashHex,
            memorySignatureHex: memorySignatureHex,
            parameters: parameters,
            iteration: iteration,
            refinementDepth: refinementDepth
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
        memorySignature: [UInt8],
        convergenceHash: [UInt8],
        sketchHash: [UInt8],
        seed: String,
        iteration: Int?,
        refinementDepth: Int,
        parameters: PortraitParameters
    ) -> String {
        let width = 1200
        let height = 1600
        let escapedSeed = Self.escape(seed)
        let iterationLabel = iteration.map { String(format: "v%04d", $0) } ?? "base"
        let paper = Self.color(sketchHash[0], sketchHash[1], sketchHash[2], floor: 208)
        let wash = Self.color(sketchHash[3], sketchHash[4], sketchHash[5], floor: 92)
        let accent = Self.color(sketchHash[13], sketchHash[14], sketchHash[15], floor: 48, ceiling: 190)
        let secondAccent = Self.color(sketchHash[21], sketchHash[22], sketchHash[23], floor: 70, ceiling: 218)
        let line = "#1f2933"
        let structuralField = structuralMemoryField(
            memorySignature: memorySignature,
            convergenceHash: convergenceHash,
            sketchHash: sketchHash,
            line: line,
            accent: secondAccent,
            refinementDepth: refinementDepth
        )
        let field = abstractColorField(
            hash: sketchHash,
            wash: wash,
            accent: accent,
            refinementDepth: refinementDepth
        )
        let gestures = abstractGestures(
            hash: sketchHash,
            line: line,
            accent: secondAccent,
            refinementDepth: refinementDepth
        )
        let glyph = foldGlyph(
            permutation: permutation,
            hash: sketchHash,
            line: line,
            accent: accent,
            refinementDepth: refinementDepth,
            parameters: parameters
        )
        let notations = foldNotationMarks(
            permutation: permutation,
            hash: sketchHash,
            line: line,
            refinementDepth: refinementDepth
        )
        let fineDrawing = fineDrawing(
            hash: sketchHash,
            line: line,
            refinementDepth: refinementDepth
        )
        let report = parameterReport(parameters)

        return """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \(width) \(height)" role="img" aria-labelledby="title desc" data-refinement-depth="\(refinementDepth)" data-art-mode="structural-abstract" data-convergence-hash="\(Self.hex(convergenceHash))" data-render-hash="\(Self.hex(sketchHash))" data-memory-signature="\(Self.hex(memorySignature))" data-permutation="\(permutation.values.map(String.init).joined(separator: "-"))">
          <title id="title">Abstract Fold portrait \(iterationLabel) for \(escapedSeed)</title>
          <desc id="desc">A deterministic structural portrait generated from a FoldKernel memory signature, permutation, and convergence hash, with iteration-specific drawing refinement.</desc>
          <defs>
            <filter id="paperGrain" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="\(Int(sketchHash[6]))"/>
              <feColorMatrix type="saturate" values="0"/>
              <feComponentTransfer>
                <feFuncA type="table" tableValues="0 0.10"/>
              </feComponentTransfer>
            </filter>
          </defs>
          <rect width="1200" height="1600" fill="\(paper)"/>
          <rect width="1200" height="1600" filter="url(#paperGrain)" opacity="0.55"/>
        \(structuralField)
        \(field)
          <g transform="rotate(\(Self.format(parameters.headTilt + Double(Self.signedOffset(sketchHash[19], magnitude: 6))) ) 600 800)">
        \(gestures)
        \(glyph)
        \(fineDrawing)
          </g>
        \(notations)
          <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="\(line)">
            <text x="600" y="1460" text-anchor="middle" font-size="30">\(Self.hex(sketchHash.prefix(8)))</text>
            <text x="600" y="1482" text-anchor="middle" font-size="17" opacity="0.72">abstract study \(iterationLabel)</text>
        \(report)
          </g>
        </svg>
        """
    }

    private func structuralMemoryField(
        memorySignature: [UInt8],
        convergenceHash: [UInt8],
        sketchHash: [UInt8],
        line: String,
        accent: String,
        refinementDepth: Int
    ) -> String {
        let byteMarks = memorySignature.enumerated().map { index, byte in
            let column = index % 6
            let row = index / 6
            let x = 210 + column * 156 + Self.signedOffset(sketchHash[index % sketchHash.count], magnitude: 16)
            let y = 190 + row * 118 + Self.signedOffset(sketchHash[(index + 5) % sketchHash.count], magnitude: 16)
            let width = 28 + Int(byte % 72)
            let height = 10 + Int(convergenceHash[index % convergenceHash.count] % 54)
            let opacity = 0.16 + Double(byte % 18) / 100

            return "  <rect data-layer=\"memory-byte\" x=\"\(x)\" y=\"\(y)\" width=\"\(width)\" height=\"\(height)\" fill=\"\(accent)\" opacity=\"\(Self.format(opacity))\" transform=\"rotate(\(Self.signedOffset(convergenceHash[(index + 9) % convergenceHash.count], magnitude: 24)) \(x) \(y))\"/>"
        }

        let hashRibs = (0..<(8 + refinementDepth)).map { index in
            let byte = convergenceHash[index % convergenceHash.count]
            let x = 150 + index * 70
            let y1 = 210 + Int(byte % 180)
            let y2 = 1370 - Int(convergenceHash[(index + 11) % convergenceHash.count] % 220)
            let bend = 600 + Self.signedOffset(sketchHash[(index + 17) % sketchHash.count], magnitude: 220)
            let opacity = 0.09 + Double(byte % 13) / 100

            return "  <path data-layer=\"hash-rib\" d=\"M\(x) \(y1) C\(bend) \(520 + index * 9) \(1200 - bend) \(980 - index * 5) \(1110 - index * 34) \(y2)\" fill=\"none\" stroke=\"\(line)\" stroke-width=\"2\" opacity=\"\(Self.format(opacity))\"/>"
        }

        let spine = (0..<memorySignature.count).map { index in
            let byte = memorySignature[index]
            let x = 600 + Self.signedOffset(byte, magnitude: 110)
            let y = 170 + index * 56
            let nextX = 600 + Self.signedOffset(memorySignature[(index + 1) % memorySignature.count], magnitude: 110)
            let nextY = 170 + ((index + 1) % memorySignature.count) * 56

            return "  <path data-layer=\"memory-spine\" d=\"M\(x) \(y) L\(nextX) \(nextY)\" fill=\"none\" stroke=\"\(line)\" stroke-width=\"1\" opacity=\"0.18\"/>"
        }

        return (hashRibs + byteMarks + spine).joined(separator: "\n")
    }

    private func abstractColorField(
        hash: [UInt8],
        wash: String,
        accent: String,
        refinementDepth: Int
    ) -> String {
        (0..<(5 + refinementDepth)).map { index in
            let base = index * 5
            let x = 140 + (index * 137 + Int(hash[base % hash.count])) % 920
            let y = 120 + (index * 211 + Int(hash[(base + 1) % hash.count])) % 1240
            let radiusX = 150 + Int(hash[(base + 2) % hash.count] % 220)
            let radiusY = 110 + Int(hash[(base + 3) % hash.count]) % 260
            let color = index.isMultiple(of: 3) ? accent : wash
            let opacity = 0.10 + Double(hash[(base + 4) % hash.count] % 18) / 100

            return "  <ellipse data-layer=\"color-field\" cx=\"\(x)\" cy=\"\(y)\" rx=\"\(radiusX)\" ry=\"\(radiusY)\" fill=\"\(color)\" opacity=\"\(Self.format(opacity))\" transform=\"rotate(\(Self.signedOffset(hash[(base + 6) % hash.count], magnitude: 42)) \(x) \(y))\"/>"
        }.joined(separator: "\n")
    }

    private func abstractGestures(
        hash: [UInt8],
        line: String,
        accent: String,
        refinementDepth: Int
    ) -> String {
        (0..<(6 + refinementDepth * 2)).map { index in
            let base = index * 4
            let x1 = 140 + Int(hash[base % hash.count]) * 3 % 930
            let y1 = 210 + (index * 83 + Int(hash[(base + 1) % hash.count])) % 1040
            let x2 = 160 + (index * 157 + Int(hash[(base + 2) % hash.count])) % 900
            let y2 = 260 + (index * 109 + Int(hash[(base + 3) % hash.count])) % 1020
            let c1 = 600 + Self.signedOffset(hash[(base + 5) % hash.count], magnitude: 360)
            let c2 = 780 + Self.signedOffset(hash[(base + 7) % hash.count], magnitude: 420)
            let stroke = index.isMultiple(of: 4) ? accent : line
            let width = index.isMultiple(of: 5) ? 9 : 2 + index % 5
            let opacity = 0.16 + Double(hash[(base + 9) % hash.count] % 18) / 100

            return "  <path data-layer=\"gesture\" d=\"M\(x1) \(y1) C\(c1) \(y1 - 180) \(c2) \(y2 + 160) \(x2) \(y2)\" fill=\"none\" stroke=\"\(stroke)\" stroke-width=\"\(width)\" stroke-linecap=\"round\" opacity=\"\(Self.format(opacity))\"/>"
        }.joined(separator: "\n")
    }

    private func foldGlyph(
        permutation: Permutation,
        hash: [UInt8],
        line: String,
        accent: String,
        refinementDepth: Int,
        parameters: PortraitParameters
    ) -> String {
        let scale = 76 + refinementDepth * 5
        let originX = 600 - scale * 2
        let originY = 760 - scale * 2
        let cells = permutation.values.enumerated().map { index, value in
            let row = index / 4
            let column = index % 4
            let x = originX + column * scale + Self.signedOffset(hash[index], magnitude: 18)
            let y = originY + row * scale + Self.signedOffset(hash[(index + 4) % hash.count], magnitude: 18)
            let size = scale / 2 + Int(value % 5) * 7
            let opacity = 0.18 + Double(hash[(index + 8) % hash.count] % 22) / 100
            let fill = (index + Int(value)).isMultiple(of: 3) ? accent : "none"

            return "  <rect data-layer=\"fold-glyph\" x=\"\(x)\" y=\"\(y)\" width=\"\(size)\" height=\"\(size)\" fill=\"\(fill)\" stroke=\"\(line)\" stroke-width=\"\(2 + index % 4)\" opacity=\"\(Self.format(opacity))\" transform=\"rotate(\(Self.signedOffset(hash[(index + 12) % hash.count], magnitude: 28)) \(x + size / 2) \(y + size / 2))\"/>"
        }

        let arcs = (0..<(refinementDepth + 3)).map { index in
            let radius = 145 + index * 22
            let x = 600 + Self.signedOffset(hash[(index + 18) % hash.count], magnitude: 42)
            let y = 800 + Self.signedOffset(hash[(index + 22) % hash.count], magnitude: 64)
            let opacity = 0.10 + Double(index) / 100

            return "  <ellipse data-layer=\"fold-aura\" cx=\"\(x)\" cy=\"\(y)\" rx=\"\(radius)\" ry=\"\(Int(Double(radius) * parameters.faceHeight / parameters.faceWidth))\" fill=\"none\" stroke=\"\(line)\" stroke-width=\"2\" opacity=\"\(Self.format(opacity))\" transform=\"rotate(\(Self.signedOffset(hash[(index + 25) % hash.count], magnitude: 36)) \(x) \(y))\"/>"
        }

        return (arcs + cells).joined(separator: "\n")
    }

    private func foldNotationMarks(
        permutation: Permutation,
        hash: [UInt8],
        line: String,
        refinementDepth: Int
    ) -> String {
        let marks = permutation.values.enumerated().map { index, value in
            let side = index.isMultiple(of: 2) ? 90 : 1030
            let x = side + Self.signedOffset(hash[(index + 3) % hash.count], magnitude: 38)
            let y = 150 + index * 74 + Self.signedOffset(hash[(index + 7) % hash.count], magnitude: 26)
            let length = 26 + Int(value % 9) * 7

            return "  <path data-layer=\"fold-notation\" d=\"M\(x) \(y) l\(length) \(Self.signedOffset(hash[(index + 11) % hash.count], magnitude: 16))\" fill=\"none\" stroke=\"\(line)\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\"0.44\"/>"
        }

        let dust = (0..<(refinementDepth * 5)).map { index in
            let x = 120 + (index * 97 + Int(hash[index % hash.count])) % 960
            let y = 120 + (index * 131 + Int(hash[(index + 5) % hash.count])) % 1280
            let radius = 1 + index % 3
            let opacity = 0.10 + Double(hash[(index + 9) % hash.count] % 16) / 100

            return "  <circle data-layer=\"field-dust\" cx=\"\(x)\" cy=\"\(y)\" r=\"\(radius)\" fill=\"\(line)\" opacity=\"\(Self.format(opacity))\"/>"
        }

        return (marks + dust).joined(separator: "\n")
    }

    private func fineDrawing(
        hash: [UInt8],
        line: String,
        refinementDepth: Int
    ) -> String {
        (0..<(refinementDepth * 10)).map { index in
            let base = index * 3
            let x = 300 + (index * 43 + Int(hash[base % hash.count])) % 600
            let y = 350 + (index * 59 + Int(hash[(base + 1) % hash.count])) % 800
            let length = 12 + Int(hash[(base + 2) % hash.count] % 44)
            let bend = Self.signedOffset(hash[(base + 6) % hash.count], magnitude: 18)
            let opacity = 0.08 + Double(hash[(base + 8) % hash.count] % 14) / 100

            return "  <path data-layer=\"fine-drawing\" d=\"M\(x) \(y) q\(length / 2) \(bend) \(length) \(Self.signedOffset(hash[(base + 10) % hash.count], magnitude: 12))\" fill=\"none\" stroke=\"\(line)\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"\(Self.format(opacity))\"/>"
        }.joined(separator: "\n")
    }

    private func parameterReport(_ parameters: PortraitParameters) -> String {
        parameters.reportLines.enumerated().map { index, line in
            let y = 1510 + index * 16
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

    private static func sketchVariationHash(
        convergenceHash: [UInt8],
        seed: String,
        iteration: Int?
    ) -> [UInt8] {
        guard let iteration else {
            return convergenceHash
        }

        let salt = Array("\(seed)#sketch#\(iteration)".utf8)
        let iterationMagnitude = iteration.magnitude
        let rotation = Int(iterationMagnitude % UInt(convergenceHash.count))
        let iterationCycle = Int(iterationMagnitude % 251)

        return convergenceHash.indices.map { index in
            let saltByte = salt[index % salt.count]
            let iterationByte = UInt8((iterationCycle * (index + 17)) % 251)
            let rotated = convergenceHash[(index + rotation) % convergenceHash.count]

            return convergenceHash[index] ^ (rotated &+ saltByte &+ iterationByte)
        }
    }

    private static func refinementDepth(for iteration: Int?) -> Int {
        guard let iteration else {
            return 1
        }

        return min(18, max(1, iteration))
    }

    private static func signedOffset(_ byte: UInt8, magnitude: Int) -> Int {
        Int((Double(byte) / 255 * Double(magnitude * 2)).rounded()) - magnitude
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
