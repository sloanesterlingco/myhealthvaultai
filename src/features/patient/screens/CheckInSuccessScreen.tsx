// src/features/patient/screens/CheckInSuccessScreen.tsx

import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Feather } from "@expo/vector-icons";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { useNavigation } from "@react-navigation/native";
import { MainRoutes } from "../../../navigation/types";

interface Props {
  route: {
    params?: {
      qrPayload?: string;
      pdfUri?: string;
    };
  };
}

export default function CheckInSuccessScreen({ route }: Props) {
  const navigation = useNavigation<any>();

  const qrPayload = route?.params?.qrPayload ?? "";
  const pdfUri = route?.params?.pdfUri ?? "";

  const onOpenPdf = () => {
    if (!pdfUri) {
      Alert.alert("No PDF available", "A PDF link was not returned for this check-in.");
      return;
    }
    // Expo-managed safe fallback: show the URL so user can copy it for now.
    Alert.alert("PDF Link", pdfUri);
  };

  return (
    <ScreenContainer
      showHeader={true}
      title="Check-In"
      headerShowLogo={false}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={40} color={theme.colors.success} />
        </View>

        <Text style={styles.title}>Check-In Ready</Text>
        <Text style={styles.subtitle}>
          Your PDF packet and QR code are ready. Show the QR at the front desk or share the PDF.
        </Text>

        <Card style={styles.qrCard}>
          <Text style={styles.qrLabel}>Show this at the front desk</Text>

          {qrPayload ? (
            <QRCode value={qrPayload} size={220} />
          ) : (
            <Text style={styles.muted}>
              QR payload not available. You can still show the clinic your check-in confirmation.
            </Text>
          )}
        </Card>

        {pdfUri ? (
          <Button
            label="View PDF link"
            onPress={onOpenPdf}
            style={{ marginBottom: theme.spacing.sm }}
          />
        ) : null}

        {qrPayload ? (
          <Button
            label="Show QR full screen"
            variant="secondary"
            onPress={() => navigation.navigate(MainRoutes.CHECKIN_QR, { payload: qrPayload } as any)}
            style={{ marginBottom: theme.spacing.sm }}
          />
        ) : null}

        <Button label="Return to Dashboard" onPress={() => navigation.navigate(MainRoutes.DASHBOARD_TAB)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    marginTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },

  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },

  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginHorizontal: 30,
    marginBottom: theme.spacing.xl,
  },

  qrCard: {
    padding: theme.spacing.lg,
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    width: "100%",
  },

  qrLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },

  muted: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
