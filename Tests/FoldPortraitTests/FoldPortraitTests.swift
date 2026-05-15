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
    #expect(result.svg.contains("<ellipse"))
    #expect(result.svg.contains("Fold portrait"))
    #expect(result.convergenceHashHex.count == 64)
}
