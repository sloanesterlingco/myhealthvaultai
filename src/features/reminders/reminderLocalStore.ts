import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mhvai:schedules:v1";

export type ReminderScheduleIndex = Record<
  string,
  {
    medicationIds?: string[];
    refillIds?: string[];
    appointmentIds?: string[];
  }
>;

export const reminderLocalStore = {
  async getAll(): Promise<ReminderScheduleIndex> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  async setAll(index: ReminderScheduleIndex): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(index));
  },

  async get(key: string) {
    const all = await this.getAll();
    return all[key];
  },

  async set(key: string, value: ReminderScheduleIndex[string]) {
    const all = await this.getAll();
    all[key] = value;
    await this.setAll(all);
  },

  async remove(key: string) {
    const all = await this.getAll();
    delete all[key];
    await this.setAll(all);
  },
};
