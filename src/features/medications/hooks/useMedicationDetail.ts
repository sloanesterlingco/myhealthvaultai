// src/features/medications/hooks/useMedicationDetail.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { MainRoutes } from "../../../navigation/types";

export const useMedicationDetail = (initialMedication) => {
  const [medication] = useState(initialMedication);
  const navigation = useNavigation();

  const goToEdit = () => {
    navigation.navigate(MainRoutes.EDIT_MEDICATION, {
      medication,
    });
  };

  return {
    medication,
    goToEdit,
  };
};
