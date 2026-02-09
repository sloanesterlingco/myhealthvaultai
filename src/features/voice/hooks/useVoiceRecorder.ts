// src/features/voice/hooks/useVoiceRecorder.ts

import { useCallback, useRef, useState } from "react";
import { Audio } from "expo-av";

const SILENCE_WINDOW_MS = 3000;
const MONITOR_INTERVAL_MS = 500;
const SILENCE_THRESHOLD_DB = -45;

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSoundTimeRef = useRef<number | null>(null);

  const stopMonitor = () => {
    if (monitorRef.current) {
      clearInterval(monitorRef.current);
      monitorRef.current = null;
    }
  };

  const internalStop = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return null;

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI() ?? null;

      recordingRef.current = null;
      setIsRecording(false);
      setAudioUri(uri);
      stopMonitor();

      return uri;
    } catch (err) {
      console.error("stopRecording error", err);
      stopMonitor();
      return null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        alert("Microphone permission required.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setAudioUri(null);

      lastSoundTimeRef.current = Date.now();

      monitorRef.current = setInterval(async () => {
        const r = recordingRef.current;
        if (!r) {
          stopMonitor();
          return;
        }

        try {
          const status: any = await r.getStatusAsync();

          if (!status.isRecording) {
            stopMonitor();
            return;
          }

          const metering = status.metering as number | undefined;

          if (typeof metering === "number") {
            const now = Date.now();

            if (metering > SILENCE_THRESHOLD_DB) {
              lastSoundTimeRef.current = now;
            }

            if (
              lastSoundTimeRef.current &&
              now - lastSoundTimeRef.current > SILENCE_WINDOW_MS
            ) {
              console.log("Auto-stop: silence detected");
              await internalStop();
            }
          }
        } catch (err) {
          console.error("Metering error", err);
        }
      }, MONITOR_INTERVAL_MS);
    } catch (err) {
      console.error("startRecording error", err);
    }
  }, [internalStop]);

  return {
    isRecording,
    audioUri,
    startRecording,
    stopRecording: internalStop,
    reset: () => {
      stopMonitor();
      recordingRef.current = null;
      setIsRecording(false);
      setAudioUri(null);
    },
  };
}
