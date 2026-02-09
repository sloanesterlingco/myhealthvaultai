// src/features/labResults/screens/LabResultsListScreen.js

import { useNavigation } from "@react-navigation/native";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity
} from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { MainRoutes } from "../../../navigation/types";
import { theme } from "../../../theme";
import { useLabResultsList } from "../hooks/useLabResultsList";

export const LabResultsListScreen = () => {
  const { labResults } = useLabResultsList();
  const navigation = useNavigation();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Lab Results & Records</Text>

        {labResults.length === 0 ? (
          <Text style={styles.empty}>No lab results added.</Text>
        ) : (
          labResults.map((r, i) => (
            <TouchableOpacity
              key={r.id || i}
              style={styles.card}
              onPress={() =>
                navigation.navigate(MainRoutes.LAB_RESULT_DETAIL, {
                  labResult: r,
                })
              }
            >
              <Text style={styles.testName}>{r.testName}</Text>
              <Text style={styles.meta}>
                {r.date} • {r.provider || "Unknown provider"}
              </Text>
              {r.resultSummary ? (
                <Text style={styles.summary} numberOfLines={2}>
                  {r.resultSummary}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate(MainRoutes.ADD_LAB_RESULT)}
        >
          <Text style={styles.addText}>+ Add Lab Result</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    color: theme.colors.text,
  },
  empty: {
    marginTop: theme.spacing.lg,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  testName: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  summary: {
    fontSize: 14,
    marginTop: 4,
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: 10,
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
