import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";

import { auth } from "../../../lib/firebase";
import { addSurgery, listSurgeries } from "../services/patientRepository";
import { MainRoutes } from "../../../navigation/types";

import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";

export default function PastSurgicalHistoryScreen({ navigation }: any) {
  const uid = auth.currentUser?.uid ?? null;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [procedure, setProcedure] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [items]);

  const syncToEmr = useCallback((surgeries: any[]) => {
    try {
      patientAggregationService.updatePatientData?.({
        surgeries: Array.isArray(surgeries) ? surgeries : [],
      } as any);
      patientAggregationService.persistToFirestore?.();
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await listSurgeries(uid);
      const list = data ?? [];
      setItems(list);
      syncToEmr(list);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load surgical history.");
    } finally {
      setLoading(false);
    }
  }, [uid, syncToEmr]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setProcedure("");
    setYear("");
    setLocation("");
    setNotes("");
  };

  const canSave = !!uid && procedure.trim().length > 0;

  const onAdd = async () => {
    if (!uid) return;

    if (!procedure.trim()) {
      Alert.alert("Missing field", "Please enter a procedure name.");
      return;
    }

    setLoading(true);
    try {
      await addSurgery(uid, {
        procedure: procedure.trim(),
        year: year.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      resetForm();
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to save surgery/procedure.");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    navigation.navigate(MainRoutes.FAMILY_HISTORY);
  };

  return (
    <ScreenContainer title="Past Surgical History" headerCanGoBack scroll={false}>
      {!uid ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Sign in to add your history.</Text>
        </View>
      ) : (
        <View style={styles.wrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add a surgery / procedure</Text>

            <Input
              label="Procedure"
              value={procedure}
              onChangeText={setProcedure}
              placeholder="e.g. Appendectomy"
              containerStyle={styles.input}
            />

            <Input
              label="Year (optional)"
              value={year}
              onChangeText={setYear}
              placeholder="e.g. 2012"
              containerStyle={styles.input}
            />

            <Input
              label="Location (optional)"
              value={location}
              onChangeText={setLocation}
              placeholder="Hospital / city"
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
              label={loading ? "Saving..." : "Add surgery"}
              onPress={onAdd}
              disabled={!canSave || loading}
              loading={loading}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button label="Continue" onPress={goNext} />
          </View>

          <Text style={styles.sectionTitle}>Saved surgeries / procedures</Text>

          <FlatList
            data={sorted}
            keyExtractor={(item, idx) => item.id ?? `${item.procedure}-${idx}`}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            ListEmptyComponent={<Text style={styles.empty}>No surgeries yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>{item.procedure}</Text>
                <Text style={styles.itemMeta}>
                  {item.year ? `Year: ${item.year}` : "Year: Unknown"}
                  {item.location ? ` • ${item.location}` : ""}
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
