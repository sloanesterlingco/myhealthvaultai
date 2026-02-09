import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../theme";
import { useOnDeviceSpeechToText } from "../hooks/useOnDeviceSpeechToText";

type Props = {
  onFinalText: (text: string) => void;
  labelIdle?: string;
  labelStarting?: string;
  labelListening?: string;
  startDelayMs?: number; // ✅ controls the “don’t speak yet” delay
};

/**
 * Tap-to-talk (on-device)
 * Uses: useOnDeviceSpeechToText()
 *
 * Fix for first-words-cut-off:
 * - We force a "Starting… wait" UI gate for startDelayMs
 * - Only after that do we show “Listening… go ahead”
 */
export function PushToTalkButton({
  onFinalText,
  labelIdle = "Tap to speak",
  labelStarting = "Starting… wait",
  labelListening = "Listening… go ahead (tap to stop)",
  startDelayMs = 1200,
}: Props) {
  // Cast to any so TS doesn’t explode if the hook’s return type is missing fields
  const stt: any = useOnDeviceSpeechToText();

  const lastSentRef = useRef<string>("");
  const timerRef = useRef<any>(null);

  // UI gate states (independent of hook typing)
  const [uiStarting, setUiStarting] = useState(false);
  const [uiReadyToSpeak, setUiReadyToSpeak] = useState(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // When listening begins, start the “ready to speak” timer
  useEffect(() => {
    if (!stt?.isListening) {
      setUiStarting(false);
      setUiReadyToSpeak(false);
      clearTimer();
      return;
    }

    // If listening is true, we keep Starting until delay finishes
    setUiStarting(true);
    setUiReadyToSpeak(false);
    clearTimer();

    timerRef.current = setTimeout(() => {
      setUiStarting(false);
      setUiReadyToSpeak(true);
    }, startDelayMs);

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt?.isListening, startDelayMs]);

  // Send final transcript only when recognition has ended
  useEffect(() => {
    // If still listening, do nothing
    if (stt?.isListening) return;

    // If the hook supports an "isStarting" flag, respect it
    if (stt?.isStarting) return;

    const text = String(stt?.transcript ?? "").trim();
    if (!text) return;
    if (text === lastSentRef.current) return;

    lastSentRef.current = text;
    onFinalText(text);

    // Clear transcript if the hook supports it
    if (typeof stt?.clear === "function") stt.clear();
    else if (typeof stt?.reset === "function") stt.reset();
  }, [stt?.isListening, stt?.isStarting, stt?.transcript, onFinalText, stt]);

  const onPress = async () => {
    // If listening, stop
    if (stt?.isListening) {
      clearTimer();
      setUiStarting(false);
      setUiReadyToSpeak(false);

      if (typeof stt?.stop === "function") stt.stop();
      return;
    }

    // Start
    lastSentRef.current = "";
    setUiStarting(true);
    setUiReadyToSpeak(false);
    clearTimer();

    if (typeof stt?.start === "function") {
      await stt.start();
    }
  };

  const label = useMemo(() => {
    if (stt?.isListening) {
      return uiReadyToSpeak ? labelListening : labelStarting;
    }
    if (uiStarting || stt?.isStarting) return labelStarting;
    return labelIdle;
  }, [stt?.isListening, stt?.isStarting, uiStarting, uiReadyToSpeak, labelIdle, labelStarting, labelListening]);

  const helper = useMemo(() => {
    // Permission + errors if present (but don’t assume these fields exist)
    if (stt?.hasPermission === false) {
      return "Mic permission is off. Tap once and allow microphone access.";
    }
    if (stt?.error) {
      return `Speech error: ${String(stt.error)}`;
    }

    if (stt?.isListening) {
      return uiReadyToSpeak
        ? "Now speak normally. Tap again to stop."
        : "Hold for a beat… don’t speak yet.";
    }

    return "Tip: wait for “Listening… go ahead” before speaking.";
  }, [stt?.hasPermission, stt?.error, stt?.isListening, uiReadyToSpeak]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[
          styles.btn,
          stt?.isListening ? styles.btnListening : styles.btnIdle,
          uiStarting || stt?.isStarting ? styles.btnStarting : null,
        ]}
      >
        <Text style={styles.btnText}>{label}</Text>
      </TouchableOpacity>

      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  btn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnIdle: { backgroundColor: theme.colors.brand },
  btnStarting: { opacity: 0.9 },
  btnListening: { backgroundColor: theme.colors.danger },
  btnText: { color: "white", fontWeight: "900", fontSize: 16 },
  helper: { marginTop: 10, color: theme.colors.textSecondary, fontWeight: "700" },
});
