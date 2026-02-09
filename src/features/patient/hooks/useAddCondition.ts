import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

export type ConditionDraft = {
  name: string;
  description: string;
  icd10Code: string;
  icd10Display: string;
  codeSystem: string;
};

type FieldKey = keyof ConditionDraft;

export const useAddCondition = () => {
  const [condition, setCondition] = useState<ConditionDraft>({
    name: "",
    description: "",
    icd10Code: "",
    icd10Display: "",
    codeSystem: "ICD-10",
  });

  const { showLoading, hideLoading } = useLoading();
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation<any>();

  const setField = <K extends FieldKey>(key: K, value: ConditionDraft[K]) => {
    setCondition((prev) => ({ ...prev, [key]: value }));
  };

  const saveCondition = async () => {
    if (!condition.name.trim()) {
      showError("Condition name is required.");
      return;
    }

    try {
      showLoading();
      await patientService.addCondition({
        ...condition,
        icd10Display: condition.icd10Display || condition.name,
      });
      showSuccess("Condition added successfully.");
      navigation.goBack();
    } catch (err) {
      showError("Error adding condition.");
    } finally {
      hideLoading();
    }
  };

  return { condition, setField, saveCondition };
};
