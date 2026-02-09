// src/features/history/screens/HistoryListScreen.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { SectionHeader } from "../../../ui/SectionHeader";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { Feather } from "@expo/vector-icons";

import usePatientHistory from "../hooks/usePatientHistory"; // <-- We'll create this
import { useNavigation } from "@react-navigation/native";
import { MainRoutes } from "../../../navigation/types";

export default function HistoryListScreen() {
  const navigation = useNavigation<any>();
  const { history, removeEntry } = usePatientHistory();

  const renderItem = ({ item }: any) => {
    return (
      <Card style={styles.entryCard}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.row}
          onPress={() => {}}
        >
          {/* ICON BASED ON TYPE */}
          <View style={styles.iconCircle}>
            <Feather
              name={
                item.category === "procedure"
                  ? "scissors"
                  : item.category === "imaging"
                  ? "image"
                  : item.category === "symptom"
                  ? "alert-circle"
                  : "activity"
              }
              size={20}
              color={theme.colors.primary}
            />
          </View>

          {/* DETAILS */}
          <View style={styles.info}>
            <Text style={styles.title}>{item.normalizedText}</Text>

            {/* Codes */}
            {item.codes?.length > 0 && (
              <Text style={styles.codeText}>
                {item.codes.map((c: any) => `${c.system} ${c.code}`).join(" • ")}
              </Text>
            )}
          </View>

          {/* DELETE BUTTON */}
          <TouchableOpacity onPress={() => removeEntry(item.id)}>
            <Feather name="trash" size={18} color={theme.colors.danger} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader title="Medical History" />

      {/* EMPTY STATE */}
      {history.length === 0 && (
        <View style={styles.emptyContainer}>
          <Feather name="folder" size={40} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No history added yet.</Text>
          <Text style={styles.emptySub}>
            Add conditions, surgeries, and prior imaging.
          </Text>

          <Button
            label="Add History Entry"
            onPress={() => navigation.navigate(MainRoutes.HISTORY_INTAKE)}
            style={{ marginTop: theme.spacing.lg }}
          />
        </View>
      )}

      {/* LIST */}
      {history.length > 0 && (
        <>
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 120 }}
          />

          {/* Add new button at bottom */}
          <Button
            label="Add Entry"
            onPress={() => navigation.navigate(MainRoutes.HISTORY_INTAKE)}
            style={{ marginTop: theme.spacing.lg }}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  codeText: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: "center",
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
