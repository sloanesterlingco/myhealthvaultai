// src/features/appointments/screens/ScheduleAppointmentScreen.js

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { theme } from "../../../theme";
import { useScheduleAppointment } from "../hooks/useScheduleAppointment";

export const ScheduleAppointmentScreen = () => {
  const { appointment, setField, saveAppointment } = useScheduleAppointment();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Schedule Appointment</Text>

        <View style={styles.form}>
          <Input
            label="Provider"
            value={appointment.provider}
            onChangeText={(t) => setField("provider", t)}
          />

          <Input
            label="Type"
            value={appointment.type}
            placeholder="e.g. Follow-up, Annual Checkup"
            onChangeText={(t) => setField("type", t)}
          />

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

          <Button title="Save Appointment" onPress={saveAppointment} />
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
