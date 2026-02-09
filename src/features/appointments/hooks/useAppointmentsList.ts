// src/features/appointments/hooks/useAppointmentsList.js

import { useEffect, useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useAppointmentsList = () => {
  const [appointments, setAppointments] = useState([]);

  const { showLoading, hideLoading } = useLoading();
  const { showError } = useToast();

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      showLoading();
      const list = await patientService.getAppointments();
      setAppointments(list || []);
    } catch (err) {
      showError("Failed to load appointments.");
    } finally {
      hideLoading();
    }
  };

  return {
    appointments,
    loadAppointments,
  };
};
