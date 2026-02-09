// src/features/medicalTimeline/hooks/useEditTimelineEvent.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useEditTimelineEvent = (initialEvent) => {
  const [event, setEvent] = useState(initialEvent);
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
      await patientService.updateTimelineEvent(event.id, event);
      showSuccess("Timeline event updated!");
      navigation.goBack();
    } catch (err) {
      showError("Error updating timeline event.");
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
