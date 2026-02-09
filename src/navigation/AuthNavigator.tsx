// src/navigation/AuthNavigator.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthRoutes, type AuthStackParamList } from "./types";

import SignInScreen from "../features/auth/screens/SignInScreen";
import SignUpScreen from "../features/auth/screens/SignUpScreen";
import ForgotPasswordScreen from "../features/auth/screens/ForgotPasswordScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={AuthRoutes.SIGN_IN} component={SignInScreen} />
      <Stack.Screen name={AuthRoutes.SIGN_UP} component={SignUpScreen} />
      <Stack.Screen name={AuthRoutes.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
