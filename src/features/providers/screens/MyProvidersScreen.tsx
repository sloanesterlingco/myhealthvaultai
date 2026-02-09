// src/features/providers/screens/MyProvidersScreen.js

import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { MainRoutes } from "../../../navigation/types";
import { theme } from "../../../theme";
import { useMyProviders } from "../hooks/useMyProviders";

export const MyProvidersScreen = () => {
  const { providers } = useMyProviders();
  const navigation = useNavigation();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Providers</Text>

        {providers.length === 0 ? (
          <Text style={styles.empty}>No providers added yet.</Text>
        ) : (
          providers.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={styles.card}
              onPress={() =>
                navigation.navigate(MainRoutes.PROVIDER_DETAIL, { provider: p })
              }
            >
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.specialty}>{p.specialty}</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate(MainRoutes.ADD_PROVIDER)}
        >
          <Text style={styles.addButtonText}>+ Add Provider</Text>
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
    color: theme.colors.textMuted,
    marginTop: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  specialty: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  addButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    borderRadius: 10,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
