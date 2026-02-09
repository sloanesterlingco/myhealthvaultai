// src/features/patient/screens/LabOcrImportScreen.tsx

import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";
import { theme } from "../../../theme";
import {
  LabOcrResult,
  ParsedLabPanel,
  ParsedLabValue,
  labOcrService,
} from "../services/labOcrService";

type Nav = NativeStackNavigationProp<
  MainRoutesParamList,
  MainRoutes.LAB_OCR_IMPORT
>;

const LabOcrImportScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<LabOcrResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = rawText.trim().length > 20;

  const handleRunExtraction = async () => {
    try {
      setError(null);
      setResult(null);
      setLoading(true);

      const parsed = await labOcrService.parseLabTextWithAI(rawText);
      setResult(parsed);

    } catch (err: any) {
      console.log("Lab OCR extraction error:", err);
      setError(err?.message ?? "Could not analyze labs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    try {
      setSaving(true);
      await labOcrService.saveOcrLabs(result);
      navigation.goBack();
    } catch (err: any) {
      console.log("Lab OCR save error:", err);
      setError(err?.message ?? "Could not save labs.");
    } finally {
      setSaving(false);
    }
  };

  const renderFlag = (flag?: string) => {
    if (!flag || flag === "unknown") return null;

    const color =
      flag === "high" ? "#dc2626" :
      flag === "low" ? "#f59e0b" :
      "#10b981"; // normal

    return (
      <View style={[styles.flagChip, { backgroundColor: color }]}>
        <Text style={styles.flagChipText}>
          {flag === "high" ? "High" : flag === "low" ? "Low" : "Normal"}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Import Labs (AI)</Text>
        <Text style={styles.subtitle}>
          Paste lab text from your portal or PDF. The AI will extract and structure the results, then save them into your lab history.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* TEXT INPUT */}
        <Text style={styles.sectionTitle}>1. Paste Lab Report Text</Text>

        <TextInput
          style={styles.textArea}
          placeholder="Paste full lab report text here..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          value={rawText}
          onChangeText={setRawText}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canRun && styles.primaryButtonDisabled,
          ]}
          onPress={handleRunExtraction}
          disabled={!canRun || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Analyze with AI</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* RESULTS */}
        {result && (
          <>
            <Text style={styles.sectionTitle}>2. Review Extracted Labs</Text>

            {result.panels.length === 0 && (
              <Text style={styles.emptyText}>
                No recognizable labs found. Adjust text and try again.
              </Text>
            )}

            {result.panels.map((panel: ParsedLabPanel, idx: number) => (
              <View key={`${panel.panelName}-${idx}`} style={styles.panelCard}>
                <Text style={styles.panelTitle}>{panel.panelName}</Text>

                {panel.collectedAt && (
                  <Text style={styles.panelDate}>
                    Collected: {panel.collectedAt}
                  </Text>
                )}

                {panel.values.map((v: ParsedLabValue, i: number) => (
                  <View key={`${v.name}-${i}`} style={styles.valueRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.valueName}>{v.name}</Text>

                      <Text style={styles.valueMeta}>
                        {v.referenceRange ? `Ref: ${v.referenceRange}` : "No reference range"}
                      </Text>
                    </View>

                    <View style={styles.valueRight}>
                      <Text style={styles.valueNumber}>
                        {v.value ?? "--"} {v.unit ?? ""}
                      </Text>
                      {renderFlag(v.flag)}
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {result.panels.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save to My Labs</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        <Text style={styles.footerNote}>
          Coming soon: OCR camera scanning. This screen already handles AI parsing and Firestore saving.
        </Text>
      </ScrollView>
    </View>
  );
};

export default LabOcrImportScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { marginBottom: 8 },
  backText: { color: theme.colors.primary, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: theme.colors.textMuted },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 16, fontWeight: "700" },
  textArea: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14,
    backgroundColor: "#fff",
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorText: { marginTop: 8, color: "#dc2626", fontSize: 13 },
  emptyText: { fontSize: 13, color: theme.colors.textMuted },
  panelCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  panelTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  panelDate: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 },
  valueRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  valueName: { fontSize: 14, fontWeight: "600" },
  valueMeta: { fontSize: 11, color: theme.colors.textMuted },
  valueRight: { alignItems: "flex-end", marginLeft: 12 },
  valueNumber: { fontSize: 14, fontWeight: "700" },
  flagChip: { marginTop: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  flagChipText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  footerNote: { marginTop: 24, fontSize: 12, color: theme.colors.textMuted },
});
