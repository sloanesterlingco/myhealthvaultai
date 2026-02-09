// src/features/providers/hooks/useMyProviders.js

import { useEffect, useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export const useMyProviders = () => {
  const [providers, setProviders] = useState([]);

  const { showLoading, hideLoading } = useLoading();
  const { showError } = useToast();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => 
  {
    try {
      showLoading();
      const list = await patientService.getProviders();
      setProviders(list || []);
    } catch (err) {
      showError("Unable to load providers.");
    } finally {
      hideLoading();
    }
  };

  return {
    providers,
    loadProviders,
  };
};
