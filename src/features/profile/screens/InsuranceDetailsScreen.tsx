// src/features/profile/screens/InsuranceDetailsScreen.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { SectionHeader } from "../../../ui/SectionHeader";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

export default function InsuranceDetailsScreen() {
  const navigation = useNavigation<any>();

  const onBack = () => navigation.goBack();

  return (
    <ScreenContainer
      showHeader
      title="Insurance details"
      headerShowLogo={false}
      headerShowAvatar={false}
      headerShowSettings={false}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <SectionHeader title="Insurance" />

      <Card>
        <Text style={styles.title}>Add your insurance information</Text>
        <Text style={styles.sub}>
          Enter your plan details now. You can upload your insurance card in the next step.
        </Text>

        <View style={{ height: theme.spacing.md }} />

        {/* TODO: Keep your existing form fields here (payer, member ID, group #, phone, etc.) */}

        <Button label="Back" variant="secondary" onPress={onBack} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "900", color: theme.colors.text },
  sub: { marginTop: 6, fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary, lineHeight: 18 },
});
