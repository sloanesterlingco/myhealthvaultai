// src/features/patient/screens/AddLabResultScreen.tsx

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Modal } from "react-native";
import Screen from "../../../components/layout/Screen";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { theme } from "../../../theme";

import { useAddLabResult } from "../hooks/useAddLabResult";
import { useLabIntake } from "../hooks/useLabIntake";

type Props = {
  route?: { params?: { patientId?: string } };
};

export const AddLabResultScreen: React.FC<Props> = ({ route }) => {
  const patientId = route?.params?.patientId ?? "";

  const {
    lab,
    setField,
    saveLabResult,
    loading,
    error,
  } = useAddLabResult(patientId);

  const {
    submitLabFromChat,
    loading: aiLoading,
    error: aiError,
  } = useLabIntake(patientId);

  const [showAIModal, setShowAIModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  async function handleAIChatSend() {
    if (!chatMessage.trim()) return;

    const result = await submitLabFromChat(chatMessage);

    if (result.success) {
      setAiResponse("Lab result saved successfully!");
    } else {
      setAiResponse("There was a problem saving this lab result.");
    }

    setChatMessage("");
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Lab Result</Text>

        {/* AI-assisted intake */}
        <Button
          title="Use AI to Add Lab Result"
          onPress={() => setShowAIModal(true)}
        />

        {/* Manual form */}
        <View style={styles.form}>
          <Input
            label="Test Name"
            value={lab.name}
            onChangeText={(text: string) => setField("name", text)}
          />

          <Input
            label="Value"
            value={lab.value}
            onChangeText={(text: string) => setField("value", text)}
          />

          <Input
            label="Units"
            value={lab.units ?? ""}
            onChangeText={(text: string) => setField("units", text)}
          />

          <Input
            label="Reference Range"
            value={lab.referenceRange ?? ""}
            onChangeText={(text: string) => setField("referenceRange", text)}
          />

          <Input
            label="Date"
            value={lab.date ?? ""}
            onChangeText={(text: string) => setField("date", text)}
          />

          <Input
            label="Source (portal, lab company, clinic, etc.)"
            value={lab.source ?? ""}
            onChangeText={(text: string) => setField("source", text)}
          />

          <Input
            label="Notes"
            value={lab.notes ?? ""}
            multiline
            numberOfLines={3}
            onChangeText={(text: string) => setField("notes", text)}
          />

          <Button
            title={loading ? "Saving..." : "Save Manually"}
            onPress={saveLabResult}
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        {/* AI Chat Modal */}
        <Modal visible={showAIModal} animationType="slide">
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>AI Lab Intake</Text>

            <ScrollView style={styles.chatWindow}>
              <Text style={styles.aiResponse}>{aiResponse}</Text>
            </ScrollView>

            <Input
              label="Tell the AI what you see on your lab report"
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
    color: theme.colors.text,
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
