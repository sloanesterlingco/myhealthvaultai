import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "MHVA_PENDING_SHARE_TEXT";

export async function setPendingShareText(text: string) {
  const cleaned = (text || "").trim();
  if (!cleaned) return;
  await AsyncStorage.setItem(KEY, cleaned);
}

export async function getPendingShareText(): Promise<string | null> {
  const v = await AsyncStorage.getItem(KEY);
  return v?.trim() ? v.trim() : null;
}

export async function clearPendingShareText() {
  await AsyncStorage.removeItem(KEY);
}
