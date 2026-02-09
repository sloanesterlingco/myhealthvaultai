// src/features/patient/screens/AddSymptomScreen.tsx

import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import { useAuth } from "../../providers/AuthProvider";
import { useAddSymptom } from "../hooks/useAddSymptom";
import { useSymptomIntake } from "../hooks/useSymptomIntake";
import type { SymptomEntry } from "../models/patientSchemas";

type Props = {
  route?: { params?: { patientId?: string } };
};

export default function AddSymptomScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const patientId = useMemo(() => {
    return route?.params?.patientId ?? user?.uid ?? "";
  }, [route?.params?.patientId, user?.uid]);

  const { symptom, setField, saveSymptom, loading, error } = useAddSymptom(patientId);

  const { submitSymptomFromChat, loading: aiLoading, error: aiError } = useSymptomIntake(patientId);

  const [showAIModal, setShowAIModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  const canSave = Boolean(patientId && (symptom.description ?? "").trim().length > 0 && !loading);

  async function handleAIChatSend() {
    if (!chatMessage.trim()) return;

    const result = await submitSymptomFromChat(chatMessage);

    if (result.success) {
      setAiResponse("✅ Symptom entry saved successfully.");
    } else {
      setAiResponse("⚠️ There was a problem saving this symptom.");
    }

    setChatMessage("");
  }

  const goNext = () => {
    navigation.navigate(MainRoutes.PAST_MEDICAL_HISTORY);
  };

  return (
    <ScreenContainer showHeader title="Add Symptom" canGoBack scroll>
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.blurb}>
          Start your chart here. Add at least one symptom, then continue to Past Medical History.
        </Text>

        <Button
          label="Use AI to Add Symptom"
          onPress={() => {
            setAiResponse("");
            setChatMessage("");
            setShowAIModal(true);
          }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Manual entry</Text>

        <Input
          label="Symptom Description"
          value={symptom.description ?? ""}
          onChangeText={(t: string) => setField("description", t)}
          multiline
        />

        <Input
          label="Intensity (0–10)"
          keyboardType="number-pad"
          value={typeof symptom.intensity === "number" ? String(symptom.intensity) : ""}
          onChangeText={(t: string) =>
            setField("intensity", t ? (Number(t) as SymptomEntry["intensity"]) : undefined)
          }
        />

        <Input label="Onset (when it started)" value={symptom.onset ?? ""} onChangeText={(t) => setField("onset", t)} />
        <Input label="Triggers (what makes it worse)" value={symptom.triggers ?? ""} onChangeText={(t) => setField("triggers", t)} />
        <Input label="Relief (what helps)" value={symptom.relief ?? ""} onChangeText={(t) => setField("relief", t)} />
        <Input label="Frequency (how often)" value={symptom.frequency ?? ""} onChangeText={(t) => setField("frequency", t)} />
        <Input label="Notes" value={symptom.notes ?? ""} onChangeText={(t) => setField("notes", t)} multiline />

        <View style={{ marginTop: 12 }}>
          <Button label={loading ? "Saving..." : "Save symptom"} onPress={saveSymptom} disabled={!canSave} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: 12 }}>
          <Button label="Next → Past Medical History" onPress={goNext} />
        </View>
      </Card>

      <Modal visible={showAIModal} animationType="slide">
        <ScreenContainer showHeader title="AI Symptom Intake" canGoBack scroll>
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.small}>
              Describe your symptom in one message. Example:{" "}
              <Text style={{ fontWeight: "900" }}>
                “Sharp right lower abdominal pain for 2 days with nausea.”
              </Text>
            </Text>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.aiResponse}>{aiResponse || "Ask the AI to create a symptom entry."}</Text>
          </Card>

          <Card>
            <Input
              label="Your message"
              value={chatMessage}
              onChangeText={(t) => setChatMessage(t)}
              multiline
            />

            <View style={{ marginTop: 12 }}>
              <Button label={aiLoading ? "Processing..." : "Send to AI"} onPress={handleAIChatSend} />
            </View>

            {aiError ? <Text style={styles.error}>{aiError}</Text> : null}

            <View style={{ marginTop: 12 }}>
              <Button label="Close" variant="secondary" onPress={() => setShowAIModal(false)} />
            </View>
          </Card>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  blurb: {
    color: theme.colors.textSecondary,
    fontWeight: "800",
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 10,
  },
  error: {
    marginTop: 10,
    color: theme.colors.danger ?? "red",
    fontWeight: "800",
  },
  small: {
    color: theme.colors.textSecondary,
    fontWeight: "800",
    lineHeight: 18,
  },
  aiResponse: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 18,
  },
});
