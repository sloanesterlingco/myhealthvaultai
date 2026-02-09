// src/features/providers/screens/EditProviderScreen.js

import { useRoute } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { theme } from "../../../theme";
import { useEditProvider } from "../hooks/useEditProvider";

export const EditProviderScreen = () => {
  const route = useRoute();
  const { provider: initialProvider } = route.params;

  const { provider, setField, saveProvider } = useEditProvider(initialProvider);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Provider</Text>

        <View style={styles.form}>
          <Input
            label="Provider Name"
            value={provider.name}
            onChangeText={(t) => setField("name", t)}
          />

          <Input
            label="Specialty"
            value={provider.specialty}
            onChangeText={(t) => setField("specialty", t)}
          />

          <Input
            label="Phone"
            value={provider.phone}
            keyboardType="phone-pad"
            onChangeText={(t) => setField("phone", t)}
          />

          <Input
            label="Address"
            value={provider.address}
            onChangeText={(t) => setField("address", t)}
          />

          <Input
            label="Notes"
            value={provider.notes}
            multiline
            numberOfLines={4}
            onChangeText={(t) => setField("notes", t)}
          />

          <Button title="Save Changes" onPress={saveProvider} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    color: theme.colors.text,
  },
  form: {
    gap: theme.spacing.md,
  },
});
