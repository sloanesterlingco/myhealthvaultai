// src/features/medications/screens/AddMedicationsScreen.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";

import { useAddMedication } from "../hooks/useAddMedication";

import { auth } from "../../../lib/firebase";
import { getPatientProfile } from "../../patient/services/patientRepository";

// ⚠️ We import the medication rules map directly to access contraindications.
// Types may not include contraindications yet, so we treat rules as "any".
import { medicationRulesByGeneric } from "../services/medicationRules";

type ContraHit = {
  severity: "red" | "yellow";
  title: string;
  detail: string;
};

function norm(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Very simple "generic key" mapping for V1.
// If user enters "Lisinopril 10mg", we try first token: "lisinopril".
function deriveGenericKey(name: string): string {
  const n = norm(name);
  if (!n) return "";
  // Remove punctuation that commonly appears in med names
  const cleaned = n.replace(/[(),]/g, " ");
  const first = cleaned.split(" ").filter(Boolean)[0] ?? "";
  return first;
}

// Check if patient conditions contain a condition keyword.
// We do loose matching both ways to survive slightly different naming.
function conditionMatches(patientConditions: string[], key: string): boolean {
  const k = norm(key);
  if (!k) return false;
  return patientConditions.some((c) => {
    const cc = norm(c);
    return cc === k || cc.includes(k) || k.includes(cc);
  });
}

export default function AddMedicationsScreen() {
  const { medication, setField, saveMedication, saving } = useAddMedication();

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Minimal snapshot for contraindications (V1)
  const [patientConditions, setPatientConditions] = useState<string[]>([]);
  const [currentMedNames, setCurrentMedNames] = useState<string[]>([]);

  // Prevent showing repeated alerts if user taps Save multiple times quickly
  const alertGuardRef = useRef(false);

  // Load patient profile once (conditions + meds)
  useEffect(() => {
    const run = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      setProfileLoading(true);
      setProfileError(null);

      try {
        const profile: any = await getPatientProfile(uid);
        const conditions =
          Array.isArray(profile?.conditions) ? profile.conditions : [];
        const meds =
          Array.isArray(profile?.medications) ? profile.medications : [];

        // Conditions may be strings or objects depending on schema history
        const conditionStrings: string[] = conditions
          .map((c: any) => {
            if (typeof c === "string") return c;
            return c?.name ?? c?.condition ?? c?.title ?? "";
          })
          .map((x: any) => String(x ?? "").trim())
          .filter(Boolean);

        const medStrings: string[] = meds
          .map((m: any) => {
            if (typeof m === "string") return m;
            return m?.name ?? m?.genericName ?? m?.title ?? "";
          })
          .map((x: any) => String(x ?? "").trim())
          .filter(Boolean);

        setPatientConditions(conditionStrings);
        setCurrentMedNames(medStrings);
      } catch (e: any) {
        setProfileError(
          e?.message ??
            "Unable to load your existing chart data for safety checks."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    run();
  }, []);

  // Compute contraindication + conflict hits as user types med name
  const safety = useMemo(() => {
    const name = medication?.name ?? "";
    const genericKey = deriveGenericKey(name);

    const rule: any = genericKey ? (medicationRulesByGeneric as any)[genericKey] : null;

    const hits: ContraHit[] = [];

    // Duplicate / already-taking check
    if (genericKey) {
      const alreadyOn = currentMedNames.some((m) => {
        const mk = deriveGenericKey(m);
        return mk && mk === genericKey;
      });
      if (alreadyOn) {
        hits.push({
          severity: "yellow",
          title: "Possible duplicate medication",
          detail:
            "It looks like you may already be taking a medication with the same name. Verify you’re not entering a duplicate.",
        });
      }
    }

    // Contraindications from rules (condition-based)
    // Rules appear to include:
    // contraindications: [{ condition: string, description: string, severity: "red"|"yellow" }]
    const contraindications = Array.isArray(rule?.contraindications)
      ? rule.contraindications
      : [];

    if (contraindications.length > 0 && patientConditions.length > 0) {
      for (const c of contraindications) {
        const condKey = c?.condition ?? "";
        const descr = c?.description ?? "Possible contraindication.";

        if (conditionMatches(patientConditions, condKey)) {
          const sev: "red" | "yellow" =
            c?.severity === "red" ? "red" : "yellow";

          hits.push({
            severity: sev,
            title: sev === "red" ? "Contraindication detected" : "Caution",
            detail: descr,
          });
        }
      }
    }

    // If we have a known rule but no condition match, we can still show general monitoring notes
    const hasRule = !!rule;
    const notes = typeof rule?.notes === "string" ? rule.notes : "";

    const reds = hits.filter((h) => h.severity === "red");
    const yellows = hits.filter((h) => h.severity === "yellow");

    return {
      genericKey,
      hasRule,
      displayName: rule?.displayName ?? "",
      notes,
      reds,
      yellows,
      all: hits,
    };
  }, [medication?.name, currentMedNames, patientConditions]);

  const onSaveWithSafety = async () => {
    if (saving) return;

    // If we can't load profile, still allow save — but warn the user.
    if (profileError) {
      Alert.alert(
        "Safety check unavailable",
        "We couldn't load your chart data for contraindication checks. You can still save this medication, but please verify with your clinician or pharmacist.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save anyway", style: "destructive", onPress: () => saveMedication() },
        ]
      );
      return;
    }

    // If we’re still loading profile, avoid saving blind
    if (profileLoading) {
      Alert.alert(
        "One moment",
        "Loading your chart data for safety checks. Try again in a second."
      );
      return;
    }

    // Hard warning on RED contraindication hits
    if (safety.reds.length > 0) {
      if (alertGuardRef.current) return;
      alertGuardRef.current = true;

      const msg =
        safety.reds.map((h) => `• ${h.detail}`).join("\n\n") +
        "\n\nThis doesn’t replace medical advice. Consider contacting your clinician/pharmacist before starting this medication.";

      Alert.alert("Possible contraindication", msg, [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            alertGuardRef.current = false;
          },
        },
        {
          text: "Save anyway",
          style: "destructive",
          onPress: async () => {
            alertGuardRef.current = false;
            await saveMedication();
          },
        },
      ]);
      return;
    }

    // Soft warning on YELLOW hits
    if (safety.yellows.length > 0) {
      if (alertGuardRef.current) return;
      alertGuardRef.current = true;

      const msg =
        safety.yellows.map((h) => `• ${h.detail}`).join("\n\n") +
        "\n\nIf you’re unsure, confirm with your clinician or pharmacist.";

      Alert.alert("Medication caution", msg, [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            alertGuardRef.current = false;
          },
        },
        {
          text: "Save",
          onPress: async () => {
            alertGuardRef.current = false;
            await saveMedication();
          },
        },
      ]);
      return;
    }

    // No issues → save normally
    await saveMedication();
  };

  const safetyTitle = useMemo(() => {
    if (!medication?.name?.trim()) return "Safety check";
    if (profileLoading) return "Safety check (loading chart data…)";

    if (profileError) return "Safety check (unavailable)";
    if (safety.reds.length > 0) return "Safety check: CONTRAINDICATION";
    if (safety.yellows.length > 0) return "Safety check: CAUTION";
    if (safety.hasRule) return "Safety check: OK";
    return "Safety check: No rule found";
  }, [medication?.name, profileLoading, profileError, safety.reds.length, safety.yellows.length, safety.hasRule]);

  const safetySubtitle = useMemo(() => {
    if (!medication?.name?.trim()) return "Enter a medication name to run checks.";
    if (profileLoading) return "Loading your existing conditions and medications…";
    if (profileError) return "We couldn't load your chart data to run contraindication checks.";
    if (safety.reds.length > 0)
      return "A condition-based contraindication may exist based on your chart.";
    if (safety.yellows.length > 0)
      return "Some caution flags were detected. Review before saving.";
    if (safety.hasRule)
      return "No contraindications detected from your chart conditions. Monitoring notes may apply.";
    return "No rules exist for this medication yet. Consider confirming with your pharmacist/clinician.";
  }, [medication?.name, profileLoading, profileError, safety.reds.length, safety.yellows.length, safety.hasRule]);

  return (
    <ScreenContainer
      scroll
      title="Add Medication"
      headerCanGoBack
      contentStyle={styles.container}
    >
      <Text style={styles.title}>Add Medication</Text>

      {/* Safety Card */}
      <Card style={styles.safetyCard}>
        <Text
          style={[
            styles.safetyTitle,
            safety.reds.length > 0 ? styles.safetyRed : null,
            safety.yellows.length > 0 && safety.reds.length === 0
              ? styles.safetyYellow
              : null,
          ]}
        >
          {safetyTitle}
        </Text>

        <Text style={styles.safetySub}>{safetySubtitle}</Text>

        {profileLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Checking chart…</Text>
          </View>
        ) : null}

        {profileError ? (
          <Text style={styles.safetyError}>{profileError}</Text>
        ) : null}

        {!profileLoading && !profileError && medication?.name?.trim() ? (
          <>
            {safety.all.length > 0 ? (
              <View style={{ marginTop: theme.spacing.sm }}>
                {safety.all.map((h, idx) => (
                  <Text
                    key={`${idx}-${h.title}`}
                    style={[
                      styles.hit,
                      h.severity === "red" ? styles.hitRed : styles.hitYellow,
                    ]}
                  >
                    • {h.detail}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.okText}>No contraindications detected.</Text>
            )}

            {safety.notes ? (
              <Text style={styles.notesText}>Note: {safety.notes}</Text>
            ) : null}
          </>
        ) : null}
      </Card>

      <View style={styles.form}>
        <Input
          label="Name"
          value={medication.name}
          onChangeText={(t: string) => setField("name", t)}
          placeholder="e.g. Lisinopril"
        />

        <Input
          label="Dosage"
          value={medication.dosage}
          placeholder="e.g. 10mg"
          onChangeText={(t: string) => setField("dosage", t)}
        />

        <Input
          label="Frequency"
          value={medication.frequency}
          placeholder="e.g. Once daily"
          onChangeText={(t: string) => setField("frequency", t)}
        />

        <Input
          label="Start Date"
          value={medication.startDate}
          placeholder="YYYY-MM-DD"
          onChangeText={(t: string) => setField("startDate", t)}
        />

        <Input
          label="End Date"
          value={medication.endDate}
          placeholder="YYYY-MM-DD or leave blank"
          onChangeText={(t: string) => setField("endDate", t)}
        />

        <Input
          label="Notes"
          value={medication.notes}
          multiline
          numberOfLines={4}
          onChangeText={(t: string) => setField("notes", t)}
        />

        <Button
          label={saving ? "Saving..." : "Save Medication"}
          onPress={onSaveWithSafety}
          disabled={saving}
          loading={saving}
        />
      </View>

      <Text style={styles.disclaimer}>
        Disclaimer: Medication safety checks are informational and may be incomplete. Always confirm
        medication changes with your clinician or pharmacist.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  safetyCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  safetyRed: { color: theme.colors.danger },
  safetyYellow: { color: "#B45309" }, // amber-ish; avoid changing theme unless you want
  safetySub: {
    marginTop: 6,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  safetyError: {
    marginTop: 10,
    fontWeight: "800",
    color: theme.colors.danger,
  },
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontWeight: "800",
    color: theme.colors.textSecondary,
  },

  hit: {
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 18,
  },
  hitRed: { color: theme.colors.danger },
  hitYellow: { color: "#B45309" },

  okText: {
    marginTop: theme.spacing.sm,
    fontWeight: "900",
    color: theme.colors.text,
  },
  notesText: {
    marginTop: theme.spacing.sm,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },

  form: {
    gap: theme.spacing.md,
  },

  disclaimer: {
    marginTop: theme.spacing.lg,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
  },
});
