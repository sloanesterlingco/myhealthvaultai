import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { useAuth } from "../../providers/AuthProvider";
import { AuthRoutes } from "../../../navigation/types";

export default function SignInScreen() {
  const nav = useNavigation<any>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    try {
      setBusy(true);
      await signIn(email, password);

      // ✅ Fix GO_BACK warning (only goBack if there's something to go back to)
      if (nav?.canGoBack?.()) nav.goBack();
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={styles.title}>Sign in</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={() => nav.navigate(AuthRoutes.FORGOT_PASSWORD)}
          style={styles.forgotWrap}
          disabled={busy}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <View style={{ height: 10 }} />

        <Button
          label={busy ? "Signing in..." : "Sign in"}
          onPress={onSubmit}
          disabled={busy}
        />

        <View style={{ height: 12 }} />

        <Button
          label="Create an account"
          variant="ghost"
          onPress={() => nav.navigate(AuthRoutes.SIGN_UP)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  forgotWrap: { marginTop: 6 },
  forgotText: { color: "#2C5CC5", fontWeight: "700" },
});
