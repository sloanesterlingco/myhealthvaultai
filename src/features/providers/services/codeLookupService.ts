// src/features/providers/services/codeLookupService.ts

export interface CodeResult {
  system: "icd10" | "cpt";
  code: string;
  display: string;
}

/**
 * IMPORTANT:
 * - This should hit YOUR backend/CMS search endpoint (not OpenAI).
 * - Endpoint expected: GET https://your-api.com/cms/icd10/search?q=...
 *
 * Expected response shapes supported:
 *  1) { results: Array<{ code: string; display: string }> }
 *  2) Array<{ code: string; display: string }>
 *  3) { items: Array<{ code: string; display: string }> }
 *
 * If your API differs, adjust `extractResults()`.
 */

const ICD10_ENDPOINT = "https://your-api.com/cms/icd10/search";

function normalizeText(v: any) {
  return String(v ?? "").trim();
}

function extractResults(json: any): Array<{ code: string; display: string }> {
  if (!json) return [];

  const arr =
    Array.isArray(json) ? json :
    Array.isArray(json.results) ? json.results :
    Array.isArray(json.items) ? json.items :
    [];

  return arr
    .map((r: any) => ({
      code: normalizeText(r.code ?? r.icd10 ?? r.icd10Code),
      display: normalizeText(r.display ?? r.description ?? r.name),
    }))
    .filter((r: any) => r.code && r.display);
}

export async function searchIcd10(query: string): Promise<CodeResult[]> {
  const q = normalizeText(query);
  if (!q) return [];

  try {
    const res = await fetch(`${ICD10_ENDPOINT}?q=${encodeURIComponent(q)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.log("ICD10 search failed:", res.status);
      return [];
    }

    const json = await res.json();
    const rows = extractResults(json);

    return rows.map((r) => ({
      system: "icd10",
      code: r.code,
      display: r.display,
    }));
  } catch (e) {
    console.log("ICD10 search error:", e);
    return [];
  }
}

/**
 * CPT search:
 * Keep as a stub unless you have a CPT endpoint.
 * (CPT is licensed; don’t ship a full CPT index in app unless you’re licensed.)
 */
export async function searchCpt(_query: string): Promise<CodeResult[]> {
  return [];
}
