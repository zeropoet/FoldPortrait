import FoldPortraitCore
import Foundation

@main
struct FoldPortrait {
    static func main() throws {
        let seed = CommandLine.arguments.dropFirst().first ?? "zero poet"
        let outputDirectory = URL(fileURLWithPath: "Output/iterations", isDirectory: true)

        try FileManager.default.createDirectory(
            at: outputDirectory,
            withIntermediateDirectories: true
        )

        let iteration = try nextIterationNumber(in: outputDirectory)
        let ledgerURL = outputDirectory.appendingPathComponent("evolution.json")
        let refinementDepth = try nextRefinementDepth(from: ledgerURL, fallbackIteration: iteration)
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
            memorySignature: result.memorySignatureHex,
            refinementDepth: refinementDepth,
            svgPath: svgURL.path,
            notesPath: notesURL.path,
            mutationRule: "Preserve identity hash and memory signature; evolve visible structure through iteration-specific drawing pressure.",
            structuralIdentity: StructuralIdentity(
                fieldWidthPressure: result.parameters.fieldWidthPressure,
                verticalFieldPressure: result.parameters.verticalFieldPressure,
                lowerMassTaper: result.parameters.lowerMassTaper,
                internalHorizon: result.parameters.internalHorizon,
                axisTilt: result.parameters.axisTilt,
                asymmetry: result.parameters.asymmetry
            )
        )
        let entries = existingEntries.filter { $0.iteration != entry.iteration } + [entry]
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(entries)
        try data.write(to: ledgerURL, options: .atomic)
    }
}

private struct EvolutionEntry: Codable {
    let iteration: String
    let seed: String
    let convergenceHash: String
    let memorySignature: String
    let refinementDepth: Int
    let svgPath: String
    let notesPath: String
    let mutationRule: String
    let structuralIdentity: StructuralIdentity
}

private struct StructuralIdentity: Codable {
    let fieldWidthPressure: Double
    let verticalFieldPressure: Double
    let lowerMassTaper: Double
    let internalHorizon: Double
    let axisTilt: Double
    let asymmetry: Double
}
