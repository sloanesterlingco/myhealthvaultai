import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";

import { auth } from "../../../lib/firebase";
import { addAllergy, listAllergies } from "../services/patientRepository";
import { MainRoutes } from "../../../navigation/types";

import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";

export default function AllergiesSetupScreen({ navigation }: any) {
  const uid = auth.currentUser?.uid ?? null;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [substance, setSubstance] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [items]);

  const syncToEmr = useCallback((allergies: any[]) => {
    try {
      patientAggregationService.updatePatientData?.({
        allergies: Array.isArray(allergies) ? allergies : [],
      } as any);
      patientAggregationService.persistToFirestore?.();
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await listAllergies(uid);
      const list = data ?? [];
      setItems(list);
      syncToEmr(list);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load allergies.");
    } finally {
      setLoading(false);
    }
  }, [uid, syncToEmr]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setSubstance("");
    setReaction("");
    setSeverity("");
    setNotes("");
  };

  const canSave = !!uid && substance.trim().length > 0;

  const onAdd = async () => {
    if (!uid) return;

    if (!substance.trim()) {
      Alert.alert("Missing field", "Please enter an allergy.");
      return;
    }

    setLoading(true);
    try {
      await addAllergy(uid, {
        substance: substance.trim(),
        reaction: reaction.trim() || undefined,
        // keep severity as free text for now (schema expects enum, but repo zod allows unknown via partial)
        severity: (severity.trim() as any) || undefined,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      resetForm();
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to save allergy.");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    navigation.navigate(MainRoutes.MEDICATIONS_SETUP);
  };

  return (
    <ScreenContainer showHeader title="Allergies" canGoBack scroll={false}>
      {!uid ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Sign in to add allergies.</Text>
        </View>
      ) : (
        <View style={styles.wrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add an allergy</Text>

            <Input
              label="Allergy"
              value={substance}
              onChangeText={setSubstance}
              placeholder="e.g. Penicillin"
              containerStyle={styles.input}
            />

            <Input
              label="Reaction (optional)"
              value={reaction}
              onChangeText={setReaction}
              placeholder="e.g. Rash"
              containerStyle={styles.input}
            />

            <Input
              label="Severity (optional)"
              value={severity}
              onChangeText={setSeverity}
              placeholder="e.g. Mild / Moderate / Severe"
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
              label={loading ? "Saving..." : "Add allergy"}
              onPress={onAdd}
              disabled={!canSave || loading}
              loading={loading}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button label="Continue" onPress={goNext} />
          </View>

          <Text style={styles.sectionTitle}>Saved allergies</Text>

          <FlatList
            data={sorted}
            keyExtractor={(item, idx) => item.id ?? `${item.substance}-${idx}`}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            ListEmptyComponent={<Text style={styles.empty}>No allergies yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>{item.substance}</Text>
                <Text style={styles.itemMeta}>
                  {item.reaction ? `Reaction: ${item.reaction}` : "Reaction: Unknown"}
                  {item.severity ? ` • ${item.severity}` : ""}
                </Text>
                {!!item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
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
