// src/features/labResults/screens/LabTrendsScreen.tsx
//
// SAFE MODE: List-based lab history (no chart dependency)
// This avoids crashing the app if a chart component path differs in your repo.

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { collection, getDocs } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";
import { theme } from "../../../theme";

type LabPoint = {
  id: string;
  name?: string;
  value?: string;
  units?: string;
  date?: string; // YYYY-MM-DD
  meta?: { analyte?: string };
};

type AnalyteKey = "A1C" | "LDL" | "HDL" | "TOTAL_CHOL" | "CREATININE" | "EGFR";

const ANALYTES: { key: AnalyteKey; label: string; match: RegExp }[] = [
  { key: "A1C", label: "A1c", match: /\b(a1c|hba1c|hemoglobin a1c)\b/i },
  { key: "LDL", label: "LDL", match: /\bldl\b/i },
  { key: "HDL", label: "HDL", match: /\bhdl\b/i },
  { key: "TOTAL_CHOL", label: "Total Chol", match: /\b(total cholesterol|cholesterol total)\b/i },
  { key: "CREATININE", label: "Creatinine", match: /\bcreatinine\b|\bcr\b/i },
  { key: "EGFR", label: "eGFR", match: /\begfr\b|\bgfr\b/i },
];

function parseNumber(v?: string): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export default function LabTrendsScreen() {
  const uid = auth.currentUser?.uid ?? null;

  const [all, setAll] = useState<LabPoint[]>([]);
  const [selected, setSelected] = useState<AnalyteKey>("A1C");

  useEffect(() => {
    const load = async () => {
      if (!uid) return;
      const ref = collection(db, "patients", uid, "labResults");
      const snap = await getDocs(ref);
      const rows = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as LabPoint[];
      setAll(rows);
    };
    load();
  }, [uid]);

  const filtered = useMemo(() => {
    const spec = ANALYTES.find((a) => a.key === selected)!;

    return all
      .filter((p) => {
        const metaKey = (p.meta?.analyte || "").toUpperCase();
        if (metaKey === selected) return true;
        const name = p.name || "";
        return spec.match.test(name);
      })
      .map((p) => ({
        id: p.id,
        date: p.date || "",
        valueNum: parseNumber(p.value),
        valueRaw: p.value || "",
        units: p.units || "",
        name: p.name || "",
      }))
      .filter((p) => p.valueNum != null)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [all, selected]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Lab Trends</Text>
      <Text style={styles.subheader}>History list (safe mode). No interpretation.</Text>

      <View style={styles.pills}>
        {ANALYTES.map((a) => {
          const active = a.key === selected;
          return (
            <TouchableOpacity
              key={a.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setSelected(a.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>No values yet for this lab.</Text>
      ) : (
        <View style={styles.list}>
          {filtered.map((p) => (
            <View key={p.id} style={styles.row}>
              <Text style={styles.date}>{p.date || "—"}</Text>
              <Text style={styles.value}>
                {p.valueRaw}
                {p.units ? ` ${p.units}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.note}>Tip: Add more by scanning a lab report in Records Vault.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },
  subheader: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 14,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
  },
  pillActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.text,
  },
  pillTextActive: {
    color: "#fff",
  },
  empty: {
    marginTop: 20,
    color: theme.colors.textMuted,
    fontWeight: "700",
    textAlign: "center",
  },
  list: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  date: {
    fontWeight: "800",
    color: theme.colors.text,
  },
  value: {
    fontWeight: "900",
    color: theme.colors.text,
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
});
