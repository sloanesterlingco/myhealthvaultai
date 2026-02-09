// src/features/aiAssistant/screens/ProviderSummaryScreen.tsx

import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Alert } from "react-native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import {
  patientExportService,
  generateProviderSummaryNote,
} from "../../../services/patientExportService";

export default function ProviderSummaryScreen() {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setNote(null);
      setGeneratedAt(null);

      const emrExport = await patientExportService.buildPatientExport();
      const chartNote = generateProviderSummaryNote(emrExport);

      setNote(chartNote);
      setGeneratedAt(emrExport.generatedAt);
    } catch (err) {
      console.error("Failed to generate provider summary note", err);
      Alert.alert("Error", "Sorry, we couldn’t generate your chart note. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.container}>
        <Text style={styles.title}>Provider Chart Note</Text>
        <Text style={styles.subtitle}>
          Generate a structured summary you can share with your doctor or paste into a telehealth visit.
        </Text>

        <Button
          label={loading ? "Generating..." : "Generate chart note"}
          onPress={handleGenerate}
          disabled={loading}
          style={{ marginTop: theme.spacing.md }}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Building your chart note…</Text>
          </View>
        )}

        {generatedAt && (
          <Text style={styles.generatedAt}>
            Generated at: {new Date(generatedAt).toLocaleString()}
          </Text>
        )}

        {note ? (
          <View style={styles.noteBox}>
            <ScrollView>
              <Text style={styles.noteText}>{note}</Text>
            </ScrollView>
          </View>
        ) : (
          !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Tap “Generate chart note” to create a provider-ready summary based on your current data.
              </Text>
            </View>
          )
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  generatedAt: {
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  noteBox: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    minHeight: 220,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  emptyState: {
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
