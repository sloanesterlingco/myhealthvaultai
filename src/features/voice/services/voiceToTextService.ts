import { Audio } from "expo-av";

export type VoiceCapture = {
  recording: Audio.Recording;
  startedAtMs: number;
};

class VoiceToTextService {
  private active: Audio.Recording | null = null;

  async startCapture(): Promise<VoiceCapture> {
    if (this.active) {
      try {
        await this.active.stopAndUnloadAsync();
      } catch {}
      this.active = null;
    }

    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      throw new Error("Microphone permission not granted");
    }

    // ✅ Keep this minimal for cross-version compatibility
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    const recording = new Audio.Recording();

    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

    // ✅ CRITICAL: do not consider “listening” until this resolves
    await recording.startAsync();

    this.active = recording;

    return { recording, startedAtMs: Date.now() };
  }

  async stopCapture(): Promise<{ uri: string; durationMs: number }> {
    const rec = this.active;
    if (!rec) throw new Error("No active recording");

    this.active = null;

    try {
      await rec.stopAndUnloadAsync();
    } catch (e) {
      console.warn("stopAndUnloadAsync failed", e);
    }

    const uri = rec.getURI();
    if (!uri) throw new Error("Recording URI missing");

    const status = await rec.getStatusAsync();
    const durationMs =
      typeof (status as any)?.durationMillis === "number"
        ? (status as any).durationMillis
        : 0;

    return { uri, durationMs };
  }

  async cancelCapture(): Promise<void> {
    const rec = this.active;
    this.active = null;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
    } catch {}
  }
}

export const voiceToTextService = new VoiceToTextService();
