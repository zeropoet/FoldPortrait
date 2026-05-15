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

@Test func renderProducesSvgPortrait() {
    let result = PortraitRenderer().render(seed: "zero poet")

    #expect(result.svg.contains("<svg"))
    #expect(result.svg.contains("skinLight"))
    #expect(result.svg.contains("Fold portrait"))
    #expect(result.svg.contains("face width"))
    #expect(result.convergenceHashHex.count == 64)
}

@Test func renderExposesBoundedPortraitParameters() {
    let parameters = PortraitRenderer().render(seed: "zero poet").parameters

    #expect((0.84...1.16).contains(parameters.faceWidth))
    #expect((-7...7).contains(parameters.headTilt))
    #expect((0.05...0.45).contains(parameters.skinTexture))
    #expect((0.20...0.56).contains(parameters.keyLightStrength))
    #expect(parameters.reportLines.count == 6)
}
