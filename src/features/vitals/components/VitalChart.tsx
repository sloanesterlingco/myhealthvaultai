import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { theme } from "../../../theme";

const screenWidth = Dimensions.get("window").width;

export interface VitalChartProps {
  title?: string;
  data: number[];
  color?: string;
  labels?: string[];
}

export const VitalChart: React.FC<VitalChartProps> = ({
  title,
  data,
  color = "#2563eb",
  labels = ["Mon", "Tue", "Wed", "Thu", "Fri"],
}) => {
  return (
    <View style={styles.chartCard}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}

      <LineChart
        data={{
          labels,
          datasets: [{ data }],
        }}
        width={screenWidth * 0.86}
        height={220}
        chartConfig={{
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          color: (opacity = 1) =>
            `${color}${Math.floor(opacity * 255).toString(16)}`,
          strokeWidth: 2,
          propsForDots: { r: "3" },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 3,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  chart: {
    borderRadius: 16,
  },
});
