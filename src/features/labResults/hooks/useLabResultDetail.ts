// src/features/labResults/hooks/useLabResultDetail.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { MainRoutes } from "../../../navigation/types";

export const useLabResultDetail = (initialLabResult) => {
  const [labResult] = useState(initialLabResult);
  const navigation = useNavigation();

  const goToEdit = () => {
    navigation.navigate(MainRoutes.EDIT_LAB_RESULT, { labResult });
  };

  return {
    labResult,
    goToEdit,
  };
};
