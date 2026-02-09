// src/features/patient/screens/PastMedicalHistoryScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Alert, StyleSheet, TextInput } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import { useAuth } from "../../providers/AuthProvider";
import { upsertPatientCore, listConditions, addCondition } from "../services/patientRepository";
import type { Condition } from "../models/patientSchemas";

type Status = "active" | "resolved" | "unknown";

function formatAnyError(e: any) {
  const code = e?.code ? String(e.code) : "";
  const name = e?.name ? String(e.name) : "";
  const message = e?.message ? String(e.message) : String(e);
  const stack = e?.stack ? String(e.stack) : "";
  const extra = e ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2) : "";

  return [
    code ? `code: ${code}` : "",
    name ? `name: ${name}` : "",
    message ? `message: ${message}` : "",
    stack ? `stack: ${stack}` : "",
    extra && extra !== "{}" ? `raw: ${extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function StatusPill({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: Status;
  selected: boolean;
  onPress: (v: Status) => void;
}) {
  return (
    <Text
      onPress={() => onPress(value)}
      style={[styles.pill, selected ? styles.pillSelected : styles.pillUnselected]}
    >
      {label}
    </Text>
  );
}

export default function PastMedicalHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const uid = user?.uid;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Condition[]>([]);

  const [name, setName] = useState("");
  const [diagnosed, setDiagnosed] = useState("");
  const [status, setStatus] = useState<Status>("active");

  // dev-only debug
  const [debugError, setDebugError] = useState<string>("");

  const canSubmit = useMemo(() => {
    return Boolean(uid && name.trim().length > 0 && !loading);
  }, [uid, name, loading]);

  const canGoNext = useMemo(() => {
    // allow Next if they already have at least one saved condition
    return Boolean(uid && items.length > 0 && !loading);
  }, [uid, items.length, loading]);

  const showLoadError = useCallback((e: any) => {
    const msg = formatAnyError(e);

    console.error("🔥 PMH LOAD FAILED 🔥\n", msg);

    if (__DEV__) {
      setDebugError(msg);
      Alert.alert("PMH Load Error (DEBUG)", msg.slice(0, 2000));
    } else {
      Alert.alert("Error", "Unable to load medical history.");
    }
  }, []);

  const showAddError = useCallback((e: any) => {
    const msg = formatAnyError(e);

    console.error("🔥 PMH ADD FAILED 🔥\n", msg);

    if (__DEV__) {
      setDebugError(msg);
      Alert.alert("PMH Add Error (DEBUG)", msg.slice(0, 2000));
    } else {
      Alert.alert("Error", "Unable to save condition.");
    }
  }, []);

  const load = useCallback(async () => {
    if (!uid) {
      if (__DEV__) setDebugError("No uid available (user not ready).");
      return;
    }

    setLoading(true);
    if (__DEV__) setDebugError("");

    try {
      await upsertPatientCore(uid, {});
      const rows = await listConditions(uid);
      setItems(rows);
    } catch (e: any) {
      showLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [uid, showLoadError]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    load();
  }, [load]);

  const onCopyDebug = useCallback(async () => {
    if (!debugError) return;
    await Clipboard.setStringAsync(debugError);
    Alert.alert("Copied", "Debug error copied to clipboard.");
  }, [debugError]);

  const onAdd = useCallback(async () => {
    if (!uid) return;

    setLoading(true);
    if (__DEV__) setDebugError("");

    try {
      await upsertPatientCore(uid, {});

      await addCondition(uid, {
        name: name.trim(),
        diagnosed: diagnosed.trim() || undefined,
        status,
      } as any);

      setName("");
      setDiagnosed("");
      setStatus("active");
      await load();
    } catch (e: any) {
      showAddError(e);
    } finally {
      setLoading(false);
    }
  }, [uid, name, diagnosed, status, load, showAddError]);

  const onNext = useCallback(() => {
    navigation.navigate(MainRoutes.PAST_SURGICAL_HISTORY);
  }, [navigation]);

  return (
    <ScreenContainer title="Past Medical History">
      {/* DEV-ONLY DEBUG BOX */}
      {__DEV__ && debugError ? (
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>DEBUG: PMH Error</Text>
          <Text style={styles.debugText}>{debugError}</Text>
          <View style={styles.debugRow}>
            <Button label="Copy debug" variant="ghost" onPress={onCopyDebug} />
            <Button label="Refresh" variant="ghost" onPress={onRefresh} />
          </View>
        </View>
      ) : null}

      <Card>
        <SectionHeader title="Add a condition" />

        <Text style={styles.label}>Condition</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Hypertension"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>Diagnosed (optional)</Text>
        <TextInput
          value={diagnosed}
          onChangeText={setDiagnosed}
          placeholder="e.g. 2018"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.pillRow}>
          <StatusPill label="Active" value="active" selected={status === "active"} onPress={setStatus} />
          <StatusPill label="Resolved" value="resolved" selected={status === "resolved"} onPress={setStatus} />
          <StatusPill label="Unknown" value="unknown" selected={status === "unknown"} onPress={setStatus} />
        </View>

        <View style={{ marginTop: 14 }}>
          <Button
            label={loading ? "Saving..." : "Add condition"}
            onPress={onAdd}
            disabled={!canSubmit}
          />
        </View>

        {/* ✅ NEW: Next flow button */}
        <View style={{ marginTop: 12 }}>
          <Button
            label="Next"
            onPress={onNext}
            disabled={!canGoNext}
          />
        </View>

        {!canGoNext ? (
          <Text style={styles.hint}>
            Add at least one condition to continue.
          </Text>
        ) : null}
      </Card>

      <View style={{ marginTop: 16 }}>
        <View style={styles.rowHeader}>
          <Text style={styles.savedTitle}>Saved conditions</Text>
          <Button label="Refresh" variant="ghost" onPress={onRefresh} />
        </View>

        {items.length === 0 ? (
          <Text style={styles.empty}>No conditions yet.</Text>
        ) : (
          items.map((it) => (
            <Card key={it.id} style={{ marginTop: 10 }}>
              <Text style={styles.itemTitle}>{it.name ?? "Condition"}</Text>
              <Text style={styles.itemMeta}>
                {it.diagnosed ? `Diagnosed: ${it.diagnosed}` : "Diagnosed: —"} •{" "}
                {it.status ?? "—"}
              </Text>
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  debugBox: {
    borderWidth: 2,
    borderColor: "#B91C1C",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  debugTitle: {
    fontWeight: "900",
    color: "#7F1D1D",
    marginBottom: 8,
    fontSize: 16,
  },
  debugText: {
    color: "#7F1D1D",
    fontSize: 12,
  },
  debugRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  empty: {
    marginTop: 10,
    color: theme.colors.textSecondary,
  },
  label: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.card,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "800",
  },
  pillSelected: {
    backgroundColor: theme.colors.primary,
    color: "#fff",
  },
  pillUnselected: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  itemMeta: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
