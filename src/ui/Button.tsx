// src/ui/Button.tsx
import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { theme } from "@/theme";

type Variant = "primary" | "secondary" | "success" | "warning" | "info" | "ghost";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;

  variant?: Variant;

  // ✅ IMPORTANT: allow arrays + registered styles
  style?: StyleProp<ViewStyle>;
  textStyle?: any;
};

function getVariantStyle(variant: Variant) {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: theme.colors.surface ?? "#111827",
        borderColor: theme.colors.border ?? "rgba(255,255,255,0.12)",
        textColor: theme.colors.text ?? "#fff",
      };
    case "success":
      return {
        backgroundColor: theme.colors.success ?? "#16a34a",
        borderColor: "transparent",
        textColor: "#fff",
      };
    case "warning":
      return {
        backgroundColor: theme.colors.warning ?? "#f59e0b",
        borderColor: "transparent",
        textColor: "#111",
      };
    case "info":
      return {
        backgroundColor: theme.colors.info ?? "#2563eb",
        borderColor: "transparent",
        textColor: "#fff",
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        borderColor: theme.colors.border ?? "rgba(255,255,255,0.12)",
        textColor: theme.colors.text ?? "#fff",
      };
    case "primary":
    default:
      return {
        backgroundColor: theme.colors.brand ?? theme.colors.primary ?? "#0b3d91",
        borderColor: "transparent",
        textColor: "#fff",
      };
  }
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
  textStyle,
}: Props) {
  const v = getVariantStyle(variant);
  const isDisabled = !!disabled || !!loading || !onPress;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      disabled={isDisabled}
      style={[
        styles.button,
        { backgroundColor: v.backgroundColor, borderColor: v.borderColor },
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={[styles.text, { color: v.textColor }, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.55,
  },
});
