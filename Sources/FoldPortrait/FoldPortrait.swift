import FoldPortraitCore
import Foundation

@main
struct FoldPortrait {
    static func main() throws {
        let seed = CommandLine.arguments.dropFirst().first ?? "zero poet"
        let result = PortraitRenderer().render(seed: seed)
        let outputDirectory = URL(fileURLWithPath: "Output/iterations", isDirectory: true)

        try FileManager.default.createDirectory(
            at: outputDirectory,
            withIntermediateDirectories: true
        )

        let iteration = try nextIterationNumber(in: outputDirectory)
        let filename = [
            "foldportrait",
            String(format: "v%04d", iteration),
            slug(seed),
            String(result.convergenceHashHex.prefix(8)),
        ].joined(separator: "-")
        let svgURL = outputDirectory.appendingPathComponent(filename + ".svg")
        let promptURL = outputDirectory.appendingPathComponent(filename + ".prompt.md")

        try result.svg.write(to: svgURL, atomically: true, encoding: .utf8)
        try result.photorealPrompt.write(to: promptURL, atomically: true, encoding: .utf8)

        print("Wrote \(svgURL.path)")
        print("Wrote \(promptURL.path)")
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
}
