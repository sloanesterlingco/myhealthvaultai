// src/features/providers/screens/ProviderDetailScreen.js

import { useRoute } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { theme } from "../../../theme";
import { useProviderDetail } from "../hooks/useProviderDetail";

export const ProviderDetailScreen = () => {
  const route = useRoute();
  const { provider } = route.params;
  const { goToEdit } = useProviderDetail(provider);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{provider.name}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Specialty</Text>
          <Text style={styles.value}>{provider.specialty}</Text>

          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{provider.phone || "N/A"}</Text>

          <Text style={styles.label}>Address</Text>
          <Text style={styles.value}>{provider.address || "N/A"}</Text>

          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{provider.notes || "None"}</Text>
        </View>

        <TouchableOpacity style={styles.editButton} onPress={goToEdit}>
          <Text style={styles.editText}>Edit Provider</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: 12,
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: 10,
    alignItems: "center",
  },
  editText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
