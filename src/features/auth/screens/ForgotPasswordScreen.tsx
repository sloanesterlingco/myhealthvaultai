import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";

import { auth } from "../../../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPasswordScreen() {
  const nav = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert("Email required", "Please enter the email you used to sign up.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, e);
      Alert.alert(
        "Check your email",
        "We sent a password reset link. Follow the steps and then sign in again.",
        [{ text: "OK", onPress: () => nav.goBack() }]
      );
    } catch (err: any) {
      Alert.alert("Reset failed", err?.message ?? "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer showHeader>
      <Card style={styles.card}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.sub}>
          Enter your email and we’ll send you a reset link.
        </Text>

        <View style={{ height: theme.spacing.md }} />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <View style={{ height: theme.spacing.lg }} />

        <Button label={loading ? "Sending..." : "Send reset link"} onPress={onSend} />

        <View style={{ height: theme.spacing.sm }} />
        <Button label="Back to sign in" variant="ghost" onPress={() => nav.goBack()} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: theme.spacing.lg },
  title: { fontSize: 18, fontWeight: "900", color: theme.colors.text },
  sub: { marginTop: 6, fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },
});
