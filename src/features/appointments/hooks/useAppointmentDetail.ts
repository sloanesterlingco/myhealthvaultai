// src/features/appointments/hooks/useAppointmentDetail.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { MainRoutes } from "../../../navigation/types";

export const useAppointmentDetail = (initialAppointment) => {
  const [appointment] = useState(initialAppointment);
  const navigation = useNavigation();

  const goToReschedule = () => {
    navigation.navigate(MainRoutes.RESCHEDULE_APPOINTMENT, {
      appointment,
    });
  };

  return {
    appointment,
    goToReschedule,
  };
};
