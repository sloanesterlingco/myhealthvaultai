// src/features/patient/components/ChartSetupNudgeModal.tsx

import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

type Props = {
  visible: boolean;
  onStart: () => void;
  onNotNow: () => void;
  onDismiss14d: () => void;
};

export default function ChartSetupNudgeModal({
  visible,
  onStart,
  onNotNow,
  onDismiss14d,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Card style={styles.modalCard}>
          <Text style={styles.title}>AI Guided Chart Setup</Text>
          <Text style={styles.body}>
            Answer a few questions and we’ll organize your history, meds, allergies, and key details.
            You can stop anytime and come back later.
          </Text>

          <Button label="Start now" onPress={onStart} />

          <TouchableOpacity style={styles.linkBtn} onPress={onNotNow} activeOpacity={0.85}>
            <Text style={styles.link}>Not now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={onDismiss14d} activeOpacity={0.85}>
            <Text style={[styles.link, { color: theme.colors.textSecondary }]}>
              Remind me later (14 days)
            </Text>
          </TouchableOpacity>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: "100%",
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 8,
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  linkBtn: {
    marginTop: theme.spacing.sm,
    alignItems: "center",
  },
  link: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: theme.typography.weights.semibold,
  },
});
