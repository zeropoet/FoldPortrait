import FoldKernel

public enum FoldPortraitValueReceiptProducer {
    /// Emits evidence for a completed portrait artifact without assigning monetary value.
    public static func issue(
        eventID: String,
        artifactDigest: String,
        periodStart: String,
        periodEnd: String
    ) throws -> FoldKernelValueReceipt {
        try FoldKernelValueReceiptContract.issue(
            sourceSystem: "foldportrait",
            eventID: eventID,
            artifactDigest: artifactDigest,
            outputKind: "portrait_render",
            periodStart: periodStart,
            periodEnd: periodEnd,
            state: .evidenced
        )
    }
}
