// src/features/labResults/screens/AddLabResultScreen.js

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { theme } from "../../../theme";
import { useAddLabResult } from "../hooks/useAddLabResult";

export const AddLabResultScreen = () => {
  const { labResult, setField, saveLabResult } = useAddLabResult();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Lab Result</Text>

        <View style={styles.form}>
          <Input
            label="Test Name"
            value={labResult.testName}
            onChangeText={(t) => setField("testName", t)}
          />

          <Input
            label="Date"
            value={labResult.date}
            placeholder="YYYY-MM-DD"
            onChangeText={(t) => setField("date", t)}
          />

          <Input
            label="Provider"
            value={labResult.provider}
            onChangeText={(t) => setField("provider", t)}
          />

          <Input
            label="Result Summary"
            value={labResult.resultSummary}
            multiline
            numberOfLines={3}
            onChangeText={(t) => setField("resultSummary", t)}
          />

          <Input
            label="Notes"
            value={labResult.notes}
            multiline
            numberOfLines={4}
            onChangeText={(t) => setField("notes", t)}
          />

          <Button title="Save Lab Result" onPress={saveLabResult} />
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
