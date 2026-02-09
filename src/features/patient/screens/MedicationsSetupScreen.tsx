import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";

import { auth } from "../../../lib/firebase";
import { addMedication, listMedications } from "../services/patientRepository";
import { MainRoutes } from "../../../navigation/types";

import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";

export default function MedicationsSetupScreen({ navigation }: any) {
  const uid = auth.currentUser?.uid ?? null;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [reason, setReason] = useState("");
  const [issues, setIssues] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [items]);

  const syncToEmr = useCallback((meds: any[]) => {
    try {
      patientAggregationService.updatePatientData?.({
        medications: Array.isArray(meds) ? meds : [],
      } as any);
      patientAggregationService.persistToFirestore?.();
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await listMedications(uid);
      const list = data ?? [];
      setItems(list);
      syncToEmr(list);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load medications.");
    } finally {
      setLoading(false);
    }
  }, [uid, syncToEmr]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setDose("");
    setFrequency("");
    setReason("");
    setIssues("");
  };

  const canSave = !!uid && name.trim().length > 0;

  const onAdd = async () => {
    if (!uid) return;

    if (!name.trim()) {
      Alert.alert("Missing field", "Please enter a medication name.");
      return;
    }

    setLoading(true);
    try {
      await addMedication(uid, {
        name: name.trim(),
        dose: dose.trim() || undefined,
        frequency: frequency.trim() || undefined,
        reason: reason.trim() || undefined,
        issues: issues.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      resetForm();
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to save medication.");
    } finally {
      setLoading(false);
    }
  };

  // After meds, you can either go to ChartSetupReview or Dashboard.
  // Keeping V1 simple: send them back to chart setup intro so they can choose next.
  const goNext = () => {
    navigation.navigate(MainRoutes.CHART_SETUP_INTRO);
  };

  return (
    <ScreenContainer showHeader title="Medications" canGoBack scroll={false}>
      {!uid ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Sign in to add medications.</Text>
        </View>
      ) : (
        <View style={styles.wrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add a medication</Text>

            <Input
              label="Medication"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Metformin"
              containerStyle={styles.input}
            />

            <Input
              label="Dose (optional)"
              value={dose}
              onChangeText={setDose}
              placeholder="e.g. 500 mg"
              containerStyle={styles.input}
            />

            <Input
              label="Frequency (optional)"
              value={frequency}
              onChangeText={setFrequency}
              placeholder="e.g. Twice daily"
              containerStyle={styles.input}
            />

            <Input
              label="Reason (optional)"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Diabetes"
              containerStyle={styles.input}
            />

            <Input
              label="Issues / side effects (optional)"
              value={issues}
              onChangeText={setIssues}
              placeholder="e.g. Nausea"
              containerStyle={styles.input}
            />

            <Button
              label={loading ? "Saving..." : "Add medication"}
              onPress={onAdd}
              disabled={!canSave || loading}
              loading={loading}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button label="Continue" onPress={goNext} />
          </View>

          <Text style={styles.sectionTitle}>Saved medications</Text>

          <FlatList
            data={sorted}
            keyExtractor={(item, idx) => item.id ?? `${item.name}-${idx}`}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            ListEmptyComponent={<Text style={styles.empty}>No medications yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.dose ? item.dose : "Dose: —"}
                  {item.frequency ? ` • ${item.frequency}` : ""}
                </Text>
                {!!item.reason && <Text style={styles.itemNotes}>Reason: {item.reason}</Text>}
                {!!item.issues && <Text style={styles.itemNotes}>Issues: {item.issues}</Text>}
              </View>
            )}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.lg },
  centerText: { color: theme.colors.textSecondary },
  wrap: { paddingTop: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
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
  sectionTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.text, marginBottom: theme.spacing.sm },
  empty: { color: theme.colors.textSecondary, paddingTop: theme.spacing.sm },
  itemCard: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.text, marginBottom: 4 },
  itemMeta: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6 },
  itemNotes: { fontSize: 13, color: theme.colors.text },
});
