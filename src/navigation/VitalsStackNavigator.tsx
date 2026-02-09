// src/navigation/VitalsStackNavigator.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainRoutes, MainRoutesParamList } from "./types";

import VitalsScreen from "../features/vitals/screens/VitalsScreen";
import VitalTypePickerScreen from "../features/vitals/screens/VitalTypePickerScreen";
import AddVitalScreen from "../features/vitals/screens/AddVitalScreen";
import VitalsDetailScreen from "../features/vitals/screens/VitalsDetailScreen";
import VitalsHistoryScreen from "../features/vitals/screens/VitalsHistoryScreen";

const Stack = createNativeStackNavigator<MainRoutesParamList>();

export default function VitalsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={MainRoutes.VITALS} component={VitalsScreen} />
      <Stack.Screen
        name={MainRoutes.VITAL_TYPE_PICKER}
        component={VitalTypePickerScreen}
      />
      <Stack.Screen name={MainRoutes.ADD_VITAL} component={AddVitalScreen} />
      <Stack.Screen
        name={MainRoutes.VITALS_DETAIL}
        component={VitalsDetailScreen}
      />
      <Stack.Screen
        name={MainRoutes.VITALS_HISTORY}
        component={VitalsHistoryScreen}
      />
    </Stack.Navigator>
  );
}
