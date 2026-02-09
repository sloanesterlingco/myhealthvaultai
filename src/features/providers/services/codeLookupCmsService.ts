export type CodeResult = {
  code: string;
  display: string;
  system?: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function searchIcd10Cms(q: string): Promise<CodeResult[]> {
  const query = q.trim();
  if (!query) return [];
  if (!API_BASE_URL) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  const res = await fetch(
    `${API_BASE_URL}/cms/icd10/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ICD-10 search failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as any).results)
    ? (data as any).results
    : [];

  return raw
    .map((r: any) => ({
      code: String(r.code ?? r.icd10Code ?? r.icd10 ?? "").trim(),
      display: String(r.display ?? r.description ?? r.title ?? "").trim(),
      system: r.system ? String(r.system) : "ICD-10-CM",
    }))
    .filter((r: CodeResult) => r.code.length > 0 && r.display.length > 0);
}
