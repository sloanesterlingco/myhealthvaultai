// src/features/appointments/screens/RescheduleAppointmentScreen.js

import { useRoute } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { theme } from "../../../theme";
import { useRescheduleAppointment } from "../hooks/useRescheduleAppointment";

export const RescheduleAppointmentScreen = () => {
  const route = useRoute();
  const { appointment: initialAppointment } = route.params;

  const { appointment, setField, saveChanges } =
    useRescheduleAppointment(initialAppointment);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Reschedule Appointment</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Provider</Text>
          <Text style={styles.value}>{appointment.provider || "N/A"}</Text>

          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{appointment.type || "N/A"}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Date"
            value={appointment.date}
            placeholder="YYYY-MM-DD"
            onChangeText={(t) => setField("date", t)}
          />

          <Input
            label="Time"
            value={appointment.time}
            placeholder="HH:MM"
            onChangeText={(t) => setField("time", t)}
          />

          <Input
            label="Location"
            value={appointment.location}
            onChangeText={(t) => setField("location", t)}
          />

          <Input
            label="Notes"
            value={appointment.notes}
            multiline
            numberOfLines={4}
            onChangeText={(t) => setField("notes", t)}
          />

          <Button title="Save Changes" onPress={saveChanges} />
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
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: 12,
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    gap: theme.spacing.md,
  },
});
