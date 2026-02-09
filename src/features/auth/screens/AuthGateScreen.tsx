import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { Button } from "../../../ui/Button";
import ScreenContainer from "../../../ui/ScreenContainer";
import { useAuth } from "../../providers/AuthProvider";
import { AppRoutes, AuthRoutes } from "../../../navigation/types";

export default function AuthGateScreen() {
  const nav = useNavigation<any>();
  const { continueAsGuest } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={styles.title}>MyHealthVaultAI</Text>
        <Text style={styles.sub}>
          Sign in to sync with your portal, or continue as guest.
        </Text>

        <View style={{ height: 16 }} />

        <Button
          label="Sign in"
          onPress={() => nav.navigate(AppRoutes.AUTH, { screen: AuthRoutes.SIGN_IN })}
        />

        <View style={{ height: 12 }} />

        <Button
          label="Continue as guest"
          variant="ghost"
          onPress={async () => {
            await continueAsGuest();
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  sub: { marginTop: 8, fontSize: 14, opacity: 0.75 },
});
