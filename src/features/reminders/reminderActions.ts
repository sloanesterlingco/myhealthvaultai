import { notificationService } from "../../services/notificationService";
import { reminderLocalStore } from "./reminderLocalStore";
import {
  AppointmentReminderConfig,
  MedicationReminderConfig,
  RefillReminderConfig,
  reminderScheduler,
} from "./reminderScheduler";

export const reminderActions = {
  async upsertMedication(cfg: MedicationReminderConfig) {
    const key = `medication:${cfg.medicationId}`;

    const existing = await reminderLocalStore.get(key);
    const oldIds = existing?.medicationIds ?? [];
    await notificationService.cancelMany(oldIds);

    const newIds = await reminderScheduler.scheduleMedication(cfg);

    await reminderLocalStore.set(key, { medicationIds: newIds });
    return newIds;
  },

  async upsertRefill(cfg: RefillReminderConfig) {
    const key = `refill:${cfg.medicationId}`;

    const existing = await reminderLocalStore.get(key);
    const oldIds = existing?.refillIds ?? [];
    await notificationService.cancelMany(oldIds);

    const newIds = await reminderScheduler.scheduleRefill(cfg);

    await reminderLocalStore.set(key, { refillIds: newIds });
    return newIds;
  },

  async upsertAppointment(cfg: AppointmentReminderConfig) {
    const key = `appointment:${cfg.appointmentId}`;

    const existing = await reminderLocalStore.get(key);
    const oldIds = existing?.appointmentIds ?? [];
    await notificationService.cancelMany(oldIds);

    const newIds = await reminderScheduler.scheduleAppointment(cfg);

    await reminderLocalStore.set(key, { appointmentIds: newIds });
    return newIds;
  },

  async disableMedication(medicationId: string) {
    const key = `medication:${medicationId}`;
    const existing = await reminderLocalStore.get(key);
    const oldIds = existing?.medicationIds ?? [];
    await notificationService.cancelMany(oldIds);
    await reminderLocalStore.remove(key);
  },

  async disableRefill(medicationId: string) {
    const key = `refill:${medicationId}`;
    const existing = await reminderLocalStore.get(key);
    const oldIds = existing?.refillIds ?? [];
    await notificationService.cancelMany(oldIds);
    await reminderLocalStore.remove(key);
  },

  async disableAppointment(appointmentId: string) {
    const key = `appointment:${appointmentId}`;
    const existing = await reminderLocalStore.get(key);
    const oldIds = existing?.appointmentIds ?? [];
    await notificationService.cancelMany(oldIds);
    await reminderLocalStore.remove(key);
  },
};
