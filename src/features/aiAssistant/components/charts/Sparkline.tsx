// src/features/aiAssistant/components/charts/Sparkline.tsx

import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Polyline } from "react-native-svg";

interface SparklineProps {
  data: number[];
  secondaryData?: number[];
  width?: number;
  height?: number;
  stroke?: string;
  secondaryStroke?: string;
  strokeWidth?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  secondaryData,
  width = 120,
  height = 40,
  stroke = "#38bdf8",
  secondaryStroke = "#f97316",
  strokeWidth = 2,
}) => {
  if (!data || data.length === 0) return null;

  const allValues = secondaryData ? [...data, ...secondaryData] : [...data];
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);

  const normalize = (val: number) => {
    if (max === min) return height / 2;
    return height - ((val - min) / (max - min)) * height;
  };

  const build = (series: number[]) =>
    series
      .map((val, idx) => {
        const x = (idx / Math.max(series.length - 1, 1)) * width;
        const y = normalize(val);
        return `${x},${y}`;
      })
      .join(" ");

  const primaryPoints = build(data);
  const secondaryPoints = secondaryData ? build(secondaryData) : "";

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [primaryPoints, secondaryPoints]);

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Animated.View
        style={{ transform: [{ scaleX: anim }], width: "100%", height: "100%" }}
      >
        <Svg width={width} height={height}>
          <Polyline
            points={primaryPoints}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {secondaryPoints ? (
            <Polyline
              points={secondaryPoints}
              fill="none"
              stroke={secondaryStroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
      </Animated.View>
    </View>
  );
};

export default Sparkline;

const styles = StyleSheet.create({});
