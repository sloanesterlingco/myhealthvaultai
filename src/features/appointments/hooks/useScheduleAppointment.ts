// src/features/appointments/hooks/useScheduleAppointment.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useScheduleAppointment = () => {
  const [appointment, setAppointment] = useState({
    provider: "",
    type: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  const { showLoading, hideLoading } = useLoading();
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation();

  const setField = (key, value) => {
    setAppointment((prev) => ({ ...prev, [key]: value }));
  };

  const saveAppointment = async () => {
    if (!appointment.provider || !appointment.date || !appointment.time) {
      showError("Provider, date, and time are required.");
      return;
    }

    try {
      showLoading();
      await patientService.addAppointment(appointment);
      showSuccess("Appointment scheduled!");
      navigation.goBack();
    } catch (err) {
      showError("Error scheduling appointment.");
    } finally {
      hideLoading();
    }
  };

  return {
    appointment,
    setField,
    saveAppointment,
  };
};
