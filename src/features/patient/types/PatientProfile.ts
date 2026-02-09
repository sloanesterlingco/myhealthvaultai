// src/features/patient/types/PatientProfile.ts

export interface PatientProfile {
  uid: string;

  // Basic demographics
  firstName: string;
  lastName: string;
  dateOfBirth: string;   // ISO date string
  phone: string;

  // Emergency contact
  emergencyName: string;
  emergencyPhone: string;

  // Pharmacy
  pharmacyName: string;
  pharmacyAddress: string;

  // Insurance
  insuranceProvider: string;
  memberId: string;
  insuranceCardUri?: string; // optional image URI

  // System fields
  createdAt?: any;
  updatedAt?: any;
}
