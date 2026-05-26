import Testing
@testable import FoldPortraitCore

@Test func renderIsDeterministicForSeed() {
    let renderer = PortraitRenderer()
    let first = renderer.render(seed: "ada")
    let second = renderer.render(seed: "ada")

    #expect(first == second)
}

@Test func differentSeedsProduceDifferentHashes() {
    let renderer = PortraitRenderer()
    let first = renderer.render(seed: "ada")
    let second = renderer.render(seed: "grace")

    #expect(first.convergenceHashHex != second.convergenceHashHex)
}

@Test func iterationChangesSketchButPreservesIdentityHash() {
    let renderer = PortraitRenderer()
    let first = renderer.render(seed: "ada", iteration: 1)
    let second = renderer.render(seed: "ada", iteration: 2)

    #expect(first.convergenceHashHex == second.convergenceHashHex)
    #expect(first.renderHashHex != second.renderHashHex)
    #expect(first.parameters == second.parameters)
    #expect(first.svg != second.svg)
    #expect(first.svg.contains("abstract study v1"))
    #expect(second.svg.contains("abstract study v2"))
    #expect(second.artworkNotes.contains("Sketch iteration: v2"))
    #expect(second.artworkNotes.contains("Render hash: \(second.renderHashHex)"))
}

@Test func revisionChangesSketchWithinSameAnchor() {
    let renderer = PortraitRenderer()
    let anchor = renderer.render(seed: "ada", iteration: 1, refinementDepth: 7)
    let revision = renderer.render(seed: "ada", iteration: 1, revision: 2, refinementDepth: 7)

    #expect(anchor.convergenceHashHex == revision.convergenceHashHex)
    #expect(anchor.renderHashHex != revision.renderHashHex)
    #expect(anchor.parameters == revision.parameters)
    #expect(anchor.refinementDepth == revision.refinementDepth)
    #expect(!anchor.svg.contains("data-layer=\"lineage-leap\""))
    #expect(count("data-layer=\"lineage-leap\"", in: revision.svg) >= 18)
    #expect(revision.svg.contains("data-portrait-version=\"v1.2\""))
    #expect(revision.svg.contains("data-revision=\"2\""))
    #expect(revision.svg.contains("abstract study v1.2"))
    #expect(revision.artworkNotes.contains("Sketch iteration: v1.2"))
}

@Test func laterIterationsIncreaseVisualRefinement() {
    let renderer = PortraitRenderer()
    let early = renderer.render(seed: "ada", iteration: 1)
    let later = renderer.render(seed: "ada", iteration: 6)

    #expect(early.svg.contains("data-refinement-depth=\"1\""))
    #expect(later.svg.contains("data-refinement-depth=\"6\""))
    #expect(count("data-layer=\"fine-drawing\"", in: later.svg) > count("data-layer=\"fine-drawing\"", in: early.svg))
    #expect(count("data-layer=\"gesture\"", in: later.svg) > count("data-layer=\"gesture\"", in: early.svg))
    #expect(count("data-layer=\"color-field\"", in: later.svg) > count("data-layer=\"color-field\"", in: early.svg))
    #expect(later.growth.age > early.growth.age)
    #expect(count("data-layer=\"material-weathering\"", in: later.svg) > count("data-layer=\"material-weathering\"", in: early.svg))
}

@Test func renderProducesSvgPortrait() {
    let result = PortraitRenderer().render(seed: "zero poet")

    #expect(result.svg.contains("<svg"))
    #expect(result.svg.contains("data-art-mode=\"structural-abstract\""))
    #expect(result.svg.contains("data-convergence-hash=\"\(result.convergenceHashHex)\""))
    #expect(result.svg.contains("data-render-hash=\"\(result.renderHashHex)\""))
    #expect(result.svg.contains("data-memory-signature="))
    #expect(result.svg.contains("data-permutation="))
    #expect(result.svg.contains("data-active-force="))
    #expect(result.svg.contains("memory-byte"))
    #expect(result.svg.contains("fold-glyph"))
    #expect(result.svg.contains("growth-ring"))
    #expect(result.svg.contains("material-weathering"))
    #expect(result.artworkNotes.contains("abstract constitutional identity"))
    #expect(result.artworkNotes.contains("painting or drawing"))
    #expect(result.artworkNotes.contains("Growth Climate"))
    #expect(result.convergenceHashHex.count == 64)
    #expect(result.renderHashHex.count == 64)
}

@Test func growthClimateChangesWithIteration() {
    let renderer = PortraitRenderer()
    let early = renderer.render(seed: "ada", iteration: 1)
    let later = renderer.render(seed: "ada", iteration: 20)

    #expect(early.convergenceHashHex == later.convergenceHashHex)
    #expect(early.growth != later.growth)
    #expect((0...1).contains(later.growth.compression))
    #expect((0...1).contains(later.growth.torsion))
    #expect((0...1).contains(later.growth.erosion))
    #expect(later.svg.contains("data-growth-age=\"18\""))
}

@Test func renderExposesBoundedPortraitParameters() {
    let parameters = PortraitRenderer().render(seed: "zero poet").parameters

    #expect((0.84...1.16).contains(parameters.faceWidth))
    #expect((-7...7).contains(parameters.headTilt))
    #expect((0.05...0.45).contains(parameters.skinTexture))
    #expect((0.20...0.56).contains(parameters.keyLightStrength))
    #expect(parameters.reportLines.count == 6)
    #expect(parameters.reportLines[0].contains("field width"))
    #expect(parameters.reportLines[1].contains("paired interval"))
}

@Test func doctrinePreservesUserDirection() {
    let doctrine = PortraitDoctrine.constitutionalRitual

    #expect(doctrine.identityTone.contains("abstract portrait"))
    #expect(doctrine.identityTone.contains("painterly"))
    #expect(doctrine.identityTone.contains("gestural"))
    #expect(doctrine.identityTone.contains("ritual"))
    #expect(doctrine.subjectAnchor.contains("abstract constitutional identity"))
    #expect(doctrine.aestheticConstraints.contains("no literal realism requirement"))
    #expect(doctrine.aestheticConstraints.contains("no generic avatar beauty"))
}

private func count(_ needle: String, in haystack: String) -> Int {
    haystack.components(separatedBy: needle).count - 1
}
