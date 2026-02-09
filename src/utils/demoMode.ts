import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "demoModeEnabled:v1";

export async function getDemoModeEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "true";
  } catch {
    return false;
  }
}

export async function setDemoModeEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, enabled ? "true" : "false");
  } catch {
    // no-op
  }
}
