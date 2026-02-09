// src/features/providers/services/terminologyService.ts

export interface TerminologyMatch {
  system: string;      // ICD-10 | SNOMED | HCPCS
  code: string;
  display: string;
}

async function get(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Terminology API error: ${res.status}`);
  return res.json();
}

export const terminologyService = {
  searchIcd10(query: string): Promise<TerminologyMatch[]> {
    return get(`/api/terminology/icd10/search?q=${encodeURIComponent(query)}`);
  },

  searchSnomed(query: string): Promise<TerminologyMatch[]> {
    return get(`/api/terminology/snomed/search?q=${encodeURIComponent(query)}`);
  },

  searchHcpcs(query: string): Promise<TerminologyMatch[]> {
    return get(`/api/terminology/hcpcs/search?q=${encodeURIComponent(query)}`);
  },
};
