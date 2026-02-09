// src/utils/debug.ts

import { Alert } from "react-native";
import * as Clipboard from "expo-clipboard";

/**
 * Format any error (FirebaseError, ZodError, plain Error, unknown) into readable text.
 */
export function formatDebugError(e: any): string {
  const code = e?.code ? String(e.code) : "";
  const name = e?.name ? String(e.name) : "";
  const message = e?.message ? String(e.message) : String(e);
  const stack = e?.stack ? String(e.stack) : "";
  const extra =
    e && typeof e === "object"
      ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2)
      : "";

  return [
    code ? `code: ${code}` : "",
    name ? `name: ${name}` : "",
    message ? `message: ${message}` : "",
    stack ? `stack: ${stack}` : "",
    extra && extra !== "{}" ? `raw: ${extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Dev-only alert that shows full error + Copy button.
 * Prod shows a friendly message.
 */
export async function debugAlert(
  title: string,
  e: any,
  prodMessage = "Something went wrong."
): Promise<void> {
  const msg = formatDebugError(e);

  // Always log (useful even in prod logs)
  console.error(`🔥 ${title} 🔥\n${msg}`);

  if (!__DEV__) {
    Alert.alert("Error", prodMessage);
    return;
  }

  const preview =
    msg.length > 1800 ? msg.slice(0, 1800) + "\n…(truncated)" : msg;

  Alert.alert(
    title,
    preview,
    [
      {
        text: "Copy",
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(msg);
            Alert.alert("Copied", "Debug log copied to clipboard.");
          } catch {
            // ignore
          }
        },
      },
      { text: "OK" },
    ],
    { cancelable: true }
  );
}
