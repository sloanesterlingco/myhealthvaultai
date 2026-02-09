import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { theme } from "../../../theme";
import { VitalType } from "../types";
import { MainRoutes } from "../../../navigation/types";

const TYPES: { type: VitalType; label: string; icon: string; helper?: string }[] = [
  { type: "bp", label: "Blood Pressure", icon: "activity", helper: "SYS / DIA" },
  { type: "hr", label: "Heart Rate", icon: "heart", helper: "bpm" },
  { type: "spo2", label: "Blood Oxygen", icon: "wind", helper: "%" },
  { type: "rr", label: "Respiratory Rate", icon: "cloud", helper: "breaths/min" },
  { type: "temp", label: "Temperature", icon: "thermometer", helper: "°F" },
  { type: "weight", label: "Weight", icon: "trending-up", helper: "lbs" },

  // ✅ NEW: Height (needed for BMI)
  { type: "height", label: "Height", icon: "maximize-2", helper: "inches" },
];

export default function VitalTypePickerScreen() {
  const navigation = useNavigation<any>();

  const onBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate(MainRoutes.VITALS_TAB, { screen: MainRoutes.VITALS });
  };

  return (
    <ScreenContainer title="All vital types" headerCanGoBack onPressBack={onBack} scroll={false}>
      <View style={styles.container}>
        <Text style={styles.sub}>
          Choose a measurement to add. Height + weight enables BMI (calculated automatically).
        </Text>

        {TYPES.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={styles.row}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate(MainRoutes.ADD_VITAL, {
                type: item.type,
                label: item.label,
              })
            }
          >
            <View style={styles.iconCircle}>
              <Feather name={item.icon as any} size={18} color={theme.colors.brand} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{item.label}</Text>
              {!!item.helper && <Text style={styles.helper}>{item.helper}</Text>}
            </View>

            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg },
  sub: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 16, fontWeight: "800", color: theme.colors.text },
  helper: { marginTop: 2, fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },
});
