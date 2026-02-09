// src/services/notificationService.ts
//
// Local notifications (v1): medication reminders
// - Device-local only (no server scheduling)
// - Stores scheduled notification IDs in AsyncStorage
// - OFF is always safe (never throws)

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MedicationReminderConfig = {
  medicationId: string;
  notificationId: string;
  hour: number;
  minute: number;
  createdAtIso: string;
};

const STORAGE_PREFIX = "mhva_med_reminder_";
const ANDROID_CHANNEL_ID = "medication-reminders-v1";

function storageKey(medicationId: string) {
  return `${STORAGE_PREFIX}${medicationId}`;
}

export function formatHourMinute(hour: number, minute: number) {
  const h = hour.toString().padStart(2, "0");
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Android requires a notification channel.
 * Safe no-op on iOS.
 */
export async function ensureMedicationReminderChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Medication Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563eb",
  });
}

/**
 * Request notification permissions if needed.
 */
export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const req = await Notifications.requestPermissionsAsync();
  return !!req.granted;
}

export async function getStoredMedicationReminder(
  medicationId: string
): Promise<MedicationReminderConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(medicationId));
    if (!raw) return null;
    return JSON.parse(raw) as MedicationReminderConfig;
  } catch {
    return null;
  }
}

async function storeMedicationReminder(cfg: MedicationReminderConfig) {
  await AsyncStorage.setItem(storageKey(cfg.medicationId), JSON.stringify(cfg));
}

async function clearMedicationReminder(medicationId: string) {
  await AsyncStorage.removeItem(storageKey(medicationId));
}

/**
 * 🔒 SAFE CANCEL
 * - Never throws
 * - Always clears local state
 */
export async function cancelMedicationReminder(
  medicationId: string
): Promise<void> {
  let existing: MedicationReminderConfig | null = null;

  try {
    existing = await getStoredMedicationReminder(medicationId);
  } catch {
    // ignore
  }

  if (existing?.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        existing.notificationId
      );
    } catch {
      // Ignore ALL cancel errors — dev builds often throw here
    }
  }

  // 🔑 Always clear storage, even if cancel failed
  try {
    await clearMedicationReminder(medicationId);
  } catch {
    // ignore
  }
}

/**
 * Schedule a daily repeating reminder.
 * Always replaces any existing reminder.
 */
export async function scheduleDailyMedicationReminder(args: {
  medicationId: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}): Promise<MedicationReminderConfig> {
  await ensureMedicationReminderChannel();

  // Always clean slate first (safe)
  await cancelMedicationReminder(args.medicationId);

  const ok = await ensureNotificationPermissions();
  if (!ok) {
    throw new Error("Notifications permission not granted.");
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: args.title,
      body: args.body,
      sound: true,
    },
    trigger: {
      hour: args.hour,
      minute: args.minute,
      repeats: true,
      channelId:
        Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined,
    } as any,
  });

  const cfg: MedicationReminderConfig = {
    medicationId: args.medicationId,
    notificationId,
    hour: args.hour,
    minute: args.minute,
    createdAtIso: new Date().toISOString(),
  };

  await storeMedicationReminder(cfg);
  return cfg;
}
