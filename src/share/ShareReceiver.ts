import ReceiveSharingIntent from "react-native-receive-sharing-intent";

export type SharedPayload =
  | { kind: "text"; text: string }
  | { kind: "files"; files: any[] };

export function startShareListener(onPayload: (p: SharedPayload) => void) {
  // Grabs incoming shares (works best on real builds, not always perfect in debug)
  ReceiveSharingIntent.getReceivedFiles(
    (files: any[]) => {
      const first = files?.[0];

      // text share
      if (first?.text) {
        onPayload({ kind: "text", text: first.text });
        ReceiveSharingIntent.clearReceivedFiles();
        return;
      }

      // files share
      if (files?.length) {
        onPayload({ kind: "files", files });
        ReceiveSharingIntent.clearReceivedFiles();
      }
    },
    (error: any) => {
      console.log("ShareReceiver error:", error);
    },
    "MyHealthVaultAIShare"
  );
}
