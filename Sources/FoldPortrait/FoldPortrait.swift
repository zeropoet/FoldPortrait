import FoldPortraitCore
import Foundation

@main
struct FoldPortrait {
    static func main() throws {
        let options = try CommandOptions(arguments: Array(CommandLine.arguments.dropFirst()))
        let seed = options.seed
        let outputDirectory = URL(fileURLWithPath: "Output/iterations", isDirectory: true)

        try FileManager.default.createDirectory(
            at: outputDirectory,
            withIntermediateDirectories: true
        )

        let iteration = try options.iteration ?? nextIterationNumber(in: outputDirectory)
        let ledgerURL = outputDirectory.appendingPathComponent("evolution.json")
        let refinementDepth = try options.refinementDepth ?? nextRefinementDepth(from: ledgerURL, fallbackIteration: iteration)
        let result = PortraitRenderer().render(
            seed: seed,
            iteration: iteration,
            refinementDepth: refinementDepth
        )
        let filename = [
            "foldportrait",
            String(format: "v%04d", iteration),
            slug(seed),
            String(result.convergenceHashHex.prefix(8)),
        ].joined(separator: "-")
        let svgURL = outputDirectory.appendingPathComponent(filename + ".svg")
        let notesURL = outputDirectory.appendingPathComponent(filename + ".notes.md")

        try result.svg.write(to: svgURL, atomically: true, encoding: .utf8)
        try result.artworkNotes.write(to: notesURL, atomically: true, encoding: .utf8)
        try appendEvolutionEntry(
            to: ledgerURL,
            seed: seed,
            iteration: iteration,
            refinementDepth: refinementDepth,
            result: result,
            svgURL: svgURL,
            notesURL: notesURL
        )

        print("Wrote \(svgURL.path)")
        print("Wrote \(notesURL.path)")
        print("Updated \(ledgerURL.path)")
        print("Iteration: \(String(format: "v%04d", iteration))")
        print("Convergence hash: \(result.convergenceHashHex)")
        print("Render hash: \(result.renderHashHex)")
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
            let end = filename.index(start, offsetBy: 4, limitedBy: filename.endIndex) ?? filename.endIndex
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

    private static func appendEvolutionEntry(
        to ledgerURL: URL,
        seed: String,
        iteration: Int,
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
            iteration: String(format: "v%04d", iteration),
            seed: seed,
            convergenceHash: result.convergenceHashHex,
            renderHash: result.renderHashHex,
            memorySignature: result.memorySignatureHex,
            refinementDepth: refinementDepth,
            svgPath: svgURL.path,
            notesPath: notesURL.path,
            mutationRule: "Preserve identity hash and memory signature; evolve visible structure through iteration-specific growth forces, material weathering, and drawing pressure.",
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
        let entries = existingEntries.filter { $0.iteration != entry.iteration } + [entry]
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(entries)
        try data.write(to: ledgerURL, options: .atomic)
    }
}

private struct CommandOptions {
    let seed: String
    let iteration: Int?
    let refinementDepth: Int?

    init(arguments: [String]) throws {
        var seed: String?
        var iteration: Int?
        var refinementDepth: Int?
        var index = 0

        while index < arguments.count {
            let argument = arguments[index]
            switch argument {
            case "--iteration":
                index += 1
                iteration = try Self.integerValue(after: argument, in: arguments, at: index)
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
        self.refinementDepth = refinementDepth
    }

    private static func integerValue(after option: String, in arguments: [String], at index: Int) throws -> Int {
        guard index < arguments.count, let value = Int(arguments[index]) else {
            throw CommandError.missingInteger(option)
        }
        return value
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
