// src/navigation/TabNavigator.tsx

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { theme } from "../theme";
import { MainRoutes, TabParamList } from "./types";

// Dashboard
import DashboardScreen from "../features/patient/screens/DashboardScreen";

// Chart / AI (presented as “Chart”)
import AIHomeScreen from "../features/aiAssistant/screens/AIHomeScreen";
import AIChatScreen from "../features/aiAssistant/screens/AIChatScreen";
import ProviderSummaryScreen from "../features/aiAssistant/screens/ProviderSummaryScreen";
import ChartSetupIntroScreen from "../features/aiAssistant/screens/ChartSetupIntroScreen";
import ChartSetupAIChatScreen from "../features/aiAssistant/screens/ChartSetupAIChatScreen";
import ChartSetupReviewScreen from "../features/aiAssistant/screens/ChartSetupReviewScreen";

// Demographics
import DemographicsIntroScreen from "../features/patient/screens/DemographicsIntroScreen";
import PatientProfileScreen from "../features/patient/screens/PatientProfileScreen";

// Patient history flow
import AddSymptomScreen from "../features/patient/screens/AddSymptomScreen";
import PastMedicalHistoryScreen from "../features/patient/screens/PastMedicalHistoryScreen";
import PastSurgicalHistoryScreen from "../features/patient/screens/PastSurgicalHistoryScreen";
import FamilyHistoryScreen from "../features/patient/screens/FamilyHistoryScreen";
import SocialHistoryScreen from "../features/patient/screens/SocialHistoryScreen";
import AllergiesSetupScreen from "../features/patient/screens/AllergiesSetupScreen";
import MedicationsSetupScreen from "../features/patient/screens/MedicationsSetupScreen";

// Vitals
import VitalsScreen from "../features/vitals/screens/VitalsScreen";
import VitalTypePickerScreen from "../features/vitals/screens/VitalTypePickerScreen";
import AddVitalScreen from "../features/vitals/screens/AddVitalScreen";
import VitalsDetailScreen from "../features/vitals/screens/VitalsDetailScreen";
import VitalsHistoryScreen from "../features/vitals/screens/VitalsHistoryScreen";
import BluetoothDeviceScreen from "../features/vitals/screens/BluetoothDeviceScreen";

// Timeline
import MedicalTimelineScreen from "../features/medicalTimeline/screens/MedicalTimelineScreen";
import TimelineEventDetailScreen from "../features/medicalTimeline/screens/TimelineEventDetailScreen";
import AddTimelineEventScreen from "../features/medicalTimeline/screens/AddTimelineEventScreen";
import EditTimelineEventScreen from "../features/medicalTimeline/screens/EditTimelineEventScreen";

// Docs
import RecordsVaultScreen from "../features/records/screens/RecordsVaultScreen";

// Medications
import MedicationsListScreen from "../features/medications/screens/MedicationsListScreen";
import MedicationDetailScreen from "../features/medications/screens/MedicationDetailScreen";
import AddMedicationScreen from "../features/medications/screens/AddMedicationScreen";
import EditMedicationScreen from "../features/medications/screens/EditMedicationScreen";
import MedicationOcrImportScreen from "../features/medications/screens/MedicationOcrImportScreen";
import MedicationOcrReviewScreen from "../features/medications/screens/MedicationOcrReviewScreen";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<any>();

const stackOptions = { headerShown: false };

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name={MainRoutes.DASHBOARD} component={DashboardScreen} />

      {/* Setup / Demographics */}
      <Stack.Screen
        name={MainRoutes.DEMOGRAPHICS_INTRO}
        component={DemographicsIntroScreen}
      />
      <Stack.Screen name={MainRoutes.PATIENT_PROFILE} component={PatientProfileScreen} />

      {/* Manual chart flow (bottom tabs stay visible) */}
      <Stack.Screen name={MainRoutes.ADD_SYMPTOM} component={AddSymptomScreen} />
      <Stack.Screen
        name={MainRoutes.PAST_MEDICAL_HISTORY}
        component={PastMedicalHistoryScreen}
      />
      <Stack.Screen
        name={MainRoutes.PAST_SURGICAL_HISTORY}
        component={PastSurgicalHistoryScreen}
      />
      <Stack.Screen name={MainRoutes.FAMILY_HISTORY} component={FamilyHistoryScreen} />
      <Stack.Screen name={MainRoutes.SOCIAL_HISTORY} component={SocialHistoryScreen} />
      <Stack.Screen name={MainRoutes.ALLERGIES_SETUP} component={AllergiesSetupScreen} />
      <Stack.Screen name={MainRoutes.MEDICATIONS_SETUP} component={MedicationsSetupScreen} />
    </Stack.Navigator>
  );
}

/**
 * Keep the route name AI_HOME_TAB for stability,
 * but present it as the “Chart” tab.
 */
function ChartStack() {
  return (
    <Stack.Navigator
      screenOptions={stackOptions}
      initialRouteName={MainRoutes.CHART_SETUP_INTRO}
    >
      <Stack.Screen name={MainRoutes.CHART_SETUP_INTRO} component={ChartSetupIntroScreen} />
      <Stack.Screen
        name={MainRoutes.CHART_SETUP_AI_CHAT}
        component={ChartSetupAIChatScreen}
      />
      <Stack.Screen name={MainRoutes.CHART_SETUP_REVIEW} component={ChartSetupReviewScreen} />

      {/* ✅ Manual chart flow (so “Start chart / Add Symptom” works from Chart tab) */}
      <Stack.Screen name={MainRoutes.ADD_SYMPTOM} component={AddSymptomScreen} />
      <Stack.Screen
        name={MainRoutes.PAST_MEDICAL_HISTORY}
        component={PastMedicalHistoryScreen}
      />
      <Stack.Screen
        name={MainRoutes.PAST_SURGICAL_HISTORY}
        component={PastSurgicalHistoryScreen}
      />
      <Stack.Screen name={MainRoutes.FAMILY_HISTORY} component={FamilyHistoryScreen} />
      <Stack.Screen name={MainRoutes.SOCIAL_HISTORY} component={SocialHistoryScreen} />
      <Stack.Screen name={MainRoutes.ALLERGIES_SETUP} component={AllergiesSetupScreen} />
      <Stack.Screen name={MainRoutes.MEDICATIONS_SETUP} component={MedicationsSetupScreen} />

      {/* Still available when user taps Ask AI */}
      <Stack.Screen name={MainRoutes.AI_HOME} component={AIHomeScreen} />
      <Stack.Screen name={MainRoutes.AI_CHAT} component={AIChatScreen} />
      <Stack.Screen name={MainRoutes.PROVIDER_SUMMARY} component={ProviderSummaryScreen} />

      {/* Avatar access */}
      <Stack.Screen name={MainRoutes.PATIENT_PROFILE} component={PatientProfileScreen} />
    </Stack.Navigator>
  );
}

function VitalsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name={MainRoutes.VITALS} component={VitalsScreen} />
      <Stack.Screen name={MainRoutes.VITAL_TYPE_PICKER} component={VitalTypePickerScreen} />
      <Stack.Screen name={MainRoutes.ADD_VITAL} component={AddVitalScreen} />
      <Stack.Screen name={MainRoutes.VITALS_DETAIL} component={VitalsDetailScreen} />
      <Stack.Screen name={MainRoutes.VITALS_HISTORY} component={VitalsHistoryScreen} />
      <Stack.Screen name={MainRoutes.BLUETOOTH_DEVICE} component={BluetoothDeviceScreen} />
      <Stack.Screen name={MainRoutes.PATIENT_PROFILE} component={PatientProfileScreen} />
    </Stack.Navigator>
  );
}

function TimelineStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name={MainRoutes.MEDICAL_TIMELINE} component={MedicalTimelineScreen} />
      <Stack.Screen
        name={MainRoutes.TIMELINE_EVENT_DETAIL}
        component={TimelineEventDetailScreen}
      />
      <Stack.Screen name={MainRoutes.ADD_TIMELINE_EVENT} component={AddTimelineEventScreen} />
      <Stack.Screen name={MainRoutes.EDIT_TIMELINE_EVENT} component={EditTimelineEventScreen} />
      <Stack.Screen name={MainRoutes.PATIENT_PROFILE} component={PatientProfileScreen} />
    </Stack.Navigator>
  );
}

function MedicationsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name={MainRoutes.MEDICATIONS_LIST} component={MedicationsListScreen} />
      <Stack.Screen
        name={MainRoutes.MEDICATION_OCR_IMPORT}
        component={MedicationOcrImportScreen}
      />
      <Stack.Screen
        name={MainRoutes.MEDICATION_OCR_REVIEW}
        component={MedicationOcrReviewScreen}
      />
      <Stack.Screen name={MainRoutes.ADD_MEDICATION} component={AddMedicationScreen} />
      <Stack.Screen name={MainRoutes.MEDICATION_DETAIL} component={MedicationDetailScreen} />
      <Stack.Screen name={MainRoutes.EDIT_MEDICATION} component={EditMedicationScreen} />
      <Stack.Screen name={MainRoutes.PATIENT_PROFILE} component={PatientProfileScreen} />
    </Stack.Navigator>
  );
}

function RecordsVaultStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name={MainRoutes.RECORDS_VAULT} component={RecordsVaultScreen} />
      <Stack.Screen name={MainRoutes.PATIENT_PROFILE} component={PatientProfileScreen} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const inactive = theme.colors.textSecondary;

        const accents: Record<string, string> = {
          [MainRoutes.DASHBOARD_TAB]: "#0B8E8E", // teal
          [MainRoutes.AI_HOME_TAB]: "#0B8E8E", // teal (Chart)
          [MainRoutes.MEDICATIONS_TAB]: "#334155", // slate
          [MainRoutes.VITALS_TAB]: "#16A34A", // green
          [MainRoutes.TIMELINE_TAB]: "#7C3AED", // purple
          [MainRoutes.RECORDS_VAULT_TAB]: "#475569", // gray-slate
        };

        const iconMap: Record<string, any> = {
          [MainRoutes.DASHBOARD_TAB]: "home",
          [MainRoutes.AI_HOME_TAB]: "edit-3",
          [MainRoutes.MEDICATIONS_TAB]: "layers",
          [MainRoutes.VITALS_TAB]: "activity",
          [MainRoutes.TIMELINE_TAB]: "clock",
          [MainRoutes.RECORDS_VAULT_TAB]: "file-text",
        };

        return {
          headerShown: false,
          tabBarStyle: { height: 70, paddingBottom: 10 },
          tabBarActiveTintColor: "#0B8E8E",
          tabBarInactiveTintColor: inactive,
          tabBarIcon: ({ focused, size }) => {
            const color = focused ? (accents[route.name] ?? theme.colors.brand) : inactive;
            const icon = iconMap[route.name] ?? "circle";
            return <Feather name={icon} size={size ?? 22} color={color} />;
          },
        };
      }}
    >
      <Tab.Screen
        name={MainRoutes.DASHBOARD_TAB}
        component={DashboardStack}
        options={{ title: "Home" }}
      />

      <Tab.Screen
        name={MainRoutes.AI_HOME_TAB}
        component={ChartStack}
        options={{ title: "Chart" }}
      />

      <Tab.Screen
        name={MainRoutes.MEDICATIONS_TAB}
        component={MedicationsStack}
        options={{ title: "Meds" }}
      />

      <Tab.Screen
        name={MainRoutes.VITALS_TAB}
        component={VitalsStack}
        options={{ title: "Vitals" }}
      />

      <Tab.Screen
        name={MainRoutes.TIMELINE_TAB}
        component={TimelineStack}
        options={{ title: "Timeline" }}
      />

      <Tab.Screen
        name={MainRoutes.RECORDS_VAULT_TAB}
        component={RecordsVaultStack}
        options={{ title: "Docs" }}
      />
    </Tab.Navigator>
  );
}
