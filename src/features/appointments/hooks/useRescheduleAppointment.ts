// src/features/appointments/hooks/useRescheduleAppointment.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useRescheduleAppointment = (initialAppointment) => {
  const [appointment, setAppointment] = useState(initialAppointment);

  const { showLoading, hideLoading } = useLoading();
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation();

  const setField = (key, value) => {
    setAppointment((prev) => ({ ...prev, [key]: value }));
  };

  const saveChanges = async () => {
    if (!appointment.date || !appointment.time) {
      showError("Date and time are required.");
      return;
    }

    try {
      showLoading();
      await patientService.updateAppointment(appointment.id, appointment);
      showSuccess("Appointment rescheduled!");
      navigation.goBack();
    } catch (err) {
      showError("Error rescheduling appointment.");
    } finally {
      hideLoading();
    }
  };

  return {
    appointment,
    setField,
    saveChanges,
  };
};
