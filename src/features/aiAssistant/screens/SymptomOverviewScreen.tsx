// src/features/aiAssistant/screens/SymptomOverviewScreen.tsx

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import Screen from "../../../components/layout/Screen";
import Button from "../../../components/ui/Button";
import { theme } from "../../../theme";

import { auth } from "../../../lib/firebase";
import { getPatientProfile } from "../../patient/services/patientRepository";
import type { PatientProfile } from "../../patient/models/patientSchemas";
import { useSymptomPatterns } from "../hooks/useSymptomPatterns";

type Props = {
  route?: { params?: { patientId?: string } };
};

export const SymptomOverviewScreen: React.FC<Props> = ({ route }) => {
  const routePatientId = route?.params?.patientId;
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const { patterns, loading, error, loadPatterns } = useSymptomPatterns();

  // Load patient profile (from route or current auth user)
  useEffect(() => {
    async function load() {
      try {
        setProfileLoading(true);
        setProfileError(null);

        const user = auth.currentUser;
        const id = routePatientId ?? user?.uid;
        if (!id) {
          setProfileError("No patient selected.");
          return;
        }

        const p = await getPatientProfile(id);
        if (!p) {
          setProfileError("Patient profile not found.");
          return;
        }

        setProfile(p);
      } catch (err: any) {
        console.error("SymptomOverview profile load error:", err);
        setProfileError(err.message || "Failed to load patient data.");
      } finally {
        setProfileLoading(false);
      }
    }

    load();
  }, [routePatientId]);

  async function handleGeneratePatterns() {
    if (!profile) return;
    await loadPatterns(profile);
  }

  const isLoading = profileLoading || loading;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Symptom Pattern Overview</Text>

        <Text style={styles.subtitle}>
          This view summarizes how your symptoms, vitals, and labs fit together
          over time so your provider can see patterns quickly.
        </Text>

        <Button
          title={isLoading ? "Analyzing..." : "Analyze My Patterns"}
          onPress={handleGeneratePatterns}
        />

        {(profileError || error) && (
          <Text style={styles.error}>{profileError || error}</Text>
        )}

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Analyzing your data…</Text>
          </View>
        )}

        {!isLoading && patterns.length === 0 && !profileError && !error && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No patterns yet</Text>
            <Text style={styles.cardText}>
              Once you add more symptoms, vitals, and labs, this screen will
              highlight clinically useful patterns for you and your provider.
            </Text>
          </View>
        )}

        {patterns.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <View
                style={[
                  styles.badge,
                  p.severity === "low" && styles.badgeLow,
                  p.severity === "moderate" && styles.badgeModerate,
                  p.severity === "high" && styles.badgeHigh,
                ]}
              >
                <Text style={styles.badgeText}>
                  {p.severity.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.cardText}>{p.description}</Text>

            <Text style={styles.sectionLabel}>Supporting data</Text>
            {p.supportingData.map((s, i) => (
              <Text key={i} style={styles.bulletText}>
                • {s}
              </Text>
            ))}

            {p.possibleCauses.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Possible causes</Text>
                {p.possibleCauses.map((c, i) => (
                  <Text key={i} style={styles.bulletText}>
                    • {c}
                  </Text>
                ))}
              </>
            )}

            {p.recommendedQuestions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Questions to discuss</Text>
                {p.recommendedQuestions.map((q, i) => (
                  <Text key={i} style={styles.bulletText}>
                    • {q}
                  </Text>
                ))}
              </>
            )}

            {p.suggestedNextSteps.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Suggested next steps</Text>
                {p.suggestedNextSteps.map((s, i) => (
                  <Text key={i} style={styles.bulletText}>
                    • {s}
                  </Text>
                ))}
              </>
            )}
          </View>
        ))}
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
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: theme.spacing.lg,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  loadingText: {
    marginLeft: theme.spacing.sm,
    fontSize: 15,
  },
  error: {
    color: "red",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardText: {
    fontSize: 15,
    marginBottom: theme.spacing.sm,
  },
  sectionLabel: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontWeight: "600",
  },
  bulletText: {
    fontSize: 14,
    marginVertical: 1,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  badgeLow: {
    backgroundColor: "#e0f2fe",
  },
  badgeModerate: {
    backgroundColor: "#fef3c7",
  },
  badgeHigh: {
    backgroundColor: "#fee2e2",
  },
});
