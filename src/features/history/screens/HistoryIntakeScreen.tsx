// src/features/history/screens/HistoryIntakeScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";

import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

interface NormalizedCode {
  system: string;      // ICD-10 | CPT | LOINC
  code: string;
  description: string;
  confidence: number;
}

interface NormalizedResult {
  category: "condition" | "procedure" | "imaging" | "symptom";
  normalizedText: string;
  codes: NormalizedCode[];
}

export default function HistoryIntakeScreen() {
  const navigation = useNavigation<any>();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NormalizedResult | null>(null);

  const handleNormalize = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/ai/normalize-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const json = await res.json();
      setResult(json.result);
    } catch (error) {
      console.error("Normalization error:", error);
      alert("Unable to interpret entry. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;

    // 🚀 TODO: Plug into your Firestore service
    // saveHistoryEntry(result);
    alert("Added to your medical history!");

    navigation.goBack();
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader title="Add to Medical History" />

      <Card style={styles.entryCard}>
        <Text style={styles.label}>Describe a condition, surgery, or symptom</Text>

        <TextInput
          placeholder="Example: high blood pressure, gallbladder removed…"
          placeholderTextColor={theme.colors.textMuted}
          value={text}
          onChangeText={setText}
          style={styles.input}
          multiline
        />

        <Button
          label="Interpret with AI"
          onPress={handleNormalize}
          disabled={loading}
        />

        {loading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 10 }} />}
      </Card>

      {/* RESULT */}
      {result && (
        <Card style={styles.resultCard}>
          <Text style={styles.resultHeader}>
            {result.category === "procedure"
              ? "Detected Procedure"
              : result.category === "condition"
              ? "Detected Condition"
              : result.category === "symptom"
              ? "Detected Symptom"
              : "Detected Imaging Study"}
          </Text>

          <Text style={styles.normalized}>{result.normalizedText}</Text>

          <View style={styles.divider} />

          <Text style={styles.codeHeader}>Suggested Codes</Text>

          <FlatList
            data={result.codes}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.codeRow}>
                <View>
                  <Text style={styles.codeSystem}>{item.system}</Text>
                  <Text style={styles.codeValue}>
                    {item.code} — {item.description}
                  </Text>
                </View>

                <Text style={styles.confidence}>
                  {(item.confidence * 100).toFixed(0)}%
                </Text>
              </TouchableOpacity>
            )}
          />

          <Button label="Add to History" onPress={handleSave} />
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing.radius,
    padding: theme.spacing.md,
    minHeight: 60,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  resultCard: {
    marginTop: theme.spacing.lg,
  },
  resultHeader: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  normalized: {
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  codeHeader: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  codeRow: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  codeSystem: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  codeValue: {
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 2,
  },
  confidence: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -10 }],
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
