// Simple proxy-based code completion helper.
// NOTE: This intentionally does NOT import 'openai' (no API keys in RN).

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function generateCodeCompletion(prompt: string): Promise<string> {
  if (!API_BASE_URL) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  const res = await fetch(`${API_BASE_URL}/ai/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Code AI failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return String((data as any).text ?? (data as any).completion ?? "");
}
