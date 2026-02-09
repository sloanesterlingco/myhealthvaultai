import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { useAuth } from "../../providers/AuthProvider";

export default function SignUpScreen() {
  const nav = useNavigation<any>();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    try {
      setBusy(true);
      await signUp(email, password);

      // ✅ Fix GO_BACK warning (only goBack if there's something to go back to)
      if (nav?.canGoBack?.()) nav.goBack();
    } catch (e: any) {
      Alert.alert("Sign up failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={styles.title}>Create account</Text>

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

        <View style={{ height: 10 }} />

        <Button
          label={busy ? "Creating..." : "Create account"}
          onPress={onSubmit}
          disabled={busy}
        />

        <View style={{ height: 12 }} />

        <Button label="Back to sign in" variant="ghost" onPress={() => nav.goBack()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
});
