// src/features/providers/hooks/useProviderDetail.js

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useToast } from "../../../hooks/useToast";
import { MainRoutes } from "../../../navigation/types";

export const useProviderDetail = (provider) => {
  const [data] = useState(provider);
  const { showSuccess } = useToast();
  const navigation = useNavigation();

  const goToEdit = () => {
    navigation.navigate(MainRoutes.EDIT_PROVIDER, { provider: data });
  };

  return {
    provider: data,
    goToEdit,
  };
};
