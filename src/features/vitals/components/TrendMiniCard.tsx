// src/features/vitals/components/TrendMiniCard.js

import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../theme";

export const TrendMiniCard = ({
  label,
  value,
  icon,
  color = "#2563eb",
  direction = "steady", // "up", "down", or "steady"
  onPress,
}) => {
  const trendIcon =
    direction === "up"
      ? "arrow-up-right"
      : direction === "down"
      ? "arrow-down-right"
      : "minus";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>

        <View style={styles.right}>
          <Feather name={icon} size={26} color={color} />
          <Feather
            name={trendIcon}
            size={18}
            color={direction === "down" ? "#dc2626" : "#10b981"}
            style={{ marginLeft: 6 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {},
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  value: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
});
