import FoldPortraitCore
import Foundation

@main
struct FoldPortrait {
    static func main() throws {
        let seed = CommandLine.arguments.dropFirst().first ?? "zero poet"
        let result = PortraitRenderer().render(seed: seed)
        let outputDirectory = URL(fileURLWithPath: "Output", isDirectory: true)
        let outputURL = outputDirectory.appendingPathComponent("portrait.svg")

        try FileManager.default.createDirectory(
            at: outputDirectory,
            withIntermediateDirectories: true
        )
        try result.svg.write(to: outputURL, atomically: true, encoding: .utf8)

        print("Wrote \(outputURL.path)")
        print("Convergence hash: \(result.convergenceHashHex)")
    }
}
