// src/features/records/screens/RecordDetailScreen.js

import { Feather } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../../components/layout/Screen";
import { Button } from "../../../components/ui/Button";
import { theme } from "../../../theme";

export default function RecordDetailScreen() {
  const route = useRoute();
  const { record } = route.params || {};

  // Fallback if missing
  const safeRecord = record || {
    title: "Unknown Record",
    date: "N/A",
    type: "Unknown",
    icon: "file-text",
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Feather
              name={safeRecord.icon || "file-text"}
              size={28}
              color="#2563eb"
            />
          </View>

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{safeRecord.title}</Text>
            <Text style={styles.meta}>{safeRecord.date}</Text>
            <Text style={styles.type}>{safeRecord.type}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Record Details</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.value}>{safeRecord.title}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{safeRecord.date}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{safeRecord.type}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Open / View File" onPress={() => {}} />
          <Button title="Share Record" onPress={() => {}} />
        </View>

        <Text style={styles.helperText}>
          Later, we’ll connect these actions to a real file viewer or secure
          sharing flow.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  iconWrap: {
    backgroundColor: "#dbeafe",
    padding: 10,
    borderRadius: 18,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  type: {
    marginTop: 2,
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  actions: {
    gap: theme.spacing.md,
  },
  helperText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
