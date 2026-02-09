// src/features/patient/screens/CheckInQRScreen.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { useNavigation } from "@react-navigation/native";
import { MainRoutes } from "../../../navigation/types";

export default function CheckInQRScreen({ route }: any) {
  const navigation = useNavigation<any>();

  // ✅ match types.ts: { payload: string }
  const payload: string = route?.params?.payload ?? "";

  return (
    <ScreenContainer
      showHeader
      title="Check-In QR"
      headerShowLogo={false}
      scroll
      contentStyle={{ paddingTop: 0 }}
    >
      <View style={styles.wrap}>
        <Text style={styles.subtitle}>Show this at the front desk</Text>

        <Card style={styles.card}>
          {payload ? (
            <QRCode value={payload} size={220} />
          ) : (
            <Text style={styles.muted}>
              QR payload not available. Return to Dashboard and try again.
            </Text>
          )}
        </Card>

        <Button label="Done" onPress={() => navigation.navigate(MainRoutes.DASHBOARD_TAB)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: theme.spacing.md,
  },
  card: {
    alignItems: "center",
    width: "100%",
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  muted: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
