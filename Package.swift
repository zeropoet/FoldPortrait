// swift-tools-version: 6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "FoldPortrait",
    products: [
        .executable(
            name: "fold-portrait",
            targets: ["FoldPortrait"]
        ),
        .library(
            name: "FoldPortraitCore",
            targets: ["FoldPortraitCore"]
        ),
    ],
    dependencies: [
        .package(path: "../FoldKernel"),
    ],
    targets: [
        .target(
            name: "FoldPortraitCore",
            dependencies: ["FoldKernel"]
        ),
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .executableTarget(
            name: "FoldPortrait",
            dependencies: ["FoldPortraitCore"]
        ),
        .testTarget(
            name: "FoldPortraitTests",
            dependencies: ["FoldPortraitCore"]
        ),
    ],
    swiftLanguageModes: [.v6]
)
