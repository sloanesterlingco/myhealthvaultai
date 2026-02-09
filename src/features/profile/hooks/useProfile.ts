// src/features/profile/hooks/useProfile.js

import { useEffect, useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useProfile = () => {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    dateOfBirth: "",
  });

  const { showLoading, hideLoading } = useLoading();
  const { showError } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      showLoading();
      const data = await patientService.getPatientProfile();
      if (data) {
        setProfile({
          name: data.name || "",
          email: data.email || "",
          dateOfBirth: data.dateOfBirth || "",
        });
      }
    } catch (err) {
      showError("Error loading profile.");
    } finally {
      hideLoading();
    }
  };

  return {
    profile,
  };
};
