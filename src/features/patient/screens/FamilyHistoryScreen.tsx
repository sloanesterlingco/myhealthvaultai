import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";

import { auth } from "../../../lib/firebase";
import { addFamilyHistoryItem, listFamilyHistory } from "../services/patientRepository";
import { MainRoutes } from "../../../navigation/types";

import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";

export default function FamilyHistoryScreen({ navigation }: any) {
  const uid = auth.currentUser?.uid ?? null;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [relative, setRelative] = useState("");
  const [condition, setCondition] = useState("");
  const [ageOfOnset, setAgeOfOnset] = useState("");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [items]);

  const syncToEmr = useCallback((familyHistory: any[]) => {
    try {
      patientAggregationService.updatePatientData?.({
        familyHistory: Array.isArray(familyHistory) ? familyHistory : [],
      } as any);
      patientAggregationService.persistToFirestore?.();
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await listFamilyHistory(uid);
      const list = data ?? [];
      setItems(list);
      syncToEmr(list);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load family history.");
    } finally {
      setLoading(false);
    }
  }, [uid, syncToEmr]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setRelative("");
    setCondition("");
    setAgeOfOnset("");
    setNotes("");
  };

  const canSave = !!uid && relative.trim().length > 0 && condition.trim().length > 0;

  const onAdd = async () => {
    if (!uid) return;

    if (!relative.trim() || !condition.trim()) {
      Alert.alert("Missing fields", "Please enter relative + condition.");
      return;
    }

    setLoading(true);
    try {
      await addFamilyHistoryItem(uid, {
        relative: relative.trim(),
        condition: condition.trim(),
        ageOfOnset: ageOfOnset.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      resetForm();
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to save family history item.");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    navigation.navigate(MainRoutes.SOCIAL_HISTORY);
  };

  return (
    <ScreenContainer title="Family History" headerCanGoBack scroll={false}>
      {!uid ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Sign in to add family history.</Text>
        </View>
      ) : (
        <View style={styles.wrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add a family history item</Text>

            <Input
              label="Relative"
              value={relative}
              onChangeText={setRelative}
              placeholder="e.g. Mother"
              containerStyle={styles.input}
            />

            <Input
              label="Condition"
              value={condition}
              onChangeText={setCondition}
              placeholder="e.g. Diabetes"
              containerStyle={styles.input}
            />

            <Input
              label="Age of onset (optional)"
              value={ageOfOnset}
              onChangeText={setAgeOfOnset}
              placeholder="e.g. 52"
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
              label={loading ? "Saving..." : "Add family history"}
              onPress={onAdd}
              disabled={!canSave || loading}
              loading={loading}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button label="Continue" onPress={goNext} />
          </View>

          <Text style={styles.sectionTitle}>Saved family history</Text>

          <FlatList
            data={sorted}
            keyExtractor={(item, idx) => item.id ?? `${item.relative}-${item.condition}-${idx}`}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            ListEmptyComponent={<Text style={styles.empty}>No family history yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>
                  {item.relative}: {item.condition}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.ageOfOnset ? `Onset: ${item.ageOfOnset}` : "Onset: Unknown"}
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
  wrap: { paddingTop: theme.spacing.md },
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
