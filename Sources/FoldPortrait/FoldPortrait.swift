import FoldPortraitCore
import Foundation

@main
struct FoldPortrait {
    static func main() throws {
        let arguments = Array(CommandLine.arguments.dropFirst())
        let command = arguments.first ?? "status"
        let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
        let archive = ReflectionArchive()

        switch command {
        case "reflect":
            let witnessPath = arguments.dropFirst().first ?? "Reflection/system-witness.json"
            let witnessURL = URL(fileURLWithPath: witnessPath, relativeTo: root).standardizedFileURL
            let update = try archive.update(witnessURL: witnessURL, repositoryRoot: root)
            let state = update.changed ? "created" : "unchanged"
            print("\(update.current.cycleID) \(state): \(update.current.svgPath)")
        case "verify-reflection":
            let current = try archive.verify(repositoryRoot: root)
            print("\(current.cycleID) valid: \(current.renderHash)")
        case "status":
            let currentURL = root.appendingPathComponent("Output/reflections/current.json")
            if FileManager.default.fileExists(atPath: currentURL.path) {
                let current = try archive.verify(repositoryRoot: root)
                print("FoldPortrait reflection is current at \(current.cycleID). The completed first-era archive remains sealed.")
            } else {
                print("FoldPortrait first era is sealed. Run `swift run fold-portrait reflect` to begin bounded system reflection.")
            }
        default:
            throw CommandError.unknownOption(command)
        }
    }

    private static func nextIterationNumber(in directory: URL) throws -> Int {
        let filenames = try FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil
        ).map(\.lastPathComponent)

        let existingNumbers = filenames.compactMap { filename -> Int? in
            guard filename.hasPrefix("foldportrait-v") else {
                return nil
            }

            let start = filename.index(filename.startIndex, offsetBy: "foldportrait-v".count)
            let end = filename[start...].firstIndex { character in
                character == "." || character == "-"
            } ?? filename.endIndex
            return Int(filename[start..<end])
        }

        return (existingNumbers.max() ?? 0) + 1
    }

    private static func slug(_ value: String) -> String {
        let lowercased = value.lowercased()
        let characters = lowercased.map { character -> Character in
            if character.isLetter || character.isNumber {
                character
            } else {
                "-"
            }
        }
        let collapsed = String(characters)
            .split(separator: "-", omittingEmptySubsequences: true)
            .joined(separator: "-")

        return collapsed.isEmpty ? "untitled" : collapsed
    }

    private static func nextRefinementDepth(
        from ledgerURL: URL,
        fallbackIteration: Int
    ) throws -> Int {
        guard FileManager.default.fileExists(atPath: ledgerURL.path) else {
            return min(18, max(1, fallbackIteration))
        }

        let data = try Data(contentsOf: ledgerURL)
        let entries = try JSONDecoder().decode([EvolutionEntry].self, from: data)
        return min(18, max(fallbackIteration, (entries.map(\.refinementDepth).max() ?? 0) + 1))
    }

    fileprivate static func nextPortraitVersion(
        from ledgerURL: URL,
        outputDirectory: URL
    ) throws -> PortraitVersion {
        guard FileManager.default.fileExists(atPath: ledgerURL.path) else {
            return PortraitVersion(anchor: try nextIterationNumber(in: outputDirectory), revision: 1)
        }

        let data = try Data(contentsOf: ledgerURL)
        let entries = try JSONDecoder().decode([EvolutionEntry].self, from: data)
        let versions = entries.compactMap { PortraitVersion(label: $0.iteration) }
        let firstPassAnchors = Set(versions.filter { $0.revision == 1 }.map(\.anchor))
        let anchorRange = 1...12

        if firstPassAnchors.count < anchorRange.count {
            let nextAnchor = anchorRange.first { !firstPassAnchors.contains($0) } ?? 1
            return PortraitVersion(anchor: nextAnchor, revision: 1)
        }

        let occupied = Set(versions)
        let maxRevision = max(2, versions.map(\.revision).max() ?? 1)
        for revision in 2...maxRevision {
            for anchor in anchorRange where !occupied.contains(PortraitVersion(anchor: anchor, revision: revision)) {
                return PortraitVersion(anchor: anchor, revision: revision)
            }
        }

        return PortraitVersion(anchor: 1, revision: maxRevision + 1)
    }

    private static func refinementDepth(
        for version: PortraitVersion,
        ledgerURL: URL
    ) throws -> Int {
        if version.revision <= 1 {
            return try nextRefinementDepth(from: ledgerURL, fallbackIteration: version.anchor)
        }

        guard FileManager.default.fileExists(atPath: ledgerURL.path) else {
            return min(18, max(1, version.anchor))
        }

        let data = try Data(contentsOf: ledgerURL)
        let entries = try JSONDecoder().decode([EvolutionEntry].self, from: data)
        let baseLabel = PortraitVersion(anchor: version.anchor, revision: 1).ledgerLabel
        return entries.first { $0.iteration == baseLabel }?.refinementDepth ?? min(18, max(1, version.anchor))
    }

    private static func appendEvolutionEntry(
        to ledgerURL: URL,
        seed: String,
        version: PortraitVersion,
        refinementDepth: Int,
        result: PortraitRenderResult,
        svgURL: URL,
        notesURL: URL
    ) throws {
        let existingEntries: [EvolutionEntry]
        if FileManager.default.fileExists(atPath: ledgerURL.path) {
            let data = try Data(contentsOf: ledgerURL)
            existingEntries = try JSONDecoder().decode([EvolutionEntry].self, from: data)
        } else {
            existingEntries = []
        }

        let entry = EvolutionEntry(
            iteration: version.ledgerLabel,
            seed: seed,
            convergenceHash: result.convergenceHashHex,
            renderHash: result.renderHashHex,
            memorySignature: result.memorySignatureHex,
            refinementDepth: refinementDepth,
            svgPath: svgURL.path,
            notesPath: notesURL.path,
            mutationRule: "Preserve identity hash and memory signature; evolve visible structure through iteration-specific growth forces, material weathering, and drawing pressure.",
            sourceIteration: version.anchor,
            revision: version.revision,
            structuralIdentity: StructuralIdentity(
                fieldWidthPressure: result.parameters.fieldWidthPressure,
                verticalFieldPressure: result.parameters.verticalFieldPressure,
                lowerMassTaper: result.parameters.lowerMassTaper,
                internalHorizon: result.parameters.internalHorizon,
                axisTilt: result.parameters.axisTilt,
                asymmetry: result.parameters.asymmetry
            ),
            growthClimate: GrowthClimate(
                age: result.growth.age,
                season: result.growth.season,
                activeForce: result.growth.activeForce,
                materialState: result.growth.materialState,
                compression: result.growth.compression,
                torsion: result.growth.torsion,
                shear: result.growth.shear,
                bloom: result.growth.bloom,
                erosion: result.growth.erosion,
                sediment: result.growth.sediment,
                fiberMemory: result.growth.fiberMemory
            )
        )
        let entries = (existingEntries.filter { $0.iteration != entry.iteration } + [entry])
            .sorted { first, second in
                let firstVersion = PortraitVersion(label: first.iteration) ?? PortraitVersion(anchor: Int.max, revision: Int.max)
                let secondVersion = PortraitVersion(label: second.iteration) ?? PortraitVersion(anchor: Int.max, revision: Int.max)
                return firstVersion < secondVersion
            }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(entries)
        try data.write(to: ledgerURL, options: .atomic)
    }
}

private struct CommandOptions {
    let seed: String
    let iteration: Int?
    let revision: Int?
    let refinementDepth: Int?

    init(arguments: [String]) throws {
        var seed: String?
        var iteration: Int?
        var revision: Int?
        var refinementDepth: Int?
        var index = 0

        while index < arguments.count {
            let argument = arguments[index]
            switch argument {
            case "--iteration":
                index += 1
                iteration = try Self.integerValue(after: argument, in: arguments, at: index)
            case "--revision":
                index += 1
                revision = try Self.integerValue(after: argument, in: arguments, at: index)
            case "--refinement-depth":
                index += 1
                refinementDepth = try Self.integerValue(after: argument, in: arguments, at: index)
            default:
                if argument.hasPrefix("--") {
                    throw CommandError.unknownOption(argument)
                }
                seed = argument
            }

            index += 1
        }

        self.seed = seed ?? "zero poet"
        self.iteration = iteration
        self.revision = revision
        self.refinementDepth = refinementDepth
    }

    func version(from ledgerURL: URL, outputDirectory: URL) throws -> PortraitVersion {
        if let iteration {
            return PortraitVersion(anchor: iteration, revision: revision ?? 1)
        }

        if let revision {
            let next = try FoldPortrait.nextPortraitVersion(from: ledgerURL, outputDirectory: outputDirectory)
            return PortraitVersion(anchor: next.anchor, revision: revision)
        }

        return try FoldPortrait.nextPortraitVersion(from: ledgerURL, outputDirectory: outputDirectory)
    }

    private static func integerValue(after option: String, in arguments: [String], at index: Int) throws -> Int {
        guard index < arguments.count, let value = Int(arguments[index]) else {
            throw CommandError.missingInteger(option)
        }
        return value
    }
}

private struct PortraitVersion: Codable, Comparable, Equatable, Hashable {
    let anchor: Int
    let revision: Int

    init(anchor: Int, revision: Int) {
        self.anchor = max(1, anchor)
        self.revision = max(1, revision)
    }

    init?(label: String) {
        guard label.first == "v" else {
            return nil
        }

        let body = label.dropFirst()
        let parts = body.split(separator: ".", maxSplits: 1)
        guard let anchor = Int(parts[0]) else {
            return nil
        }

        let revision = parts.count == 2 ? Int(parts[1]) ?? 1 : 1
        self.init(anchor: anchor, revision: revision)
    }

    var ledgerLabel: String {
        if revision <= 1 {
            return "v\(anchor)"
        }

        return "v\(anchor).\(revision)"
    }

    var fileComponent: String {
        if revision <= 1 {
            return "v\(anchor)"
        }

        return "v\(anchor).\(revision)"
    }

    var displayLabel: String {
        ledgerLabel
    }

    static func < (lhs: PortraitVersion, rhs: PortraitVersion) -> Bool {
        if lhs.revision != rhs.revision {
            return lhs.revision < rhs.revision
        }

        return lhs.anchor < rhs.anchor
    }
}

private enum CommandError: Error, CustomStringConvertible {
    case missingInteger(String)
    case unknownOption(String)

    var description: String {
        switch self {
        case let .missingInteger(option):
            return "Missing integer value after \(option)"
        case let .unknownOption(option):
            return "Unknown option \(option)"
        }
    }
}

private struct EvolutionEntry: Codable {
    let iteration: String
    let seed: String
    let convergenceHash: String
    let renderHash: String?
    let memorySignature: String
    let refinementDepth: Int
    let svgPath: String
    let notesPath: String
    let mutationRule: String
    let sourceIteration: Int?
    let revision: Int?
    let structuralIdentity: StructuralIdentity
    let growthClimate: GrowthClimate?
}

private struct StructuralIdentity: Codable {
    let fieldWidthPressure: Double
    let verticalFieldPressure: Double
    let lowerMassTaper: Double
    let internalHorizon: Double
    let axisTilt: Double
    let asymmetry: Double
}

private struct GrowthClimate: Codable {
    let age: Int
    let season: Int
    let activeForce: String
    let materialState: String
    let compression: Double
    let torsion: Double
    let shear: Double
    let bloom: Double
    let erosion: Double
    let sediment: Double
    let fiberMemory: Double
}
