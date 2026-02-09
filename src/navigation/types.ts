// src/navigation/types.ts
import type { TimelineEvent } from "../features/medicalTimeline/services/timelineTypes";

/** Top-level app routes used by AppNavigator */
export enum AppRoutes {
  AUTH_GATE = "AuthGate",
  AUTH = "Auth",
  MAIN = "Main",
}

/** Auth flow routes */
export enum AuthRoutes {
  SIGN_IN = "SignIn",
  SIGN_UP = "SignUp",
  FORGOT_PASSWORD = "ForgotPassword",
  TWO_FACTOR_SETUP = "TwoFactorSetup",
  TWO_FACTOR_VERIFY = "TwoFactorVerify",
}

/** Main app stack routes */
export enum MainRoutes {
  // Root for bottom tabs
  MAIN_TABS = "MainTabs",

  // Share import (Visit Recorder → Share → MyHealthVaultAI)
  VISIT_RECORDER_IMPORT = "VisitRecorderImport",

  // Tabs
  DASHBOARD_TAB = "DashboardTab",
  AI_HOME_TAB = "AiHomeTab",
  VITALS_TAB = "VitalsTab",
  TIMELINE_TAB = "TimelineTab",
  RECORDS_VAULT_TAB = "RecordsVaultTab",
  MEDICATIONS_TAB = "MedicationsTab",

  // Stack home screens
  DASHBOARD = "Dashboard",
  AI_HOME = "AiHome",
  VITALS = "Vitals",
  MEDICAL_TIMELINE = "MedicalTimeline",
  RECORDS_VAULT = "RecordsVault",
  MEDICATIONS_LIST = "MedicationsList",

  DAILY_NOTES_LIST = "DailyNotesList",
  DAILY_NOTE_EDIT = "DailyNoteEdit",
  PRE_VISIT_PACK = "PreVisitPack",

  // ✅ Demographics HUB (canonical)
  DEMOGRAPHICS_INTRO = "DemographicsIntro",

  /**
   * ✅ Deprecated alias (keep for backwards compatibility)
   * Any old code that still navigates to PatientProfile will compile.
   * In TabNavigator/MainNavigator we will point this route to DemographicsIntroScreen.
   */
  PATIENT_PROFILE = "PatientProfile",

  ADD_CONDITION = "AddCondition",

  // ✅ NEW: Start of chart workflow (should come BEFORE PMH)
  ADD_SYMPTOM = "AddSymptom",

  // Chart setup manual screens
  PAST_MEDICAL_HISTORY = "PastMedicalHistory",
  PAST_SURGICAL_HISTORY = "PastSurgicalHistory",
  FAMILY_HISTORY = "FamilyHistory",
  SOCIAL_HISTORY = "SocialHistory",
  ALLERGIES_SETUP = "AllergiesSetup",
  MEDICATIONS_SETUP = "MedicationsSetup",

  // Profile (may still exist in codebase; we can retire later)
  EDIT_PROFILE = "EditProfile",
  EMERGENCY_CONTACTS = "EmergencyContacts",
  INSURANCE_DETAILS = "InsuranceDetails",
  PROFILE_SETTINGS = "ProfileSettings",

  // HPI Review
  HPI_REVIEW = "HPIReview",

  // Providers
  MY_PROVIDERS = "MyProviders",
  PROVIDER_DETAIL = "ProviderDetail",
  ADD_PROVIDER = "AddProvider",
  EDIT_PROVIDER = "EditProvider",
  PROVIDER_CARD_SCANNER = "ProviderCardScanner",

  // Appointments
  APPOINTMENTS_LIST = "AppointmentsList",
  APPOINTMENT_DETAIL = "AppointmentDetail",
  SCHEDULE_APPOINTMENT = "ScheduleAppointment",
  RESCHEDULE_APPOINTMENT = "RescheduleAppointment",

  // Medications deep
  MEDICATION_DETAIL = "MedicationDetail",
  ADD_MEDICATION = "AddMedication",
  EDIT_MEDICATION = "EditMedication",
  MEDICATION_OCR_IMPORT = "MedicationOcrImport",
  MEDICATION_OCR_REVIEW = "MedicationOcrReview",

  // Labs
  LAB_RESULTS_LIST = "LabResultsList",
  LAB_RESULT_DETAIL = "LabResultDetail",
  ADD_LAB_RESULT = "AddLabResult",
  EDIT_LAB_RESULT = "EditLabResult",

  // Lab OCR + Trends
  LAB_OCR_IMPORT = "LabOcrImport",
  LAB_TRENDS = "LabTrends",

  // Lab OCR Review
  LAB_OCR_REVIEW = "LabOcrReview",

  // Timeline deep screens
  TIMELINE_EVENT_DETAIL = "TimelineEventDetail",
  ADD_TIMELINE_EVENT = "AddTimelineEvent",
  EDIT_TIMELINE_EVENT = "EditTimelineEvent",

  // AI
  AI_CHAT = "AiChat",
  CHART_SETUP_INTRO = "ChartSetupIntro",
  CHART_SETUP_AI_CHAT = "ChartSetupAiChat",
  CHART_SETUP_REVIEW = "ChartSetupReview",
  PROVIDER_SUMMARY = "ProviderSummary",

  // Records deep screens
  RECORD_DETAIL = "RecordDetail",
  UPLOAD_RECORD = "UploadRecord",

  // Vitals deep screens
  VITALS_DETAIL = "VitalsDetail",
  VITALS_HISTORY = "VitalsHistory",
  VITAL_TYPE_PICKER = "VitalTypePicker",
  ADD_VITAL = "AddVital",

  // Bluetooth
  BLUETOOTH_DEVICE = "BluetoothDevice",

  // Check-in
  CHECKIN = "CheckIn",
  CHECKIN_CONFIRM = "CheckInConfirm",
  CHECKIN_QR = "CheckInQR",
  DIGITAL_INSURANCE_CARD = "DigitalInsuranceCard",
  CHECKIN_SUCCESS = "CheckInSuccess",
}

/** Root stack params */
export type RootStackParamList = {
  [AppRoutes.AUTH_GATE]: undefined;
  [AppRoutes.AUTH]: undefined;
  [AppRoutes.MAIN]: undefined;
};

/** Tabs param list */
export type TabParamList = {
  [MainRoutes.DASHBOARD_TAB]: undefined;
  [MainRoutes.AI_HOME_TAB]: undefined;
  [MainRoutes.VITALS_TAB]: undefined;
  [MainRoutes.TIMELINE_TAB]: undefined;
  [MainRoutes.RECORDS_VAULT_TAB]: undefined;
  [MainRoutes.MEDICATIONS_TAB]: undefined;
};

/** Main stack params (used by TabNavigator stacks + MainNavigator) */
export type MainRoutesParamList = {
  [MainRoutes.MAIN_TABS]: undefined;

  // Share import
  [MainRoutes.VISIT_RECORDER_IMPORT]:
    | undefined
    | {
        sharedText?: string;
        sharedUrl?: string;
        mimeType?: string;
        sourceApp?: string;
      };

  // Tabs
  [MainRoutes.DASHBOARD_TAB]: undefined;
  [MainRoutes.AI_HOME_TAB]: undefined;
  [MainRoutes.VITALS_TAB]: undefined;
  [MainRoutes.TIMELINE_TAB]: undefined;
  [MainRoutes.RECORDS_VAULT_TAB]: undefined;
  [MainRoutes.MEDICATIONS_TAB]: undefined;

  // Stack home screens
  [MainRoutes.DASHBOARD]: undefined;
  [MainRoutes.AI_HOME]: undefined;
  [MainRoutes.VITALS]: undefined;
  [MainRoutes.MEDICAL_TIMELINE]: undefined;
  [MainRoutes.RECORDS_VAULT]: undefined;
  [MainRoutes.MEDICATIONS_LIST]: undefined;

  // Daily notes / Pre-visit
  [MainRoutes.DAILY_NOTES_LIST]: undefined;
  [MainRoutes.DAILY_NOTE_EDIT]: { noteId?: string } | undefined;
  [MainRoutes.PRE_VISIT_PACK]: undefined;

  // ✅ Demographics hub (canonical)
  [MainRoutes.DEMOGRAPHICS_INTRO]: undefined;

  // ✅ Deprecated alias route (still supported)
  [MainRoutes.PATIENT_PROFILE]: undefined;

  [MainRoutes.ADD_CONDITION]: undefined;

  // ✅ NEW start step
  [MainRoutes.ADD_SYMPTOM]: { patientId?: string } | undefined;

  // Manual chart setup
  [MainRoutes.PAST_MEDICAL_HISTORY]: undefined;
  [MainRoutes.PAST_SURGICAL_HISTORY]: undefined;
  [MainRoutes.FAMILY_HISTORY]: undefined;
  [MainRoutes.SOCIAL_HISTORY]: undefined;
  [MainRoutes.ALLERGIES_SETUP]: undefined;
  [MainRoutes.MEDICATIONS_SETUP]: undefined;

  // Profile (may still exist; can remove later)
  [MainRoutes.EDIT_PROFILE]: undefined;
  [MainRoutes.EMERGENCY_CONTACTS]: undefined;
  [MainRoutes.INSURANCE_DETAILS]: undefined;
  [MainRoutes.PROFILE_SETTINGS]: undefined;

  // HPI Review
  [MainRoutes.HPI_REVIEW]: undefined;

  // Providers
  [MainRoutes.MY_PROVIDERS]: undefined;
  [MainRoutes.PROVIDER_DETAIL]: undefined;
  [MainRoutes.ADD_PROVIDER]: undefined;
  [MainRoutes.EDIT_PROVIDER]: undefined;
  [MainRoutes.PROVIDER_CARD_SCANNER]: undefined;

  // Appointments
  [MainRoutes.APPOINTMENTS_LIST]: undefined;
  [MainRoutes.APPOINTMENT_DETAIL]: undefined;
  [MainRoutes.SCHEDULE_APPOINTMENT]: undefined;
  [MainRoutes.RESCHEDULE_APPOINTMENT]: undefined;

  // Medications deep
  [MainRoutes.MEDICATION_DETAIL]: any;
  [MainRoutes.ADD_MEDICATION]: undefined;
  [MainRoutes.EDIT_MEDICATION]: any;
  [MainRoutes.MEDICATION_OCR_IMPORT]: { documentType: "medication_label" };
  [MainRoutes.MEDICATION_OCR_REVIEW]: { result: any };

  // Labs
  [MainRoutes.LAB_RESULTS_LIST]: undefined;
  [MainRoutes.LAB_RESULT_DETAIL]: undefined;
  [MainRoutes.ADD_LAB_RESULT]: undefined;
  [MainRoutes.EDIT_LAB_RESULT]: undefined;

  // OCR
  [MainRoutes.LAB_OCR_IMPORT]: undefined;
  [MainRoutes.LAB_OCR_REVIEW]: any;
  [MainRoutes.LAB_TRENDS]: undefined;

  // Timeline
  [MainRoutes.TIMELINE_EVENT_DETAIL]: { event: TimelineEvent };
  [MainRoutes.ADD_TIMELINE_EVENT]: undefined;
  [MainRoutes.EDIT_TIMELINE_EVENT]: { event: TimelineEvent };

  // AI
  [MainRoutes.AI_CHAT]: undefined;
  [MainRoutes.CHART_SETUP_INTRO]: undefined;
  [MainRoutes.CHART_SETUP_AI_CHAT]: undefined;
  [MainRoutes.CHART_SETUP_REVIEW]: undefined;
  [MainRoutes.PROVIDER_SUMMARY]: undefined;

  // Records
  [MainRoutes.RECORD_DETAIL]: any;
  [MainRoutes.UPLOAD_RECORD]: undefined;

  // Vitals
  [MainRoutes.VITALS_DETAIL]: any;
  [MainRoutes.VITALS_HISTORY]: undefined;
  [MainRoutes.VITAL_TYPE_PICKER]: undefined;
  [MainRoutes.ADD_VITAL]: undefined;

  // Bluetooth
  [MainRoutes.BLUETOOTH_DEVICE]: undefined;

  // Check-in
  [MainRoutes.CHECKIN]: undefined;
  [MainRoutes.CHECKIN_CONFIRM]: undefined;
  [MainRoutes.CHECKIN_QR]: undefined;
  [MainRoutes.DIGITAL_INSURANCE_CARD]: undefined;
  [MainRoutes.CHECKIN_SUCCESS]: undefined;
};
