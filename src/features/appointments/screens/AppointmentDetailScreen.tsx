// src/features/appointments/screens/AppointmentDetailScreen.js

import { useRoute } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { Button } from "../../../components/ui/Button";
import { theme } from "../../../theme";
import { useAppointmentDetail } from "../hooks/useAppointmentDetail";

export const AppointmentDetailScreen = () => {
  const route = useRoute();
  const { appointment: initialAppointment } = route.params;

  const { appointment, goToReschedule } =
    useAppointmentDetail(initialAppointment);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Appointment Details</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Provider</Text>
          <Text style={styles.value}>{appointment.provider || "N/A"}</Text>

          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{appointment.type || "N/A"}</Text>

          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{appointment.date || "N/A"}</Text>

          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>{appointment.time || "N/A"}</Text>

          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{appointment.location || "N/A"}</Text>

          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>
            {appointment.notes && appointment.notes.trim().length > 0
              ? appointment.notes
              : "None"}
          </Text>
        </View>

        <Button title="Reschedule Appointment" onPress={goToReschedule} />
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
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: theme.spacing.xs,
  },
});
