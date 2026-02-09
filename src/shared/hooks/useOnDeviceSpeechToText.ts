// src/shared/hooks/useOnDeviceSpeechToText.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

type SpeechResult = {
  text: string;
  isFinal?: boolean;
};

type Return = {
  isAvailable: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
};

// IMPORTANT:
// We do a dynamic require so the app does not crash when the native module
// is not compiled into the current dev build.
function tryLoadSpeechModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-speech-recognition");
    return mod ?? null;
  } catch {
    return null;
  }
}

export function useOnDeviceSpeechToText(): Return {
  const mod = useMemo(() => tryLoadSpeechModule(), []);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isAvailable = useMemo(() => {
    // If module isn't present, it's not available.
    if (!mod) return false;
    // Some modules expose availability checks; keep it simple:
    return Platform.OS === "android" || Platform.OS === "ios";
  }, [mod]);

  const start = useCallback(async () => {
    if (!mod) {
      setError("Speech recognition is not available in this build.");
      return;
    }
    try {
      setError(null);
      setTranscript("");
      setIsListening(true);

      // Best-effort: support both APIs depending on the library version.
      if (typeof mod.startSpeechRecognitionAsync === "function") {
        await mod.startSpeechRecognitionAsync();
      } else if (mod.ExpoSpeechRecognitionModule?.start) {
        await mod.ExpoSpeechRecognitionModule.start();
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to start speech recognition");
      setIsListening(false);
    }
  }, [mod]);

  const stop = useCallback(async () => {
    if (!mod) {
      setIsListening(false);
      return;
    }
    try {
      if (typeof mod.stopSpeechRecognitionAsync === "function") {
        await mod.stopSpeechRecognitionAsync();
      } else if (mod.ExpoSpeechRecognitionModule?.stop) {
        await mod.ExpoSpeechRecognitionModule.stop();
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to stop speech recognition");
    } finally {
      setIsListening(false);
    }
  }, [mod]);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    setIsListening(false);
  }, []);

  // If the module supports events, listen; otherwise do nothing.
  useEffect(() => {
    if (!mod) return;

    // Different versions expose different hooks; guard everything.
    const useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
    if (typeof useSpeechRecognitionEvent !== "function") return;

    // We can't call hooks conditionally, so we do NOT use it here.
    // If your original implementation used the hook, prefer Path A (rebuild).
  }, [mod]);

  return {
    isAvailable,
    isListening,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}
