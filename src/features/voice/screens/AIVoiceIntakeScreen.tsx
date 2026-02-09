// src/features/voice/screens/AIVoiceIntakeScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { transcribeAudio } from "../services/voiceToTextService";

import { useHPI } from "../../hpi/hooks/useHPI";
import { generateHPIFromFreeText } from "../../aiAssistant/services/hpiIntakeService";

export default function AIVoiceIntakeScreen() {
  const { hpi, updateField } = useHPI();

  const {
    isRecording,
    audioUri,
    startRecording,
    stopRecording,
    reset,
  } = useVoiceRecorder();

  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTranscribe = async () => {
    if (!audioUri) return;

    setLoading(true);

    try {
      const text = await transcribeAudio(audioUri);
      setTranscript(text);

      // Feed into your existing HPI Intake AI
      const intake = await generateHPIFromFreeText({ freeText: text });

      (Object.keys(intake) as any[]).forEach((key) => {
        const value = (intake as any)[key];
        if (value !== undefined) {
          updateField(key, value);
        }
      });

      Alert.alert("Voice Intake Complete", "We updated your HPI using AI.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to transcribe audio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>AI Voice Intake</Text>

      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.micButtonActive]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.micText}>{isRecording ? "Stop" : "Speak"}</Text>
      </TouchableOpacity>

      {isRecording && <Text style={styles.recording}>Recording…</Text>}

      {audioUri && !loading && (
        <TouchableOpacity style={styles.processButton} onPress={handleTranscribe}>
          <Text style={styles.processText}>Transcribe & Update HPI</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      )}

      {transcript ? (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          <Text style={styles.transcript}>{transcript}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  micButton: {
    backgroundColor: "#333",
    paddingVertical: 24,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: "red",
  },
  micText: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  recording: {
    marginTop: 12,
    color: "red",
    fontWeight: "600",
    textAlign: "center",
  },
  processButton: {
    backgroundColor: "#0066cc",
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  processText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  transcript: {
    fontSize: 16,
    paddingVertical: 8,
    color: "#333",
  },
});
