// src/features/vitals/components/VitalHistoryChart.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../../theme";
import { vitalsService } from "../services/vitalsService";
import type { VitalType } from "../types";
import { Sparkline } from "../../aiAssistant/components/charts/Sparkline";

type Props = {
  type: VitalType;
  take?: number; // optional: number of points
};

/**
 * Displays a sparkline history for a vital type.
 * - For bp: uses systolic as primary and diastolic as secondary
 * - For others: uses value as primary
 */
export default function VitalHistoryChart({ type, take = 20 }: Props) {
  const [values, setValues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const data = await vitalsService.getVitalHistory(type, take);
        if (!alive) return;
        setValues(data ?? []);
      } catch {
        if (!alive) return;
        setValues([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [type, take]);

  const { primary, secondary } = useMemo(() => {
    const recent = (values ?? []).slice(0, take);

    // Sparkline expects oldest -> newest for a clean left-to-right progression
    const ordered = recent.slice().reverse();

    if (type === "bp") {
      const sys = ordered
        .map((r) => Number(r?.systolic))
        .filter((n) => Number.isFinite(n));
      const dia = ordered
        .map((r) => Number(r?.diastolic))
        .filter((n) => Number.isFinite(n));

      return { primary: sys, secondary: dia };
    }

    const v = ordered
      .map((r) => Number(r?.value))
      .filter((n) => Number.isFinite(n));

    return { primary: v, secondary: undefined as number[] | undefined };
  }, [type, take, values]);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.muted}>Loading chart…</Text>
      </View>
    );
  }

  if (!primary.length) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.muted}>No history yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Sparkline data={primary} secondaryData={secondary} height={44} width={240} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
