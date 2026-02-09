import { notificationService, ScheduledId } from "../../services/notificationService";

export type MedicationReminderConfig = {
  medicationId: string;
  medicationName: string;
  enabled: boolean;
  cadence: "daily" | "twiceDaily";
  time1: { hour: number; minute: number };
  time2?: { hour: number; minute: number };
};

export type RefillReminderConfig = {
  medicationId: string;
  medicationName: string;
  enabled: boolean;
  startDateMs: number;
  daysSupply: number;
  remindDaysBefore: number;
  remindAt: { hour: number; minute: number };
};

export type AppointmentReminderConfig = {
  appointmentId: string;
  title: string;
  enabled: boolean;
  startTimeMs: number;
  remind24h: boolean;
  remind2h: boolean;
};

export const reminderScheduler = {
  async ensureReady(): Promise<boolean> {
    await notificationService.initialize();
    return await notificationService.ensurePermissions();
  },

  async scheduleMedication(cfg: MedicationReminderConfig): Promise<ScheduledId[]> {
    if (!cfg.enabled) return [];
    const ok = await this.ensureReady();
    if (!ok) return [];

    const ids: ScheduledId[] = [];

    ids.push(
      await notificationService.scheduleDaily({
        title: "Medication reminder",
        body: `Time to take ${cfg.medicationName}.`,
        hour: cfg.time1.hour,
        minute: cfg.time1.minute,
        data: { type: "medication", medicationId: cfg.medicationId },
      })
    );

    if (cfg.cadence === "twiceDaily" && cfg.time2) {
      ids.push(
        await notificationService.scheduleDaily({
          title: "Medication reminder",
          body: `Time to take ${cfg.medicationName}.`,
          hour: cfg.time2.hour,
          minute: cfg.time2.minute,
          data: { type: "medication", medicationId: cfg.medicationId },
        })
      );
    }

    return ids;
  },

  async scheduleRefill(cfg: RefillReminderConfig): Promise<ScheduledId[]> {
    if (!cfg.enabled) return [];
    const ok = await this.ensureReady();
    if (!ok) return [];

    const endMs = cfg.startDateMs + cfg.daysSupply * 24 * 60 * 60 * 1000;
    const remindMs = endMs - cfg.remindDaysBefore * 24 * 60 * 60 * 1000;

    const when = new Date(remindMs);
    when.setHours(cfg.remindAt.hour, cfg.remindAt.minute, 0, 0);

    if (when.getTime() <= Date.now() + 5000) return [];

    const id = await notificationService.scheduleOneTime({
      title: "Refill reminder",
      body: `You may be running low on ${cfg.medicationName}. Consider refilling soon.`,
      when,
      data: { type: "refill", medicationId: cfg.medicationId },
    });

    return [id];
  },

  async scheduleAppointment(cfg: AppointmentReminderConfig): Promise<ScheduledId[]> {
    if (!cfg.enabled) return [];
    const ok = await this.ensureReady();
    if (!ok) return [];

    const ids: ScheduledId[] = [];
    const startMs = cfg.startTimeMs;

    const scheduleIfFuture = async (ms: number, label: string) => {
      if (ms <= Date.now() + 5000) return;
      ids.push(
        await notificationService.scheduleOneTime({
          title: "Appointment reminder",
          body: `${cfg.title} (${label})`,
          when: new Date(ms),
          data: { type: "appointment", appointmentId: cfg.appointmentId },
        })
      );
    };

    if (cfg.remind24h) await scheduleIfFuture(startMs - 24 * 60 * 60 * 1000, "in 24 hours");
    if (cfg.remind2h) await scheduleIfFuture(startMs - 2 * 60 * 60 * 1000, "in 2 hours");

    return ids;
  },
};
