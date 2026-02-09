import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";

import { auth } from "../../../lib/firebase";
import { MainRoutes } from "../../../navigation/types";

import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";
import { socialHistoryService } from "../../socialHistory/services/socialHistoryService";

export default function SocialHistoryScreen({ navigation }: any) {
  const uid = auth.currentUser?.uid ?? null;

  const [loading, setLoading] = useState(false);

  const [tobacco, setTobacco] = useState("");
  const [alcohol, setAlcohol] = useState("");
  const [drugs, setDrugs] = useState("");
  const [occupation, setOccupation] = useState("");
  const [exercise, setExercise] = useState("");
  const [notes, setNotes] = useState("");

  const syncToEmr = useCallback((obj: any) => {
    try {
      patientAggregationService.updatePatientData?.({
        socialHistory: obj ?? {},
      } as any);
      patientAggregationService.persistToFirestore?.();
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await socialHistoryService.getSocialHistory();
      const sh = data ?? {};

      setTobacco(String(sh.tobacco ?? ""));
      setAlcohol(String(sh.alcohol ?? ""));
      setDrugs(String(sh.drugs ?? ""));
      setOccupation(String(sh.occupation ?? ""));
      setExercise(String(sh.exercise ?? ""));
      setNotes(String(sh.notes ?? ""));

      syncToEmr(sh);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load social history.");
    } finally {
      setLoading(false);
    }
  }, [uid, syncToEmr]);

  useEffect(() => {
    load();
  }, [load]);

  const hasAny = useMemo(() => {
    const vals = [tobacco, alcohol, drugs, occupation, exercise, notes].map((v) => v.trim());
    return vals.some((v) => v.length > 0);
  }, [tobacco, alcohol, drugs, occupation, exercise, notes]);

  const onSave = async () => {
    if (!uid) return;

    setLoading(true);
    try {
      const payload = {
        tobacco: tobacco.trim() || undefined,
        alcohol: alcohol.trim() || undefined,
        drugs: drugs.trim() || undefined,
        occupation: occupation.trim() || undefined,
        exercise: exercise.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: Date.now(),
      };

      await socialHistoryService.updateSocialHistory(payload);
      syncToEmr(payload);
      Alert.alert("Saved", "Social history updated.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to save social history.");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    navigation.navigate(MainRoutes.ALLERGIES_SETUP);
  };

  return (
    <ScreenContainer title="Social History" headerCanGoBack scroll>
      {!uid ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Sign in to add social history.</Text>
        </View>
      ) : (
        <View style={styles.wrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Social history</Text>

            <Input
              label="Tobacco"
              value={tobacco}
              onChangeText={setTobacco}
              placeholder="e.g. Never / Former / 1 ppd"
              containerStyle={styles.input}
            />

            <Input
              label="Alcohol"
              value={alcohol}
              onChangeText={setAlcohol}
              placeholder="e.g. None / Social / Daily"
              containerStyle={styles.input}
            />

            <Input
              label="Drugs"
              value={drugs}
              onChangeText={setDrugs}
              placeholder="e.g. None"
              containerStyle={styles.input}
            />

            <Input
              label="Occupation"
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g. Nurse"
              containerStyle={styles.input}
            />

            <Input
              label="Exercise"
              value={exercise}
              onChangeText={setExercise}
              placeholder="e.g. 3x/week"
              containerStyle={styles.input}
            />

            <Input
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              containerStyle={styles.input}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />

            <Button
              label={loading ? "Saving..." : "Save social history"}
              onPress={onSave}
              disabled={loading || !hasAny}
              loading={loading}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button label="Continue" onPress={goNext} />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  centerText: { color: theme.colors.textSecondary },
  wrap: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text, marginBottom: theme.spacing.md },
  input: { marginBottom: theme.spacing.md },
  actionsRow: { marginBottom: theme.spacing.lg },
});
