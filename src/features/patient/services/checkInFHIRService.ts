// src/features/patient/services/checkInFHIRService.ts

import { PatientProfile } from "../types/PatientProfile";

/**
 * Supported payment models for check-in (Option A — medical industry style).
 */
export type PaymentType =
  | "insurance"
  | "self-pay"
  | "HSA"
  | "FSA"
  | "uninsured";

/**
 * Input to the FHIR builder for front-desk check-in.
 */
export interface CheckInFHIRInput {
  profile: PatientProfile;

  /** Patient payment type for this visit. */
  paymentType: PaymentType;

  /** Reason for visit / chief complaint (free text). */
  chiefComplaint?: string;

  /** ISO datetime string for time of check-in. */
  checkInDateTime?: string;

  /**
   * Base64 encoded insurance card image (optional).
   * e.g. "data:image/jpeg;base64,...." or raw base64 string.
   */
  insuranceCardBase64?: string;
}

/**
 * Build a FHIR R4 transaction Bundle representing a front-desk check-in.
 * This bundle contains ZERO clinical data — ONLY registration fields.
 */
export function buildCheckInFHIR(input: CheckInFHIRInput): any {
  const {
    profile,
    paymentType,
    chiefComplaint,
    checkInDateTime,
    insuranceCardBase64,
  } = input;

  const bundle: any = {
    resourceType: "Bundle",
    type: "transaction",
    entry: [] as any[],
  };

  // FullUrls for internal references
  const patientFullUrl = "urn:uuid:patient";
  const relatedFullUrl = "urn:uuid:related";
  const coverageFullUrl = "urn:uuid:coverage";
  const pharmacyFullUrl = "urn:uuid:pharmacy";
  const encounterFullUrl = "urn:uuid:encounter";

  // Helper to add entry to bundle
  function addEntry(
    resource: any,
    request: { method: "POST" | "PUT"; url: string },
    fullUrl?: string
  ) {
    const entry: any = { resource, request };
    if (fullUrl) entry.fullUrl = fullUrl;
    bundle.entry.push(entry);
  }

  // -----------------------------------------------------------
  // PATIENT
  // -----------------------------------------------------------
  const patient: any = {
    resourceType: "Patient",
    name: [
      {
        family: profile.lastName,
        given: [profile.firstName],
      },
    ],
    birthDate: profile.dateOfBirth,
    telecom: profile.phone
      ? [
          {
            system: "phone",
            value: profile.phone,
          },
        ]
      : undefined,
  };

  addEntry(patient, { method: "POST", url: "Patient" }, patientFullUrl);

  // -----------------------------------------------------------
  // EMERGENCY CONTACT (RelatedPerson)
  // -----------------------------------------------------------
  if (profile.emergencyName || profile.emergencyPhone) {
    const related: any = {
      resourceType: "RelatedPerson",
      patient: { reference: patientFullUrl },
      relationship: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0131",
              code: "E",
              display: "Emergency Contact",
            },
          ],
        },
      ],
      name: profile.emergencyName
        ? [{ text: profile.emergencyName }]
        : undefined,
      telecom: profile.emergencyPhone
        ? [
            {
              system: "phone",
              value: profile.emergencyPhone,
            },
          ]
        : undefined,
    };

    addEntry(related, { method: "POST", url: "RelatedPerson" }, relatedFullUrl);
  }

  // -----------------------------------------------------------
  // COVERAGE (Insurance / Self-pay / HSA / FSA / Uninsured)
  // -----------------------------------------------------------
  const coverage = buildCoverageResource(profile, paymentType);
  if (coverage) {
    addEntry(coverage, { method: "POST", url: "Coverage" }, coverageFullUrl);
  }

  // -----------------------------------------------------------
  // PHARMACY (Organization)
  // -----------------------------------------------------------
  if (profile.pharmacyName || profile.pharmacyAddress) {
    const org: any = {
      resourceType: "Organization",
      name: profile.pharmacyName || undefined,
      address: profile.pharmacyAddress
        ? [
            {
              text: profile.pharmacyAddress,
            },
          ]
        : undefined,
    };

    addEntry(org, { method: "POST", url: "Organization" }, pharmacyFullUrl);
  }

  // -----------------------------------------------------------
  // ENCOUNTER
  // -----------------------------------------------------------
  const encounter: any = {
    resourceType: "Encounter",
    status: "planned",
    class: { code: "AMB" },
    subject: { reference: patientFullUrl },
    reasonCode: chiefComplaint
      ? [
          {
            text: chiefComplaint,
          },
        ]
      : undefined,
    period: checkInDateTime
      ? { start: checkInDateTime }
      : undefined,
  };

  addEntry(encounter, { method: "POST", url: "Encounter" }, encounterFullUrl);

  // -----------------------------------------------------------
  // INSURANCE CARD (DocumentReference)
  // -----------------------------------------------------------
  if (insuranceCardBase64 && insuranceCardBase64.trim() !== "") {
    const attachment: any = {};

    if (insuranceCardBase64.startsWith("data:")) {
      const [meta, base64] = insuranceCardBase64.split(",");
      attachment.data = base64;
      attachment.contentType = meta.split(";")[0].replace("data:", "");
    } else {
      attachment.data = insuranceCardBase64;
      attachment.contentType = "image/jpeg";
    }

    const docRef: any = {
      resourceType: "DocumentReference",
      status: "current",
      type: {
        coding: [
          {
            system: "http://loinc.org",
            code: "64288-2",
            display: "Insurance card",
          },
        ],
      },
      subject: { reference: patientFullUrl },
      content: [{ attachment }],
    };

    addEntry(docRef, { method: "POST", url: "DocumentReference" });
  }

  // -----------------------------------------------------------
  // PROVENANCE
  // -----------------------------------------------------------
  const provenance: any = {
    resourceType: "Provenance",
    target: [{ reference: patientFullUrl }],
    recorded: new Date().toISOString(),
    agent: [
      {
        type: { text: "patient-generated-data" },
        who: { display: "MyHealthVaultAI App" },
      },
    ],
  };

  addEntry(provenance, { method: "POST", url: "Provenance" });

  return bundle;
}

/* ------------------------------------------------------------------------- */
/*   Coverage builders                                                       */
/* ------------------------------------------------------------------------- */

function buildCoverageResource(
  profile: PatientProfile,
  paymentType: PaymentType
): any | null {
  const base: any = {
    resourceType: "Coverage",
    status: "active",
  };

  switch (paymentType) {
    case "insurance":
      if (!profile.insuranceProvider && !profile.memberId) return null;
      return {
        ...base,
        payor: [{ display: profile.insuranceProvider || "Insurance" }],
        subscriberId: profile.memberId || undefined,
      };

    case "self-pay":
      return {
        ...base,
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/coverage-type",
              code: "self",
              display: "Self-pay",
            },
          ],
        },
        payor: [{ display: "Self" }],
      };

    case "HSA":
    case "FSA":
      return {
        ...base,
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/coverage-type",
              code: "account",
              display: "Medical Spending Account",
            },
          ],
        },
        class: [
          {
            type: { text: "Account Type" },
            value: paymentType,
          },
        ],
        payor: [{ display: "Health Spending Account" }],
      };

    case "uninsured":
      return {
        ...base,
        status: "inactive",
        type: {
          coding: [
            {
              system:
                "http://hl7.org/fhir/us/core/CodeSystem/us-core-coverage-type",
              code: "uninsured",
              display: "Uninsured",
            },
          ],
        },
        payor: [{ display: "None" }],
      };

    default:
      return null;
  }
}
