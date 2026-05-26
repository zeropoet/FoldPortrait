import FoldKernel
import Foundation

public struct PortraitRenderResult: Equatable, Sendable {
    public let svg: String
    public let artworkNotes: String
    public let convergenceHashHex: String
    public let renderHashHex: String
    public let memorySignatureHex: String
    public let parameters: PortraitParameters
    public let growth: PortraitGrowth
    public let iteration: Int?
    public let revision: Int
    public let refinementDepth: Int
}

public struct PortraitRenderer: Sendable {
    public init() {}

    public func render(
        seed: String,
        iteration: Int? = nil,
        revision requestedRevision: Int = 1,
        refinementDepth requestedRefinementDepth: Int? = nil
    ) -> PortraitRenderResult {
        let revision = max(1, requestedRevision)
        let refinementDepth = Self.refinementDepth(for: requestedRefinementDepth ?? iteration)
        let permutation = permutationFromSeed(seed)
        let events = events(for: permutation, seed: seed)
        let memorySignature = MemoryEncoder().encode(events)
        let convergenceHash = HashEngine().convergenceHash(memorySignature: memorySignature)
        let sketchHash = Self.sketchVariationHash(
            convergenceHash: convergenceHash,
            seed: seed,
            iteration: refinementDepth,
            revision: revision
        )
        let parameters = PortraitParameters(
            hash: convergenceHash,
            memorySignature: memorySignature,
            permutation: permutation
        )
        let growth = PortraitGrowth(
            convergenceHash: convergenceHash,
            sketchHash: sketchHash,
            refinementDepth: refinementDepth
        )
        let svg = svgDocument(
            permutation: permutation,
            memorySignature: memorySignature,
            convergenceHash: convergenceHash,
            sketchHash: sketchHash,
            seed: seed,
            iteration: iteration,
            revision: revision,
            refinementDepth: refinementDepth,
            parameters: parameters,
            growth: growth
        )
        let convergenceHashHex = Self.hex(convergenceHash)
        let renderHashHex = Self.hex(sketchHash)
        let memorySignatureHex = Self.hex(memorySignature)
        let artworkNotes = ArtworkNotesBuilder().notes(
            seed: seed,
            iteration: iteration,
            revision: revision,
            refinementDepth: refinementDepth,
            convergenceHashHex: convergenceHashHex,
            renderHashHex: renderHashHex,
            memorySignatureHex: memorySignatureHex,
            parameters: parameters,
            growth: growth
        )

        return PortraitRenderResult(
            svg: svg,
            artworkNotes: artworkNotes,
            convergenceHashHex: convergenceHashHex,
            renderHashHex: renderHashHex,
            memorySignatureHex: memorySignatureHex,
            parameters: parameters,
            growth: growth,
            iteration: iteration,
            revision: revision,
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
        revision: Int,
        refinementDepth: Int,
        parameters: PortraitParameters,
        growth: PortraitGrowth
    ) -> String {
        let width = 1200
        let height = 1600
        let escapedSeed = Self.escape(seed)
        let iterationLabel = Self.versionLabel(iteration: iteration, revision: revision, padded: false)
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
            refinementDepth: refinementDepth,
            growth: growth
        )
        let field = abstractColorField(
            hash: sketchHash,
            wash: wash,
            accent: accent,
            refinementDepth: refinementDepth,
            growth: growth
        )
        let gestures = abstractGestures(
            hash: sketchHash,
            line: line,
            accent: secondAccent,
            refinementDepth: refinementDepth,
            growth: growth
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
            refinementDepth: refinementDepth,
            growth: growth
        )
        let growthRings = growthRings(
            hash: sketchHash,
            line: line,
            accent: accent,
            refinementDepth: refinementDepth,
            growth: growth
        )
        let materialWeathering = materialWeathering(
            hash: sketchHash,
            line: line,
            accent: secondAccent,
            refinementDepth: refinementDepth,
            growth: growth
        )
        let lineageLeap = lineageLeap(
            hash: sketchHash,
            line: line,
            accent: accent,
            secondAccent: secondAccent,
            revision: revision,
            refinementDepth: refinementDepth,
            growth: growth
        )
        let revisionShiftX = revision > 1 ? Self.signedOffset(sketchHash[24], magnitude: 58) + (revision - 1) * 18 : 0
        let revisionShiftY = revision > 1 ? Self.signedOffset(sketchHash[25], magnitude: 44) - (revision - 1) * 12 : 0
        let revisionRotation = parameters.headTilt +
            Double(Self.signedOffset(sketchHash[19], magnitude: 6)) +
            (revision > 1 ? Double(Self.signedOffset(sketchHash[26], magnitude: 9) + (revision - 1) * 4) : 0)
        let report = parameterReport(parameters)

        return """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \(width) \(height)" role="img" aria-labelledby="title desc" data-portrait-version="\(iterationLabel)" data-refinement-depth="\(refinementDepth)" data-revision="\(revision)" data-art-mode="structural-abstract" data-growth-age="\(growth.age)" data-growth-season="\(growth.season)" data-active-force="\(growth.activeForce)" data-material-state="\(growth.materialState)" data-convergence-hash="\(Self.hex(convergenceHash))" data-render-hash="\(Self.hex(sketchHash))" data-memory-signature="\(Self.hex(memorySignature))" data-permutation="\(permutation.values.map(String.init).joined(separator: "-"))">
          <title id="title">Abstract Fold portrait \(iterationLabel) for \(escapedSeed)</title>
          <desc id="desc">A deterministic structural portrait generated from a FoldKernel memory signature, permutation, and convergence hash, with iteration-specific drawing refinement.</desc>
          <metadata>\(Self.escape(growth.reportLines.joined(separator: " | ")))</metadata>
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
        \(growthRings)
        \(lineageLeap)
          <g transform="translate(\(revisionShiftX) \(revisionShiftY)) rotate(\(Self.format(revisionRotation)) 600 800)">
        \(gestures)
        \(glyph)
        \(fineDrawing)
          </g>
        \(notations)
        \(materialWeathering)
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
        refinementDepth: Int,
        growth: PortraitGrowth
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
            let y1 = 210 + Int(byte % 180) + Int(growth.compression * 34)
            let y2 = 1370 - Int(convergenceHash[(index + 11) % convergenceHash.count] % 220) - Int(growth.erosion * 28)
            let bend = 600 + Self.signedOffset(sketchHash[(index + 17) % sketchHash.count], magnitude: 220) + Int(growth.torsion * 96) - 48
            let opacity = 0.09 + Double(byte % 13) / 100 + growth.sediment * 0.03

            return "  <path data-layer=\"hash-rib\" d=\"M\(x) \(y1) C\(bend) \(520 + index * 9) \(1200 - bend) \(980 - index * 5) \(1110 - index * 34) \(y2)\" fill=\"none\" stroke=\"\(line)\" stroke-width=\"\(Self.format(1.4 + growth.compression * 1.7))\" opacity=\"\(Self.format(opacity))\"/>"
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
        refinementDepth: Int,
        growth: PortraitGrowth
    ) -> String {
        (0..<(5 + refinementDepth)).map { index in
            let base = index * 5
            let x = 140 + (index * 137 + Int(hash[base % hash.count])) % 920
            let y = 120 + (index * 211 + Int(hash[(base + 1) % hash.count])) % 1240
            let radiusX = 150 + Int(hash[(base + 2) % hash.count] % 220) + Int(growth.bloom * 46)
            let radiusY = 110 + Int(hash[(base + 3) % hash.count]) % 260 + Int(growth.compression * 34)
            let color = index.isMultiple(of: 3) ? accent : wash
            let opacity = 0.10 + Double(hash[(base + 4) % hash.count] % 18) / 100 + growth.bloom * 0.04

            return "  <ellipse data-layer=\"color-field\" cx=\"\(x)\" cy=\"\(y)\" rx=\"\(radiusX)\" ry=\"\(radiusY)\" fill=\"\(color)\" opacity=\"\(Self.format(opacity))\" transform=\"rotate(\(Self.signedOffset(hash[(base + 6) % hash.count], magnitude: 42)) \(x) \(y))\"/>"
        }.joined(separator: "\n")
    }

    private func abstractGestures(
        hash: [UInt8],
        line: String,
        accent: String,
        refinementDepth: Int,
        growth: PortraitGrowth
    ) -> String {
        (0..<(6 + refinementDepth * 2)).map { index in
            let base = index * 4
            let x1 = 140 + Int(hash[base % hash.count]) * 3 % 930
            let y1 = 210 + (index * 83 + Int(hash[(base + 1) % hash.count])) % 1040
            let x2 = 160 + (index * 157 + Int(hash[(base + 2) % hash.count])) % 900
            let y2 = 260 + (index * 109 + Int(hash[(base + 3) % hash.count])) % 1020
            let c1 = 600 + Self.signedOffset(hash[(base + 5) % hash.count], magnitude: 360) + Int(growth.shear * 120) - 60
            let c2 = 780 + Self.signedOffset(hash[(base + 7) % hash.count], magnitude: 420) - Int(growth.torsion * 140) + 70
            let stroke = index.isMultiple(of: 4) ? accent : line
            let width = index.isMultiple(of: 5) ? 9 + Int(growth.compression * 3) : 2 + index % 5
            let opacity = 0.16 + Double(hash[(base + 9) % hash.count] % 18) / 100 + growth.fiberMemory * 0.02

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
        refinementDepth: Int,
        growth: PortraitGrowth
    ) -> String {
        (0..<(refinementDepth * 10)).map { index in
            let base = index * 3
            let x = 300 + (index * 43 + Int(hash[base % hash.count])) % 600
            let y = 350 + (index * 59 + Int(hash[(base + 1) % hash.count])) % 800
            let length = 12 + Int(hash[(base + 2) % hash.count] % 44)
            let bend = Self.signedOffset(hash[(base + 6) % hash.count], magnitude: 18) + Int(growth.torsion * 18) - 9
            let opacity = 0.08 + Double(hash[(base + 8) % hash.count] % 14) / 100 + growth.erosion * 0.02

            return "  <path data-layer=\"fine-drawing\" d=\"M\(x) \(y) q\(length / 2) \(bend) \(length) \(Self.signedOffset(hash[(base + 10) % hash.count], magnitude: 12))\" fill=\"none\" stroke=\"\(line)\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"\(Self.format(opacity))\"/>"
        }.joined(separator: "\n")
    }

    private func growthRings(
        hash: [UInt8],
        line: String,
        accent: String,
        refinementDepth: Int,
        growth: PortraitGrowth
    ) -> String {
        let count = 3 + growth.season + refinementDepth / 3
        return (0..<count).map { index in
            let base = index * 7
            let x = 600 + Self.signedOffset(hash[base % hash.count], magnitude: 90)
            let y = 790 + Self.signedOffset(hash[(base + 2) % hash.count], magnitude: 130)
            let rx = 210 + index * 31 + Int(growth.bloom * 90)
            let ry = 120 + index * 23 + Int(growth.compression * 80)
            let twist = Self.signedOffset(hash[(base + 4) % hash.count], magnitude: 34) + Int(growth.torsion * 44)
            let stroke = index.isMultiple(of: 2) ? accent : line
            let opacity = 0.05 + growth.fiberMemory * 0.08 + Double(hash[(base + 5) % hash.count] % 7) / 100

            return "  <ellipse data-layer=\"growth-ring\" cx=\"\(x)\" cy=\"\(y)\" rx=\"\(rx)\" ry=\"\(ry)\" fill=\"none\" stroke=\"\(stroke)\" stroke-width=\"\(Self.format(0.8 + growth.sediment * 2.2))\" opacity=\"\(Self.format(opacity))\" transform=\"rotate(\(twist) \(x) \(y))\"/>"
        }.joined(separator: "\n")
    }

    private func materialWeathering(
        hash: [UInt8],
        line: String,
        accent: String,
        refinementDepth: Int,
        growth: PortraitGrowth
    ) -> String {
        let count = refinementDepth * 4 + Int(growth.erosion * 18)
        return (0..<count).map { index in
            let base = index * 5
            let x = 95 + (index * 71 + Int(hash[base % hash.count])) % 1010
            let y = 120 + (index * 103 + Int(hash[(base + 1) % hash.count])) % 1320
            let length = 20 + Int(hash[(base + 2) % hash.count] % 90) + Int(growth.shear * 34)
            let slope = Self.signedOffset(hash[(base + 3) % hash.count], magnitude: 26) + Int(growth.torsion * 20) - 10
            let opacity = 0.05 + growth.erosion * 0.09 + Double(hash[(base + 4) % hash.count] % 8) / 100
            let stroke = index.isMultiple(of: 4) ? accent : line

            return "  <path data-layer=\"material-weathering\" d=\"M\(x) \(y) l\(length) \(slope)\" fill=\"none\" stroke=\"\(stroke)\" stroke-width=\"\(Self.format(0.6 + growth.sediment * 1.8))\" stroke-linecap=\"round\" opacity=\"\(Self.format(opacity))\"/>"
        }.joined(separator: "\n")
    }

    private func lineageLeap(
        hash: [UInt8],
        line: String,
        accent: String,
        secondAccent: String,
        revision: Int,
        refinementDepth: Int,
        growth: PortraitGrowth
    ) -> String {
        guard revision > 1 else {
            return ""
        }

        let revisionIndex = revision - 1
        let axis = Self.signedOffset(hash[2], magnitude: 22) + revisionIndex * 7
        let bandWidth = 128 + revisionIndex * 24 + Int(growth.bloom * 70)
        let bandOffset = Self.signedOffset(hash[9], magnitude: 160)
        let bandOpacity = Self.format(0.24 + min(0.22, Double(revisionIndex) * 0.05))
        let band = "  <path data-layer=\"lineage-leap\" d=\"M\(90 + bandOffset) -80 L\(90 + bandOffset + bandWidth) -80 L\(1120 - bandOffset) 1680 L\(1120 - bandOffset - bandWidth) 1680 Z\" fill=\"\(accent)\" opacity=\"\(bandOpacity)\" transform=\"rotate(\(axis) 600 800)\"/>"

        let breaches = (0..<(4 + min(6, revisionIndex * 2))).map { index in
            let base = index * 5 + revisionIndex
            let y = 260 + index * (920 / max(1, 3 + revisionIndex)) + Self.signedOffset(hash[(base + 7) % hash.count], magnitude: 48)
            let x1 = 140 + Self.signedOffset(hash[base % hash.count], magnitude: 74)
            let x2 = 1060 + Self.signedOffset(hash[(base + 4) % hash.count], magnitude: 74)
            let c1 = 350 + Self.signedOffset(hash[(base + 11) % hash.count], magnitude: 190)
            let c2 = 850 + Self.signedOffset(hash[(base + 17) % hash.count], magnitude: 190)
            let stroke = index.isMultiple(of: 2) ? secondAccent : line
            let width = 14 + revisionIndex * 4 + Int(growth.compression * 8)
            let opacity = 0.26 + Double(hash[(base + 23) % hash.count] % 16) / 100

            return "  <path data-layer=\"lineage-leap\" d=\"M\(x1) \(y) C\(c1) \(y - 220) \(c2) \(y + 220) \(x2) \(y + Self.signedOffset(hash[(base + 29) % hash.count], magnitude: 80))\" fill=\"none\" stroke=\"\(stroke)\" stroke-width=\"\(width)\" stroke-linecap=\"round\" opacity=\"\(Self.format(opacity))\"/>"
        }

        let witnesses = (0..<12).map { index in
            let sideX = index.isMultiple(of: 2) ? 76 : 1124
            let y = 128 + index * 116 + Self.signedOffset(hash[(index + revisionIndex * 3) % hash.count], magnitude: 28)
            let radius = 10 + revisionIndex * 2 + Int(hash[(index + 13) % hash.count] % 10)
            let opacity = 0.22 + Double(index % 4) * 0.04

            return "  <circle data-layer=\"lineage-leap\" cx=\"\(sideX)\" cy=\"\(y)\" r=\"\(radius)\" fill=\"\(secondAccent)\" opacity=\"\(Self.format(opacity))\"/>"
        }

        let aperture = 180 + refinementDepth * 7 + revisionIndex * 30
        let apertureMark = "  <ellipse data-layer=\"lineage-leap\" cx=\"600\" cy=\"800\" rx=\"\(aperture)\" ry=\"\(max(90, aperture / 2))\" fill=\"none\" stroke=\"\(accent)\" stroke-width=\"\(16 + revisionIndex * 3)\" opacity=\"0.48\" transform=\"rotate(\(axis + 90) 600 800)\"/>"

        return ([band, apertureMark] + breaches + witnesses).joined(separator: "\n")
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
        iteration: Int?,
        revision: Int = 1
    ) -> [UInt8] {
        guard let iteration else {
            return convergenceHash
        }

        let saltText: String
        if revision <= 1 {
            saltText = "\(seed)#sketch#\(iteration)"
        } else {
            saltText = "\(seed)#sketch#\(iteration).\(revision)"
        }
        let salt = Array(saltText.utf8)
        let iterationMagnitude = iteration.magnitude
        let revisionMagnitude = max(1, revision).magnitude
        let rotation = Int((iterationMagnitude + revisionMagnitude - 1) % UInt(convergenceHash.count))
        let iterationCycle = Int((iterationMagnitude + (revisionMagnitude - 1) * 37) % 251)

        return convergenceHash.indices.map { index in
            let saltByte = salt[index % salt.count]
            let iterationByte = UInt8((iterationCycle * (index + 17)) % 251)
            let rotated = convergenceHash[(index + rotation) % convergenceHash.count]

            return convergenceHash[index] ^ (rotated &+ saltByte &+ iterationByte)
        }
    }

    private static func versionLabel(iteration: Int?, revision: Int, padded: Bool) -> String {
        guard let iteration else {
            return "base"
        }

        if revision <= 1 {
            return "v\(iteration)"
        }

        let anchor = padded ? String(format: "%04d", iteration) : "\(iteration)"
        return "v\(anchor).\(revision)"
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
