import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../theme";
import { useOnDeviceSpeechToText } from "../hooks/useOnDeviceSpeechToText";

type Props = {
  onFinalText: (text: string) => void;
  labelIdle?: string;
  labelStarting?: string;
  labelListening?: string;
  startDelayMs?: number; // controls the “don’t speak yet” delay
  showDebugStatus?: boolean; // show availability/permission status
};

/**
 * Tap-to-talk (on-device)
 * Uses: useOnDeviceSpeechToText()
 *
 * Fix for first-words-cut-off:
 * - We force a "Starting… wait" UI gate for startDelayMs
 * - Only after that do we show “Listening… go ahead”
 *
 * Adds production-grade UX:
 * - Shows "Speech not available in this build" when native module not compiled
 * - Shows mic permission guidance
 * - Shows error output
 */
export function PushToTalkButton({
  onFinalText,
  labelIdle = "Tap to speak",
  labelStarting = "Starting… wait",
  labelListening = "Listening… go ahead (tap to stop)",
  startDelayMs = 1200,
  showDebugStatus = false,
}: Props) {
  // Keep as any to be resilient across hook evolution
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
    // If not listening, reset UI gates
    if (!stt?.isListening) {
      setUiStarting(false);
      setUiReadyToSpeak(false);
      clearTimer();
      return;
    }

    // Listening is true: show Starting gate until delay completes
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

  const speechAvailable: boolean = stt?.isAvailable !== false; // default true if undefined
  const micPermission: boolean | null =
    typeof stt?.hasPermission === "boolean" ? stt.hasPermission : null;

  const onPress = async () => {
    // If speech is not available in this build, don't attempt start/stop
    if (!speechAvailable) {
      // If your hook exposes error, it will already show
      return;
    }

    // If listening, stop
    if (stt?.isListening) {
      clearTimer();
      setUiStarting(false);
      setUiReadyToSpeak(false);

      if (typeof stt?.stop === "function") {
        try {
          await stt.stop();
        } catch {}
      }
      return;
    }

    // Start
    lastSentRef.current = "";
    setUiStarting(true);
    setUiReadyToSpeak(false);
    clearTimer();

    if (typeof stt?.start === "function") {
      try {
        await stt.start();
      } catch {
        // If start throws, ensure UI gates are reset
        setUiStarting(false);
        setUiReadyToSpeak(false);
      }
    } else {
      setUiStarting(false);
      setUiReadyToSpeak(false);
    }
  };

  const label = useMemo(() => {
    // If speech module is missing, show a clear label
    if (!speechAvailable) return "Speech not available in this build";

    if (stt?.isListening) {
      return uiReadyToSpeak ? labelListening : labelStarting;
    }
    if (uiStarting || stt?.isStarting) return labelStarting;
    return labelIdle;
  }, [
    speechAvailable,
    stt?.isListening,
    stt?.isStarting,
    uiStarting,
    uiReadyToSpeak,
    labelIdle,
    labelStarting,
    labelListening,
  ]);

  const helper = useMemo(() => {
    // HARD STOP: module not compiled into APK/AAB
    if (!speechAvailable) {
      return "Speech recognition isn't compiled into this build. Rebuild with the speech module enabled (and mic permission).";
    }

    // Permission guidance if present
    if (micPermission === false) {
      return "Mic permission is off. Tap once and allow microphone access in the system prompt (or enable it in Settings).";
    }

    // Any runtime error
    if (stt?.error) {
      return `Speech error: ${String(stt.error)}`;
    }

    // Listening guidance
    if (stt?.isListening) {
      return uiReadyToSpeak
        ? "Now speak normally. Tap again to stop."
        : "Hold for a beat… don’t speak yet.";
    }

    return "Tip: wait for “Listening… go ahead” before speaking.";
  }, [speechAvailable, micPermission, stt?.error, stt?.isListening, uiReadyToSpeak]);

  const debugLine = useMemo(() => {
    if (!showDebugStatus) return null;

    const avail = speechAvailable ? "YES" : "NO";
    const perm =
      micPermission === null ? "UNKNOWN" : micPermission ? "GRANTED" : "DENIED";
    const listening = stt?.isListening ? "YES" : "NO";

    return `Speech: ${avail} • Mic: ${perm} • Listening: ${listening}`;
  }, [showDebugStatus, speechAvailable, micPermission, stt?.isListening]);

  const disabled = !speechAvailable;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.btn,
          stt?.isListening ? styles.btnListening : styles.btnIdle,
          uiStarting || stt?.isStarting ? styles.btnStarting : null,
          disabled ? styles.btnDisabled : null,
        ]}
      >
        <Text style={styles.btnText}>{label}</Text>
      </TouchableOpacity>

      {debugLine ? <Text style={styles.debug}>{debugLine}</Text> : null}

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
  btnStarting: { opacity: 0.92 },
  btnListening: { backgroundColor: theme.colors.danger },
  btnDisabled: { opacity: 0.55 },

  btnText: { color: "white", fontWeight: "900", fontSize: 16 },

  debug: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontWeight: "800",
    fontSize: 12,
  },

  helper: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
});
