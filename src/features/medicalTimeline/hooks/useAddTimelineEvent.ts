// src/features/medicalTimeline/hooks/useAddTimelineEvent.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useAddTimelineEvent = () => {
  const [event, setEvent] = useState({
    date: "",
    title: "",
    type: "",
    summary: "",
    notes: "",
  });

  const { showLoading, hideLoading } = useLoading();
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation();

  const setField = (key, value) => {
    setEvent((prev) => ({ ...prev, [key]: value }));
  };

  const saveEvent = async () => {
    if (!event.date || !event.title) {
      showError("Date and title are required.");
      return;
    }

    try {
      showLoading();
      await patientService.addTimelineEvent(event);
      showSuccess("Timeline event added!");
      navigation.goBack();
    } catch (err) {
      showError("Error adding timeline event.");
    } finally {
      hideLoading();
    }
  };

  return {
    event,
    setField,
    saveEvent,
  };
};
