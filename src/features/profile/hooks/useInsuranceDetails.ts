import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export const useInsuranceDetails = () => {
  const [insurance, setInsurance] = useState({
    provider: "",
    memberId: "",
    groupNumber: "",
    phone: "",
    frontImage: "",
    backImage: "",
  });

  const setField = (key: string, value: string) => {
    setInsurance((prev) => ({ ...prev, [key]: value }));
  };

  const pickFrontCard = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      setInsurance((prev) => ({ ...prev, frontImage: result.assets[0].uri }));
    }
  };

  const pickBackCard = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      setInsurance((prev) => ({ ...prev, backImage: result.assets[0].uri }));
    }
  };

  const saveInsurance = async () => {
    Alert.alert("Saved", "Insurance info has been updated.");
  };

  return {
    insurance,
    setField,
    saveInsurance,
    pickFrontCard,
    pickBackCard,
  };
};
