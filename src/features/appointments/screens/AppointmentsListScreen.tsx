// src/features/appointments/screens/AppointmentsListScreen.js

import { useNavigation } from "@react-navigation/native";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity
} from "react-native";
import { Screen } from "../../../components/layout/Screen";
import { MainRoutes } from "../../../navigation/types";
import { theme } from "../../../theme";
import { useAppointmentsList } from "../hooks/useAppointmentsList";

export const AppointmentsListScreen = () => {
  const { appointments } = useAppointmentsList();
  const navigation = useNavigation();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Appointments</Text>

        {appointments.length === 0 ? (
          <Text style={styles.empty}>No appointments scheduled.</Text>
        ) : (
          appointments.map((appt, i) => (
            <TouchableOpacity
              key={i}
              style={styles.card}
              onPress={() =>
                navigation.navigate(MainRoutes.APPOINTMENT_DETAIL, {
                  appointment: appt,
                })
              }
            >
              <Text style={styles.provider}>{appt.provider}</Text>
              <Text style={styles.date}>{appt.date}</Text>
              <Text style={styles.type}>{appt.type}</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate(MainRoutes.SCHEDULE_APPOINTMENT)}
        >
          <Text style={styles.addText}>+ Schedule Appointment</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    color: theme.colors.text,
  },
  empty: {
    marginTop: theme.spacing.lg,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  provider: {
    fontSize: 16,
    fontWeight: "700",
  },
  date: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  type: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: 10,
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
