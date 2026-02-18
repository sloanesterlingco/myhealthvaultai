// src/shared/hooks/useOnDeviceSpeechToText.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeEventEmitter, Platform } from "react-native";
import { Audio } from "expo-av";

type Return = {
  isAvailable: boolean;
  hasPermission: boolean | null;
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
};

// IMPORTANT:
// dynamic require so app doesn't crash when native module isn't compiled into this build.
function tryLoadSpeechModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-speech-recognition");
    return mod ?? null;
  } catch {
    return null;
  }
}

function buildStartOptions() {
  return {
    lang: "en-US",
    interimResults: true,
    continuous: false,
    maxAlternatives: 1,
    requiresOnDeviceRecognition: false,
    punctuation: true,
  };
}

function coerceTranscript(payload: any): string {
  const t =
    payload?.transcript ??
    payload?.text ??
    payload?.value ??
    payload?.result?.text ??
    payload?.results?.[0]?.transcript ??
    payload?.results?.[0]?.text ??
    payload?.results?.[0] ??
    "";

  if (Array.isArray(t)) return String(t.join(" ")).trim();
  return String(t || "").trim();
}

export function useOnDeviceSpeechToText(): Return {
  const mod = useMemo(() => tryLoadSpeechModule(), []);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const listeningRef = useRef(false);

  const isAvailable = useMemo(() => {
    if (!mod) return false;
    return Platform.OS === "android" || Platform.OS === "ios";
  }, [mod]);

  const ensureMicPermission = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      setHasPermission(!!perm?.granted);
      if (!perm?.granted) {
        throw new Error("Microphone permission not granted");
      }
      return true;
    } catch (e: any) {
      setHasPermission(false);
      throw e;
    }
  }, []);

  // ---- Event wiring ----
  useEffect(() => {
    if (!mod) return;

    const nativeModule =
      mod?.ExpoSpeechRecognitionModule ||
      mod?.ExpoSpeechRecognition ||
      mod?.default ||
      null;

    if (!nativeModule) return;

    let subs: Array<{ remove: () => void }> = [];

    const trySubscribe = (eventName: string, handler: (e: any) => void) => {
      try {
        if (typeof nativeModule?.addListener === "function") {
          const sub = nativeModule.addListener(eventName, handler);
          if (sub?.remove) subs.push(sub);
          return true;
        }
      } catch {}

      try {
        const emitter = new NativeEventEmitter(nativeModule);
        const sub = emitter.addListener(eventName, handler);
        subs.push(sub);
        return true;
      } catch {}

      return false;
    };

    const onFinal = (e: any) => {
      const t = coerceTranscript(e);
      if (!t) return;
      setTranscript(t);
    };

    const onPartial = (e: any) => {
      const t = coerceTranscript(e);
      if (!t) return;
      setTranscript(t);
    };

    const onErr = (e: any) => {
      const msg =
        e?.message ||
        e?.error ||
        (typeof e === "string" ? e : "") ||
        "Speech recognition error";
      setError(String(msg));
      setIsListening(false);
      listeningRef.current = false;
    };

    const onEnd = () => {
      setIsListening(false);
      listeningRef.current = false;
    };

    trySubscribe("onSpeechResults", onFinal);
    trySubscribe("speechResults", onFinal);

    trySubscribe("onSpeechPartialResults", onPartial);
    trySubscribe("speechPartialResults", onPartial);

    trySubscribe("onSpeechError", onErr);
    trySubscribe("speechError", onErr);

    trySubscribe("onSpeechEnd", onEnd);
    trySubscribe("speechEnd", onEnd);

    return () => {
      subs.forEach((s) => {
        try {
          s.remove();
        } catch {}
      });
      subs = [];
    };
  }, [mod]);

  const start = useCallback(async () => {
    if (!mod) {
      setError("Speech recognition is not available in this build.");
      setIsListening(false);
      listeningRef.current = false;
      return;
    }

    if (listeningRef.current) return;

    try {
      setError(null);
      setTranscript("");

      await ensureMicPermission();

      setIsListening(true);
      listeningRef.current = true;

      const options = buildStartOptions();

      if (typeof mod.startSpeechRecognitionAsync === "function") {
        await mod.startSpeechRecognitionAsync(options);
        return;
      }

      if (typeof mod.ExpoSpeechRecognition?.start === "function") {
        await mod.ExpoSpeechRecognition.start(options);
        return;
      }

      if (typeof mod.ExpoSpeechRecognitionModule?.start === "function") {
        await mod.ExpoSpeechRecognitionModule.start(options);
        return;
      }

      if (typeof mod.start === "function") {
        await mod.start(options);
        return;
      }

      throw new Error("Speech recognition start() is not available in this module version.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to start speech recognition");
      setIsListening(false);
      listeningRef.current = false;
    }
  }, [mod, ensureMicPermission]);

  const stop = useCallback(async () => {
    try {
      if (!mod) return;

      if (typeof mod.stopSpeechRecognitionAsync === "function") {
        await mod.stopSpeechRecognitionAsync();
      } else if (typeof mod.ExpoSpeechRecognition?.stop === "function") {
        await mod.ExpoSpeechRecognition.stop();
      } else if (typeof mod.ExpoSpeechRecognitionModule?.stop === "function") {
        await mod.ExpoSpeechRecognitionModule.stop();
      } else if (typeof mod.stop === "function") {
        await mod.stop();
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to stop speech recognition");
    } finally {
      setIsListening(false);
      listeningRef.current = false;
    }
  }, [mod]);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    setIsListening(false);
    listeningRef.current = false;
  }, []);

  return {
    isAvailable,
    hasPermission,
    isListening,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}
