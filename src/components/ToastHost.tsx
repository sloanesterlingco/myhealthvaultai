// src/components/ToastHost.tsx

import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useUI } from "../providers/UIProvider";

export default function ToastHost() {
  const { toast, clearToast } = useUI();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (!toast) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toast, opacity, translateY]);

  if (!toast) return null;

  const variantStyle =
    toast.type === "success"
      ? styles.success
      : toast.type === "error"
      ? styles.error
      : styles.info;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Pressable onPress={clearToast} style={styles.pressable}>
        <Animated.View
          style={[
            styles.toast,
            variantStyle,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Text style={styles.text} numberOfLines={3}>
            {toast.message}
          </Text>
          <Text style={styles.subtext}>Tap to dismiss</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingHorizontal: 14,
  },
  pressable: {
    width: "100%",
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 640,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  success: {
    backgroundColor: "#0E2A16",
    borderColor: "#1E7A3A",
  },
  error: {
    backgroundColor: "#2A0E0E",
    borderColor: "#A33A3A",
  },
  info: {
    backgroundColor: "#101522",
    borderColor: "#2A3B72",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  subtext: {
    color: "#BDBDBD",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
  },
});
