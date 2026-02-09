// src/features/patient/services/providerVisitFHIRService.ts

/**
 * Builds a FHIR R4 Bundle representing the provider visit packet.
 */
export async function buildProviderVisitFHIR(visitData: any) {
  const {
    patient,
    conditions,
    hpiNarrative,
    vitals,
    medications,
    symptomsSummary,
    providerNotes,
  } = visitData;

  const makeId = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).substring(2, 10)}`;

  const patientId = patient?.uid || makeId("patient");

  const patientResource = {
    resourceType: "Patient",
    id: patientId,
    name: [
      {
        family: patient?.lastName ?? "",
        given: [patient?.firstName ?? patient?.name ?? ""],
      },
    ],
    birthDate: patient?.dob ?? patient?.dateOfBirth ?? "",
  };

  const conditionResources = (conditions || []).map((c: any) => ({
    resourceType: "Condition",
    id: makeId("condition"),
    subject: { reference: `Patient/${patientId}` },
    code: { text: c.name ?? "Condition" },
    clinicalStatus: c.status
      ? {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
              code: c.status,
            },
          ],
        }
      : undefined,
    onsetString: c.onsetDate ?? "",
  }));

  const observationResources: any[] = [];

  if (vitals) {
    const obs = (code: string, display: string, value: any) => {
      if (!value) return null;
      return {
        resourceType: "Observation",
        id: makeId("obs"),
        status: "final",
        code: {
          coding: [{ system: "http://loinc.org", code, display }],
        },
        subject: { reference: `Patient/${patientId}` },
        valueString: String(value),
      };
    };

    observationResources.push(
      obs("85354-9", "Blood Pressure", vitals.bp ?? vitals.bloodPressure),
      obs("8867-4", "Heart Rate", vitals.heartRate),
      obs("59408-5", "Oxygen", vitals.oxygen ?? vitals.spo2),
      obs("8310-5", "Temperature", vitals.temperature),
      obs("29463-7", "Weight", vitals.weight),
      obs("2339-0", "Glucose", vitals.glucose)
    );
  }

  const cleanObservations = observationResources.filter(Boolean);

  const medicationResources = (medications || []).map((m: any) => ({
    resourceType: "MedicationStatement",
    id: makeId("med"),
    subject: { reference: `Patient/${patientId}` },
    medicationCodeableConcept: { text: m.name ?? m.genericName ?? "Medication" },
    dosage: [
      {
        text:
          [m.dose ?? m.dosage, m.frequency, m.route]
            .filter(Boolean)
            .join(" • ") || undefined,
      },
    ],
    effectivePeriod: {
      start: m.startDate ?? undefined,
      end: m.endDate ?? undefined,
    },
  }));

  const hpiResource = {
    resourceType: "ClinicalImpression",
    id: makeId("hpi"),
    summary: hpiNarrative ?? "",
    description: "AI-generated HPI narrative",
    subject: { reference: `Patient/${patientId}` },
  };

  const symptomResource = symptomsSummary
    ? {
        resourceType: "Observation",
        id: makeId("symptom"),
        status: "final",
        code: { text: "Symptoms Summary" },
        subject: { reference: `Patient/${patientId}` },
        valueString: symptomsSummary,
      }
    : null;

  const providerNoteResource = providerNotes
    ? {
        resourceType: "PractitionerRole",
        id: makeId("providerNote"),
        text: { status: "generated", div: `<div>${providerNotes}</div>` },
      }
    : null;

  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    id: makeId("bundle"),
    entry: [
      { resource: patientResource },
      ...conditionResources.map((r: any) => ({ resource: r })),
      ...cleanObservations.map((r: any) => ({ resource: r })),
      ...medicationResources.map((r: any) => ({ resource: r })),
      { resource: hpiResource },
      symptomResource ? { resource: symptomResource } : null,
      providerNoteResource ? { resource: providerNoteResource } : null,
    ].filter(Boolean),
  };

  return bundle;
}
