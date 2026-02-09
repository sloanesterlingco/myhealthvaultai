// src/features/ocr/navigation/OCRStackNavigator.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LabOCRReviewScreen from "../LabOCRReviewScreen";
import MedicationOCRReviewScreen from "../MedicationOCRReviewScreen";
import { OCRStackParamList } from "./ocrRoutes";

const Stack = createNativeStackNavigator<OCRStackParamList>();

export default function OCRStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LabOCRReview"
        component={LabOCRReviewScreen as any}
        options={{ title: "Review Lab Results" }}
      />
      <Stack.Screen
        name="MedicationOCRReview"
        component={MedicationOCRReviewScreen as any}
        options={{ title: "Review Medication" }}
      />
    </Stack.Navigator>
  );
}
