import FoldKernel
import Foundation

public struct PortraitSystemWitness: Codable, Equatable, Sendable {
    public let schema: String
    public let systemID: String
    public let observedAt: String
    public let sources: [PortraitWitnessSource]
    public let boundaries: [String]

    public init(
        schema: String = "foldportrait-system-witness/v1",
        systemID: String,
        observedAt: String,
        sources: [PortraitWitnessSource],
        boundaries: [String]
    ) {
        self.schema = schema
        self.systemID = systemID
        self.observedAt = observedAt
        self.sources = sources
        self.boundaries = boundaries
    }

    public func validated() throws -> PortraitSystemWitness {
        guard schema == "foldportrait-system-witness/v1" else {
            throw SystemReflectionError.invalidWitness("unsupported witness schema")
        }
        guard !systemID.isEmpty, !observedAt.isEmpty, !sources.isEmpty else {
            throw SystemReflectionError.invalidWitness("system identity, observation time, and sources are required")
        }
        guard Set(sources.map(\.id)).count == sources.count else {
            throw SystemReflectionError.invalidWitness("source identities must be unique")
        }
        guard boundaries.contains("aggregate-public-measurements-only") else {
            throw SystemReflectionError.invalidWitness("the aggregate public measurement boundary is required")
        }

        for source in sources {
            guard !source.id.isEmpty, !source.revision.isEmpty, !source.measurements.isEmpty else {
                throw SystemReflectionError.invalidWitness("every source requires identity, revision, and measurements")
            }
            guard Set(source.measurements.map(\.id)).count == source.measurements.count else {
                throw SystemReflectionError.invalidWitness("measurement identities must be unique within \(source.id)")
            }
            for measurement in source.measurements {
                guard !measurement.id.isEmpty, !measurement.unit.isEmpty, measurement.value.isFinite, measurement.value >= 0 else {
                    throw SystemReflectionError.invalidWitness("measurements must be named, finite, non-negative, and unit-bearing")
                }
            }
        }
        return self
    }

    public var digest: String {
        Self.hex(Keccak256().hash(Array(canonicalData)))
    }

    public var flattenedMeasurements: [ReflectedMeasurement] {
        sources.flatMap { source in
            source.measurements.map { measurement in
                ReflectedMeasurement(
                    id: "\(source.id).\(measurement.id)",
                    sourceID: source.id,
                    label: measurement.label,
                    unit: measurement.unit,
                    value: measurement.value
                )
            }
        }.sorted { $0.id < $1.id }
    }

    private var canonicalData: Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return (try? encoder.encode(self)) ?? Data()
    }

    fileprivate static func hex<S: Sequence>(_ bytes: S) -> String where S.Element == UInt8 {
        bytes.map { String(format: "%02x", $0) }.joined()
    }
}

public struct PortraitWitnessSource: Codable, Equatable, Sendable {
    public let id: String
    public let revision: String
    public let role: String
    public let measurements: [PortraitWitnessMeasurement]

    public init(id: String, revision: String, role: String, measurements: [PortraitWitnessMeasurement]) {
        self.id = id
        self.revision = revision
        self.role = role
        self.measurements = measurements
    }
}

public struct PortraitWitnessMeasurement: Codable, Equatable, Sendable {
    public let id: String
    public let label: String
    public let unit: String
    public let value: Double

    public init(id: String, label: String, unit: String, value: Double) {
        self.id = id
        self.label = label
        self.unit = unit
        self.value = value
    }
}

public struct ReflectedMeasurement: Codable, Equatable, Sendable {
    public let id: String
    public let sourceID: String
    public let label: String
    public let unit: String
    public let value: Double
}

public struct VisualCorrelation: Codable, Equatable, Sendable {
    public let left: String
    public let right: String
    public let method: String
    public let sampleCount: Int
    public let strength: Double
    public let direction: String
    public let visualRule: String
    public let interpretation: String
}

public struct ReflectionCycle: Codable, Equatable, Sendable {
    public let schema: String
    public let cycleID: String
    public let sequence: Int
    public let witnessedAt: String
    public let witnessDigest: String
    public let foldKernelIdentity: String
    public let renderHash: String
    public let previousCycleID: String?
    public let measurements: [ReflectedMeasurement]
    public let correlations: [VisualCorrelation]
    public let chosenRules: [String]
    public let artifact: String
    public let notes: String
    public let boundary: String
}

public struct ReflectionRenderResult: Equatable, Sendable {
    public let cycle: ReflectionCycle
    public let svg: String
    public let notes: String
}

public struct SystemReflectionEngine: Sendable {
    public static let visualVocabulary = [
        "strata",
        "braid",
        "aperture",
        "palimpsest",
        "sediment",
        "counterfield",
        "veil",
    ]

    public init() {}

    public func reflect(
        witness rawWitness: PortraitSystemWitness,
        priorCycles: [ReflectionCycle] = []
    ) throws -> ReflectionRenderResult {
        let witness = try rawWitness.validated()
        let prior = priorCycles.sorted { $0.sequence < $1.sequence }
        let sequence = (prior.last?.sequence ?? 0) + 1
        let cycleID = String(format: "FP-REFLECT-%04d", sequence)
        let measurements = witness.flattenedMeasurements
        let correlations = selectCorrelations(
            measurements: measurements,
            priorCycles: prior,
            witnessDigest: witness.digest
        )
        let selectedRules = correlations.map(\.visualRule).reduce(into: [String]()) { rules, rule in
            if !rules.contains(rule) { rules.append(rule) }
        }

        let base = PortraitRenderer().render(
            seed: "FoldKernel-1.0.0|FoldPortrait|system",
            iteration: sequence,
            revision: 1,
            refinementDepth: min(18, 12 + sequence)
        )
        let renderHash = reflectionHash(
            baseHash: base.renderHashHex,
            witnessDigest: witness.digest,
            correlations: correlations,
            priorCycleID: prior.last?.cycleID
        )
        let artifact = "Output/reflections/foldportrait-reflection-\(String(format: "%04d", sequence)).svg"
        let notesPath = "Output/reflections/foldportrait-reflection-\(String(format: "%04d", sequence)).notes.md"
        let notes = reflectionNotes(
            cycleID: cycleID,
            witness: witness,
            base: base,
            correlations: correlations,
            priorCycleID: prior.last?.cycleID
        )
        let svg = reflectionSVG(
            base: base,
            cycleID: cycleID,
            sequence: sequence,
            renderHash: renderHash,
            witnessDigest: witness.digest,
            correlations: correlations,
            priorCycleCount: prior.count
        )
        let cycle = ReflectionCycle(
            schema: "foldportrait-reflection-cycle/v1",
            cycleID: cycleID,
            sequence: sequence,
            witnessedAt: witness.observedAt,
            witnessDigest: witness.digest,
            foldKernelIdentity: base.convergenceHashHex,
            renderHash: renderHash,
            previousCycleID: prior.last?.cycleID,
            measurements: measurements,
            correlations: correlations,
            chosenRules: selectedRules,
            artifact: artifact,
            notes: notesPath,
            boundary: "Exploratory visual relation is not causation, authority, personhood, or a claim about private human behavior."
        )
        return ReflectionRenderResult(cycle: cycle, svg: svg, notes: notes)
    }

    private func selectCorrelations(
        measurements: [ReflectedMeasurement],
        priorCycles: [ReflectionCycle],
        witnessDigest: String
    ) -> [VisualCorrelation] {
        struct Candidate {
            let left: ReflectedMeasurement
            let right: ReflectedMeasurement
            let method: String
            let sampleCount: Int
            let strength: Double
            let direction: String
            let tieBreak: UInt64
        }

        var candidates: [Candidate] = []
        for leftIndex in measurements.indices {
            for rightIndex in measurements.indices where rightIndex > leftIndex {
                let left = measurements[leftIndex]
                let right = measurements[rightIndex]
                guard left.sourceID != right.sourceID else { continue }

                let history = priorCycles + [currentCycleShell(measurements)]
                let pairs = history.compactMap { cycle -> (Double, Double)? in
                    guard
                        let leftValue = cycle.measurements.first(where: { $0.id == left.id })?.value,
                        let rightValue = cycle.measurements.first(where: { $0.id == right.id })?.value
                    else { return nil }
                    return (leftValue, rightValue)
                }
                let statistical = pairs.count >= 3 ? pearson(pairs) : nil
                let method = statistical == nil ? "structural-resonance" : "pearson"
                let strength = statistical.map(abs) ?? resonance(left.value, right.value)
                let direction: String
                if let statistical {
                    direction = statistical < 0 ? "inverse" : "parallel"
                } else {
                    direction = stableBit("\(left.id)|\(right.id)|\(witnessDigest)") ? "counterposed" : "convergent"
                }
                candidates.append(Candidate(
                    left: left,
                    right: right,
                    method: method,
                    sampleCount: pairs.count,
                    strength: strength,
                    direction: direction,
                    tieBreak: stableUInt64("\(witnessDigest)|\(left.id)|\(right.id)")
                ))
            }
        }

        candidates.sort {
            if abs($0.strength - $1.strength) > 0.000_001 { return $0.strength > $1.strength }
            return $0.tieBreak < $1.tieBreak
        }

        var sourcePairUse: [String: Int] = [:]
        var selected: [Candidate] = []
        for candidate in candidates {
            let pair = [candidate.left.sourceID, candidate.right.sourceID].sorted().joined(separator: "|")
            guard sourcePairUse[pair, default: 0] < 2 else { continue }
            selected.append(candidate)
            sourcePairUse[pair, default: 0] += 1
            if selected.count == min(7, max(4, Set(measurements.map(\.sourceID)).count + 1)) { break }
        }

        return selected.enumerated().map { index, candidate in
            let vocabularyIndex = Int((candidate.tieBreak + UInt64(index)) % UInt64(Self.visualVocabulary.count))
            let rule = Self.visualVocabulary[vocabularyIndex]
            let epistemic = candidate.method == "pearson"
                ? "Observed across \(candidate.sampleCount) preserved system states; noncausal."
                : "Chosen from one or two states as compositional resonance, not statistical correlation."
            return VisualCorrelation(
                left: candidate.left.id,
                right: candidate.right.id,
                method: candidate.method,
                sampleCount: candidate.sampleCount,
                strength: rounded(candidate.strength),
                direction: candidate.direction,
                visualRule: rule,
                interpretation: epistemic
            )
        }
    }

    private func currentCycleShell(_ measurements: [ReflectedMeasurement]) -> ReflectionCycle {
        ReflectionCycle(
            schema: "temporary",
            cycleID: "current",
            sequence: 0,
            witnessedAt: "",
            witnessDigest: "",
            foldKernelIdentity: "",
            renderHash: "",
            previousCycleID: nil,
            measurements: measurements,
            correlations: [],
            chosenRules: [],
            artifact: "",
            notes: "",
            boundary: ""
        )
    }

    private func pearson(_ pairs: [(Double, Double)]) -> Double? {
        let count = Double(pairs.count)
        let leftMean = pairs.reduce(0) { $0 + $1.0 } / count
        let rightMean = pairs.reduce(0) { $0 + $1.1 } / count
        let numerator = pairs.reduce(0) { $0 + ($1.0 - leftMean) * ($1.1 - rightMean) }
        let leftVariance = pairs.reduce(0) { $0 + pow($1.0 - leftMean, 2) }
        let rightVariance = pairs.reduce(0) { $0 + pow($1.1 - rightMean, 2) }
        let denominator = sqrt(leftVariance * rightVariance)
        guard denominator > 0 else { return nil }
        return max(-1, min(1, numerator / denominator))
    }

    private func resonance(_ left: Double, _ right: Double) -> Double {
        let leftScale = log1p(left)
        let rightScale = log1p(right)
        let scale = max(1, max(leftScale, rightScale))
        return max(0, min(1, 1 - abs(leftScale - rightScale) / scale))
    }

    private func reflectionHash(
        baseHash: String,
        witnessDigest: String,
        correlations: [VisualCorrelation],
        priorCycleID: String?
    ) -> String {
        let relation = correlations.map { "\($0.left)|\($0.right)|\($0.visualRule)|\($0.strength)" }.joined(separator: ";")
        let bytes = Array("\(baseHash)|\(witnessDigest)|\(priorCycleID ?? "origin")|\(relation)".utf8)
        return PortraitSystemWitness.hex(Keccak256().hash(bytes))
    }

    private func reflectionSVG(
        base: PortraitRenderResult,
        cycleID: String,
        sequence: Int,
        renderHash: String,
        witnessDigest: String,
        correlations: [VisualCorrelation],
        priorCycleCount: Int
    ) -> String {
        let palette = ["#17202a", "#8d3f4f", "#48605d", "#c38b59", "#6a6179", "#b7a98f", "#34515c"]
        let echoes = (0..<priorCycleCount).map { index in
            let inset = 78 + index * 19
            let opacity = min(0.18, 0.025 + Double(index) * 0.012)
            return "  <rect data-layer=\"reflection-palimpsest\" x=\"\(inset)\" y=\"\(inset + 96)\" width=\"\(1200 - inset * 2)\" height=\"\(1408 - inset * 2)\" rx=\"\(36 + index * 3)\" fill=\"none\" stroke=\"#17202a\" stroke-width=\"1.2\" opacity=\"\(format(opacity))\"/>"
        }.joined(separator: "\n")

        let layers = correlations.enumerated().map { index, correlation in
            let digest = stableUInt64("\(correlation.left)|\(correlation.right)|\(renderHash)")
            let x = 130 + Int(digest % 900)
            let y = 170 + Int((digest >> 11) % 1240)
            let span = 120 + Int((digest >> 23) % 420)
            let rise = Int((digest >> 37) % 360) - 180
            let color = palette[index % palette.count]
            let opacity = 0.16 + correlation.strength * 0.34
            let width = 2.0 + correlation.strength * 12
            let common = "data-layer=\"system-reflection\" data-rule=\"\(correlation.visualRule)\" data-left=\"\(correlation.left)\" data-right=\"\(correlation.right)\""

            switch correlation.visualRule {
            case "strata":
                return "  <path \(common) d=\"M40 \(y) C360 \(y - rise) 840 \(y + rise) 1160 \(y)\" fill=\"none\" stroke=\"\(color)\" stroke-width=\"\(format(width * 3.2))\" opacity=\"\(format(opacity * 0.72))\"/>"
            case "braid":
                return "  <path \(common) d=\"M\(x - span) 100 C\(x + span) 480 \(x - span) 1120 \(x + span) 1500\" fill=\"none\" stroke=\"\(color)\" stroke-width=\"\(format(width))\" opacity=\"\(format(opacity))\"/>"
            case "aperture":
                return "  <ellipse \(common) cx=\"\(x)\" cy=\"\(y)\" rx=\"\(span)\" ry=\"\(max(54, span / 3))\" fill=\"none\" stroke=\"\(color)\" stroke-width=\"\(format(width))\" opacity=\"\(format(opacity))\" transform=\"rotate(\(rise / 4) \(x) \(y))\"/>"
            case "palimpsest":
                return "  <path \(common) d=\"M90 \(y) Q\(x) \(y + rise) 1110 \(y - rise)\" fill=\"none\" stroke=\"\(color)\" stroke-width=\"\(format(width))\" stroke-dasharray=\"3 14\" opacity=\"\(format(opacity))\"/>"
            case "sediment":
                return (0..<9).map { mark in
                    let cx = (x + mark * max(18, span / 8)) % 1080 + 60
                    let cy = y + ((mark * 47 + rise) % 180) - 90
                    return "  <circle \(common) cx=\"\(cx)\" cy=\"\(cy)\" r=\"\(format(width + Double(mark % 3) * 2))\" fill=\"\(color)\" opacity=\"\(format(opacity * 0.76))\"/>"
                }.joined(separator: "\n")
            case "counterfield":
                return "  <rect \(common) x=\"\(max(30, x - span / 2))\" y=\"\(max(30, y - span / 2))\" width=\"\(span)\" height=\"\(span + abs(rise))\" fill=\"\(color)\" opacity=\"\(format(opacity * 0.28))\" transform=\"rotate(\(rise / 8) \(x) \(y))\"/>"
            default:
                return "  <path \(common) d=\"M0 \(y - span / 2) L1200 \(y + span / 2) L1200 \(y + span) L0 \(y) Z\" fill=\"\(color)\" opacity=\"\(format(opacity * 0.22))\"/>"
            }
        }.joined(separator: "\n")

        let reflectionGroup = """
        <g data-layer="autonomous-reflection" data-cycle="\(cycleID)" data-witness-digest="\(witnessDigest)">
        \(echoes)
        \(layers)
        </g>
        """
        return removingVisibleReport(from: base.svg)
            .replacingOccurrences(of: "data-art-mode=\"structural-abstract\"", with: "data-art-mode=\"autonomous-system-self-portrait\" data-reflection-cycle=\"\(cycleID)\" data-reflection-sequence=\"\(sequence)\" data-reflection-hash=\"\(renderHash)\"")
            .replacingOccurrences(of: "</svg>", with: "\(reflectionGroup)\n</svg>")
    }

    private func removingVisibleReport(from svg: String) -> String {
        let marker = "<g font-family=\"ui-monospace, SFMono-Regular, Menlo, monospace\""
        guard
            let start = svg.range(of: marker)?.lowerBound,
            let end = svg.range(of: "</g>", range: start..<svg.endIndex)?.upperBound
        else { return svg }
        var result = svg
        result.removeSubrange(start..<end)
        return result
    }

    private func reflectionNotes(
        cycleID: String,
        witness: PortraitSystemWitness,
        base: PortraitRenderResult,
        correlations: [VisualCorrelation],
        priorCycleID: String?
    ) -> String {
        let relations = correlations.map { correlation in
            "- `\(correlation.visualRule)`: `\(correlation.left)` ↔ `\(correlation.right)`; \(correlation.method), strength \(format(correlation.strength)), \(correlation.direction). \(correlation.interpretation)"
        }.joined(separator: "\n")
        return """
        # FoldPortrait Autonomous Reflection

        Cycle: \(cycleID)
        Witnessed system: \(witness.systemID)
        Witness digest: \(witness.digest)
        FoldKernel identity: \(base.convergenceHashHex)
        Previous reflection: \(priorCycleID ?? "origin")

        ## Chosen Visual Relations

        \(relations)

        ## Continuity

        The FoldKernel-derived identity remains stable. This cycle does not alter any work in the completed first-era archive. Prior reflections return as increasingly faint underpainting; current witnessed relations become the active surface.

        ## Epistemic Boundary

        FoldPortrait chooses composition from bounded aggregate public measurements. Structural resonance is an artistic hypothesis. Pearson correlation is reported only after at least three preserved observations with variance. Neither establishes causation, authority, personhood, private human behavior, or constitutional truth.
        """
    }

    private func stableUInt64(_ text: String) -> UInt64 {
        Keccak256().hash(Array(text.utf8)).prefix(8).reduce(UInt64(0)) { ($0 << 8) | UInt64($1) }
    }

    private func stableBit(_ text: String) -> Bool {
        stableUInt64(text).isMultiple(of: 2)
    }

    private func rounded(_ value: Double) -> Double {
        (value * 1_000_000).rounded() / 1_000_000
    }

    private func format(_ value: Double) -> String {
        String(format: "%.3f", value)
    }
}

public enum SystemReflectionError: Error, CustomStringConvertible {
    case invalidWitness(String)
    case invalidArchive(String)

    public var description: String {
        switch self {
        case let .invalidWitness(message): "Invalid system witness: \(message)"
        case let .invalidArchive(message): "Invalid reflection archive: \(message)"
        }
    }
}
