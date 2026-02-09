// src/features/providers/screens/ProviderCardScannerScreen.js

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { theme } from "../../../theme";
import { useProviderCardScanner } from "../hooks/useProviderCardScanner";

export const ProviderCardScannerScreen = () => {
  const { scannedResult, simulateScan, importToAddProvider } =
    useProviderCardScanner();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Scan Provider Card</Text>

        <View style={styles.scanBox}>
          <Text style={styles.scanText}>
            {scannedResult
              ? "Card Scanned Successfully!"
              : "Point your camera at a provider card"}
          </Text>
        </View>

        {!scannedResult ? (
          <TouchableOpacity style={styles.scanButton} onPress={simulateScan}>
            <Text style={styles.scanButtonText}>Simulate Scan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.importButton}
            onPress={importToAddProvider}
          >
            <Text style={styles.importText}>Import to Add Provider</Text>
          </TouchableOpacity>
        )}

        {scannedResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Detected Info</Text>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{scannedResult.name}</Text>

            <Text style={styles.label}>Specialty</Text>
            <Text style={styles.value}>{scannedResult.specialty}</Text>

            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{scannedResult.phone}</Text>

            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{scannedResult.address}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
  },
  scanBox: {
    height: 250,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scanText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: 10,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  importButton: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: 10,
    alignItems: "center",
  },
  importText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  resultCard: {
    padding: theme.spacing.md,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
});
