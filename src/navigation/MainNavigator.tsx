// src/navigation/MainNavigator.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainRoutes, MainRoutesParamList } from "./types";

import TabNavigator from "./TabNavigator";

// Profile/insurance (feature/profile)
import EmergencyContactsScreen from "../features/profile/screens/EmergencyContactsScreen";
import InsuranceDetailsScreen from "../features/profile/screens/InsuranceDetailsScreen";
import ProfileSettingsScreen from "../features/profile/screens/ProfileSettingsScreen";

// Check-in flow
import CheckInScreen from "../features/patient/screens/CheckInScreen";
import CheckInConfirmScreen from "../features/patient/screens/CheckInConfirmScreen";
import CheckInQRScreen from "../features/patient/screens/CheckInQRScreen";
import CheckInSuccessScreen from "../features/patient/screens/CheckInSuccessScreen";
import DigitalInsuranceCardScreen from "../features/patient/screens/DigitalInsuranceCardScreen";

// Visit Recorder share import (if you have it wired)
import VisitRecorderImportScreen from "../features/visitRecorder/screens/VisitRecorderImportScreen";

const Stack = createNativeStackNavigator<MainRoutesParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* ✅ Tabs are the main hub */}
      <Stack.Screen name={MainRoutes.MAIN_TABS} component={TabNavigator} />

      {/* Global (no tab bar) */}
      <Stack.Screen
        name={MainRoutes.EMERGENCY_CONTACTS}
        component={EmergencyContactsScreen}
      />
      <Stack.Screen
        name={MainRoutes.INSURANCE_DETAILS}
        component={InsuranceDetailsScreen}
      />
      <Stack.Screen
        name={MainRoutes.PROFILE_SETTINGS}
        component={ProfileSettingsScreen}
      />

      {/* Check-in */}
      <Stack.Screen name={MainRoutes.CHECKIN} component={CheckInScreen} />
      <Stack.Screen
        name={MainRoutes.CHECKIN_CONFIRM}
        component={CheckInConfirmScreen}
      />
      <Stack.Screen name={MainRoutes.CHECKIN_QR} component={CheckInQRScreen} />
      <Stack.Screen
        name={MainRoutes.DIGITAL_INSURANCE_CARD}
        component={DigitalInsuranceCardScreen}
      />
      <Stack.Screen
        name={MainRoutes.CHECKIN_SUCCESS}
        component={CheckInSuccessScreen}
      />

      {/* Share import */}
      <Stack.Screen
        name={MainRoutes.VISIT_RECORDER_IMPORT}
        component={VisitRecorderImportScreen}
      />
    </Stack.Navigator>
  );
}
