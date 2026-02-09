// src/features/vitals/screens/VitalsHistoryScreen.tsx

import React, { useEffect, useState } from "react";
import { Text, StyleSheet, FlatList } from "react-native";
import { useRoute } from "@react-navigation/native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";

import { vitalsService, type VitalRecord } from "../services/vitalsService";

export default function VitalsHistoryScreen() {
  const route = useRoute<any>();
  const { type, label, color } = route.params;

  const [records, setRecords] = useState<VitalRecord[]>([]);

  const load = async () => {
    const res = await vitalsService.getVitalsByType(type);
    setRecords(res ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenContainer>
      <SectionHeader title={`${label} History`} />

      <FlatList
        data={records}
        keyExtractor={(item) =>
          String(item.id ?? `${item.type}-${item.timestampMs}`)
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={[styles.value, { color }]}>
              {type === "bp"
                ? `${Number(item.systolic ?? 0)}/${Number(item.diastolic ?? 0)}`
                : item.value != null
                ? Number(item.value)
                : "--"}
            </Text>

            <Text style={styles.timestamp}>
              {new Date(
                Number(item.timestampMs ?? Date.now())
              ).toLocaleString()}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No history available.</Text>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
  },
  timestamp: {
    marginTop: 4,
    color: theme.colors.textSecondary,
  },
  empty: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
  },
});
