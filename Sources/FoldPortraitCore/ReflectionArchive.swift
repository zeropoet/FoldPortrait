import Foundation

public struct CurrentReflection: Codable, Equatable, Sendable {
    public let schema: String
    public let cycleID: String
    public let iteration: String
    public let sequence: Int
    public let observedAt: String
    public let witnessDigest: String
    public let convergenceHash: String
    public let renderHash: String
    public let memorySignature: String
    public let svgPath: String
    public let notesPath: String
    public let chosenRules: [String]
    public let correlationCount: Int
}

public struct ReflectionArchiveUpdate: Sendable {
    public let changed: Bool
    public let current: CurrentReflection
}

public struct ReflectionArchive: Sendable {
    public init() {}

    public func update(witnessURL: URL, repositoryRoot: URL) throws -> ReflectionArchiveUpdate {
        let witness = try decode(PortraitSystemWitness.self, from: witnessURL)
        let reflections = repositoryRoot.appendingPathComponent("Output/reflections", isDirectory: true)
        let cyclesDirectory = reflections.appendingPathComponent("cycles", isDirectory: true)
        let currentURL = reflections.appendingPathComponent("current.json")
        let ledgerURL = reflections.appendingPathComponent("reflection-ledger.json")
        let priorCycles = try loadCycles(from: cyclesDirectory)

        if
            let last = priorCycles.last,
            last.witnessDigest == witness.digest,
            FileManager.default.fileExists(atPath: currentURL.path)
        {
            return ReflectionArchiveUpdate(changed: false, current: try decode(CurrentReflection.self, from: currentURL))
        }

        let rendered = try SystemReflectionEngine().reflect(witness: witness, priorCycles: priorCycles)
        try FileManager.default.createDirectory(at: cyclesDirectory, withIntermediateDirectories: true)

        let artifactURL = repositoryRoot.appendingPathComponent(rendered.cycle.artifact)
        let notesURL = repositoryRoot.appendingPathComponent(rendered.cycle.notes)
        let cycleURL = cyclesDirectory.appendingPathComponent("\(rendered.cycle.cycleID).json")
        try Data(rendered.svg.utf8).write(to: artifactURL, options: .atomic)
        try Data(rendered.notes.utf8).write(to: notesURL, options: .atomic)
        try encode(rendered.cycle).write(to: cycleURL, options: .atomic)

        let current = CurrentReflection(
            schema: "foldportrait-current-reflection/v1",
            cycleID: rendered.cycle.cycleID,
            iteration: "reflection-\(String(format: "%04d", rendered.cycle.sequence))",
            sequence: rendered.cycle.sequence,
            observedAt: rendered.cycle.witnessedAt,
            witnessDigest: rendered.cycle.witnessDigest,
            convergenceHash: rendered.cycle.foldKernelIdentity,
            renderHash: rendered.cycle.renderHash,
            memorySignature: memorySignature(from: rendered.svg),
            svgPath: rendered.cycle.artifact,
            notesPath: rendered.cycle.notes,
            chosenRules: rendered.cycle.chosenRules,
            correlationCount: rendered.cycle.correlations.count
        )
        try encode(current).write(to: currentURL, options: .atomic)
        try encode(priorCycles + [rendered.cycle]).write(to: ledgerURL, options: .atomic)
        return ReflectionArchiveUpdate(changed: true, current: current)
    }

    public func verify(repositoryRoot: URL) throws -> CurrentReflection {
        let reflections = repositoryRoot.appendingPathComponent("Output/reflections", isDirectory: true)
        let current = try decode(CurrentReflection.self, from: reflections.appendingPathComponent("current.json"))
        let cycles = try loadCycles(from: reflections.appendingPathComponent("cycles", isDirectory: true))
        guard let last = cycles.last, last.cycleID == current.cycleID else {
            throw SystemReflectionError.invalidArchive("current reflection does not match the last preserved cycle")
        }
        guard last.renderHash == current.renderHash, last.witnessDigest == current.witnessDigest else {
            throw SystemReflectionError.invalidArchive("current hashes do not match the preserved cycle")
        }
        let artifactURL = repositoryRoot.appendingPathComponent(current.svgPath)
        let svg = try String(contentsOf: artifactURL, encoding: .utf8)
        guard
            svg.contains("data-reflection-cycle=\"\(current.cycleID)\""),
            svg.contains("data-reflection-hash=\"\(current.renderHash)\""),
            svg.contains("data-witness-digest=\"\(current.witnessDigest)\"")
        else {
            throw SystemReflectionError.invalidArchive("current SVG is not bound to its cycle, render, and witness hashes")
        }
        guard current.convergenceHash == last.foldKernelIdentity else {
            throw SystemReflectionError.invalidArchive("FoldKernel identity continuity failed")
        }
        return current
    }

    public func replay(afterSequence calibrationSequence: Int, repositoryRoot: URL) throws -> CurrentReflection {
        let reflections = repositoryRoot.appendingPathComponent("Output/reflections", isDirectory: true)
        let cyclesDirectory = reflections.appendingPathComponent("cycles", isDirectory: true)
        let original = try loadCycles(from: cyclesDirectory)
        let calibration = original.filter { $0.sequence <= calibrationSequence }
        let replayInputs = original.filter { $0.sequence > calibrationSequence }
        guard calibration.last?.sequence == calibrationSequence, !replayInputs.isEmpty else {
            throw SystemReflectionError.invalidArchive("replay requires a preserved calibration boundary and later cycles")
        }

        try preserveResearchCheckpoint(
            cycles: replayInputs,
            calibrationSequence: calibrationSequence,
            reflections: reflections,
            repositoryRoot: repositoryRoot
        )

        var regenerated = calibration
        for recorded in replayInputs {
            let rendered = SystemReflectionEngine().replay(recordedCycle: recorded, priorCycles: regenerated)
            let artifactURL = repositoryRoot.appendingPathComponent(rendered.cycle.artifact)
            let notesURL = repositoryRoot.appendingPathComponent(rendered.cycle.notes)
            let cycleURL = cyclesDirectory.appendingPathComponent("\(rendered.cycle.cycleID).json")
            try Data(rendered.svg.utf8).write(to: artifactURL, options: .atomic)
            try Data(rendered.notes.utf8).write(to: notesURL, options: .atomic)
            try encode(rendered.cycle).write(to: cycleURL, options: .atomic)
            regenerated.append(rendered.cycle)
        }

        guard let last = regenerated.last else {
            throw SystemReflectionError.invalidArchive("replay produced no current reflection")
        }
        let svg = try String(contentsOf: repositoryRoot.appendingPathComponent(last.artifact), encoding: .utf8)
        let current = CurrentReflection(
            schema: "foldportrait-current-reflection/v1",
            cycleID: last.cycleID,
            iteration: "reflection-\(String(format: "%04d", last.sequence))",
            sequence: last.sequence,
            observedAt: last.witnessedAt,
            witnessDigest: last.witnessDigest,
            convergenceHash: last.foldKernelIdentity,
            renderHash: last.renderHash,
            memorySignature: memorySignature(from: svg),
            svgPath: last.artifact,
            notesPath: last.notes,
            chosenRules: last.chosenRules,
            correlationCount: last.correlations.count
        )
        try encode(current).write(to: reflections.appendingPathComponent("current.json"), options: .atomic)
        try encode(regenerated).write(to: reflections.appendingPathComponent("reflection-ledger.json"), options: .atomic)
        return current
    }

    private func preserveResearchCheckpoint(
        cycles: [ReflectionCycle],
        calibrationSequence: Int,
        reflections: URL,
        repositoryRoot: URL
    ) throws {
        let checkpoint = reflections.appendingPathComponent(
            "research/pre-learning-post-\(String(format: "%04d", calibrationSequence))",
            isDirectory: true
        )
        let manifestURL = checkpoint.appendingPathComponent("manifest.json")
        if FileManager.default.fileExists(atPath: manifestURL.path) { return }

        try FileManager.default.createDirectory(at: checkpoint, withIntermediateDirectories: true)
        var records: [[String: Any]] = []
        for cycle in cycles {
            let names = [
                "cycles/\(cycle.cycleID).json",
                cycle.artifact.replacingOccurrences(of: "Output/reflections/", with: ""),
                cycle.notes.replacingOccurrences(of: "Output/reflections/", with: ""),
            ]
            for name in names {
                let source = reflections.appendingPathComponent(name)
                let destination = checkpoint.appendingPathComponent(name)
                try FileManager.default.createDirectory(
                    at: destination.deletingLastPathComponent(),
                    withIntermediateDirectories: true
                )
                try FileManager.default.copyItem(at: source, to: destination)
            }
            records.append([
                "cycleID": cycle.cycleID,
                "witnessDigest": cycle.witnessDigest,
                "renderHash": cycle.renderHash,
                "files": names,
            ])
        }
        let manifest: [String: Any] = [
            "schema": "foldportrait-composition-research-checkpoint/v1",
            "title": "Pre-learning post-\(String(format: "%04d", calibrationSequence)) reflections",
            "purpose": "Preserves the displaced deterministic surfaces used to diagnose compositional saturation before learned-composition-v1.",
            "canonicalThrough": String(format: "FP-REFLECT-%04d", calibrationSequence),
            "replayBoundary": calibrationSequence,
            "records": records,
            "recovery": "The SVG, notes, and cycle records are sufficient to reproduce flattened PNG and unsigned mint candidates.",
        ]
        let data = try JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys]) + Data("\n".utf8)
        try data.write(to: manifestURL, options: .atomic)
    }

    private func loadCycles(from directory: URL) throws -> [ReflectionCycle] {
        guard FileManager.default.fileExists(atPath: directory.path) else { return [] }
        return try FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil
        )
        .filter { $0.pathExtension == "json" }
        .map { try decode(ReflectionCycle.self, from: $0) }
        .sorted { $0.sequence < $1.sequence }
    }

    private func memorySignature(from svg: String) -> String {
        let marker = "data-memory-signature=\""
        guard let start = svg.range(of: marker)?.upperBound, let end = svg[start...].firstIndex(of: "\"") else {
            return ""
        }
        return String(svg[start..<end])
    }

    private func decode<T: Decodable>(_ type: T.Type, from url: URL) throws -> T {
        try JSONDecoder().decode(type, from: Data(contentsOf: url))
    }

    private func encode<T: Encodable>(_ value: T) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(value) + Data("\n".utf8)
    }
}
