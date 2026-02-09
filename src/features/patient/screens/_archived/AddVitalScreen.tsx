// src/features/patient/screens/AddVitalScreen.tsx

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Modal } from "react-native";
import Screen from "../../../components/layout/Screen";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { theme } from "../../../theme";

import { useAddVital } from "../hooks/useAddVital";
import { useVitalIntake } from "../hooks/useVitalIntake";
import type { Vital } from "../models/patientSchemas";

type Props = {
  route?: { params?: { patientId?: string } };
};

export const AddVitalScreen: React.FC<Props> = ({ route }) => {
  const patientId = route?.params?.patientId ?? "";

  const { vital, setField, saveVital, loading, error } =
    useAddVital(patientId);

  const {
    submitVitalFromChat,
    loading: aiLoading,
    error: aiError,
  } = useVitalIntake(patientId);

  const [showAIModal, setShowAIModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  async function handleAIChatSend() {
    if (!chatMessage.trim()) return;

    const result = await submitVitalFromChat(chatMessage);

    if (result.success) {
      setAiResponse("Vital recorded successfully!");
    } else {
      setAiResponse("There was a problem saving this vital.");
    }

    setChatMessage("");
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Vital</Text>

        <Button
          title="Use AI to Add Vital"
          onPress={() => setShowAIModal(true)}
        />

        <View style={styles.form}>
          <Input
            label='Type (e.g. "bloodPressure", "heartRate")'
            value={vital.type}
            onChangeText={(text: string) =>
              // Cast the free-text input into the union type.
              // In the future you might swap this for a dropdown.
              setField(
                "type",
                text as Vital["type"]
              )
            }
          />

          <Input
            label="Value"
            value={vital.value}
            onChangeText={(text: string) => setField("value", text)}
          />

          <Input
            label="Units (e.g. bpm, mmHg, lb)"
            value={vital.units ?? ""}
            onChangeText={(text: string) => setField("units", text)}
          />

          <Input
            label="Label (e.g. morning BP)"
            value={vital.label ?? ""}
            onChangeText={(text: string) => setField("label", text)}
          />

          <Input
            label="Date"
            value={vital.date ?? ""}
            onChangeText={(text: string) => setField("date", text)}
          />

          <Button
            title={loading ? "Saving..." : "Save Manually"}
            onPress={saveVital}
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Modal visible={showAIModal} animationType="slide">
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>AI Vital Intake</Text>

            <ScrollView style={styles.chatWindow}>
              <Text style={styles.aiResponse}>{aiResponse}</Text>
            </ScrollView>

            <Input
              label="Tell the AI your measurement"
              value={chatMessage}
              onChangeText={(text: string) => setChatMessage(text)}
            />

            <Button
              title={aiLoading ? "Processing..." : "Send to AI"}
              onPress={handleAIChatSend}
            />

            {aiError && <Text style={styles.error}>{aiError}</Text>}

            <Button
              title="Close"
              variant="secondary"
              onPress={() => setShowAIModal(false)}
            />
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  form: {
    gap: theme.spacing.md,
  },
  modalContainer: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
  },
  chatWindow: {
    flex: 1,
    marginBottom: theme.spacing.md,
  },
  aiResponse: {
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  error: {
    color: "red",
    marginTop: theme.spacing.sm,
  },
});
