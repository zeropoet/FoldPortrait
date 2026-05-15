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
    #expect(first.parameters == second.parameters)
    #expect(first.svg != second.svg)
    #expect(first.svg.contains("abstract study v0001"))
    #expect(second.svg.contains("abstract study v0002"))
    #expect(second.artworkNotes.contains("Sketch iteration: v0002"))
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
}

@Test func renderProducesSvgPortrait() {
    let result = PortraitRenderer().render(seed: "zero poet")

    #expect(result.svg.contains("<svg"))
    #expect(result.svg.contains("data-art-mode=\"structural-abstract\""))
    #expect(result.svg.contains("data-memory-signature="))
    #expect(result.svg.contains("data-permutation="))
    #expect(result.svg.contains("memory-byte"))
    #expect(result.svg.contains("fold-glyph"))
    #expect(result.artworkNotes.contains("abstract constitutional identity"))
    #expect(result.artworkNotes.contains("painting or drawing"))
    #expect(result.convergenceHashHex.count == 64)
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
