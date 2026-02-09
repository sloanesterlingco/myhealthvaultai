// src/features/profile/screens/EditProfileScreen.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";

export default function EditProfileScreen() {
  return (
    <ScreenContainer showHeader title="Edit profile" scroll contentStyle={{ paddingTop: 0 }}>
      <View style={styles.wrap}>
        <SectionHeader title="Edit profile" />
        <Text style={styles.sub}>
          This screen can remain as a secondary editor, but the canonical hub is PatientProfile (avatar + demographics +
          insurance + OCR).
        </Text>

        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={styles.bodyText}>
            Coming soon: editable fields that deep-link from the PatientProfileScreen.
          </Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: theme.spacing.xl,
  },
  sub: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  bodyText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
