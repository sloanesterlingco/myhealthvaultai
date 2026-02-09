// src/features/aiAssistant/services/redFlagService.ts

export type RedFlagLevel = "critical" | "danger" | "warning";

export interface RedFlagAlert {
  level: RedFlagLevel;
  message: string;       // MUST exist for your banner
  code?: string | null;
}

export const redFlagService = {
  analyzeMessage(message: string, patient: any): RedFlagAlert[] {
    const alerts: RedFlagAlert[] = [];

    // CRITICAL
    if (/faint|passed out|blackout|can.t breathe|shortness of breath/i.test(message)) {
      alerts.push({
        level: "critical",
        message: "Severe symptoms detected. Immediate medical attention is advised.",
      });
    }

    // DANGER
    if (/bleeding|blood thinner|coumadin|warfarin|hemorrhage/i.test(message)) {
      alerts.push({
        level: "danger",
        message:
          "Serious bleeding risk identified. Contact a healthcare provider promptly.",
      });
    }

    // WARNING
    if (/dizzy|lightheaded|fatigue|nausea/i.test(message)) {
      alerts.push({
        level: "warning",
        message: "Symptoms may require monitoring. Track changes closely.",
      });
    }

    return alerts;
  },
};
