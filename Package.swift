// swift-tools-version: 6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "FoldPortrait",
    platforms: [
        .macOS(.v14),
    ],
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
        .package(url: "https://github.com/swiftlang/swift-testing.git", revision: "swift-6.1.2-RELEASE"),
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
            dependencies: [
                "FoldPortraitCore",
                .product(name: "Testing", package: "swift-testing"),
            ]
        ),
    ],
    swiftLanguageModes: [.v6]
)
