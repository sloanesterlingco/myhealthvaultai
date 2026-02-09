// src/features/hpi/utils/hpiSchema.ts

export type HPIData = {
  chiefComplaint: string;
  onset: string;
  location: string;
  duration: string;
  severity: number;
  quality: string;
  context: string;
  modifyingFactors: string;
  associatedSymptoms: string[];
  radiation: string;
  timing: string;
  createdAt: number;
  updatedAt: number;
};
