// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import PDFDocument from "pdfkit";
import type { Request, Response } from "express";

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

const corsHandler = cors({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentType = "insurance" | "self-pay" | "HSA" | "FSA" | "uninsured";

interface PatientProfile {
  uid: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
  insuranceProvider?: string;
  memberId?: string;
}

interface CheckInVitals {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  spo2?: number;
  temperatureF?: number;
  weightLbs?: number;
  glucoseMgDl?: number;
}

interface CheckInFHIRInput {
  profile: PatientProfile;
  paymentType: PaymentType;
  vitals?: CheckInVitals;
  chiefComplaint?: string;
  checkInDateTime?: string;
  insuranceCardBase64?: string;
}

// Provider-side clinical bundle

interface ClinicalMedication {
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
  status?: "active" | "completed" | "stopped";
}

interface ClinicalAllergy {
  substance: string;
  reaction?: string;
  severity?: string;
}

interface ClinicalCondition {
  icd10?: string;
  snomed?: string;
  display: string;
  status?: string;
}

interface ProviderVitals {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  spo2?: number;
  respiratoryRate?: number;
  tempF?: number;
  weightLbs?: number;
  heightIn?: number;
}

interface ProviderLabResult {
  loinc: string;
  display: string;
  value: number | string;
  unit?: string;
}

interface ProviderImaging {
  type: string;
  report?: string;
}

interface ProviderDeviceData {
  type: string;
  value: number | string;
  unit?: string;
  date?: string;
}

interface ProviderClinicalInput {
  profile: PatientProfile;

  encounterId?: string;
  providerId?: string;

  hpi?: string;
  ros?: string;
  assessmentPlan?: string;
  clinicalSummary?: string;

  pmh?: string[];
  psh?: string[];
  medications?: ClinicalMedication[];
  allergies?: ClinicalAllergy[];
  conditions?: ClinicalCondition[];

  vitals?: ProviderVitals;
  labs?: ProviderLabResult[];
  imaging?: ProviderImaging[];

  socialHistory?: string[];
  familyHistory?: string[];

  deviceReadings?: ProviderDeviceData[];

  encounterDate?: string;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function badRequest(res: Response, message: string) {
  res.status(400).json({ error: message });
}

// ---------------------------------------------------------------------------
// ICD SEARCH (stub, CMS-ready)
// ---------------------------------------------------------------------------

export const icdSearch = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      const q = (req.method === "GET" ? req.query.query : req.body.query) || "";
      const limitRaw =
        (req.method === "GET" ? req.query.limit : req.body.limit) || 10;

      const query = String(q).toLowerCase();
      const limit = Math.min(Number(limitRaw) || 10, 50);

      if (!query || query.length < 2) {
        badRequest(res, "query must be at least 2 characters");
        return;
      }

      // Tiny sample table.
      const table = [
        { code: "I10", display: "Essential (primary) hypertension" },
        {
          code: "E11.9",
          display: "Type 2 diabetes mellitus without complications",
        },
        { code: "J45.909", display: "Unspecified asthma, uncomplicated" },
        { code: "E78.5", display: "Hyperlipidemia, unspecified" },
        {
          code: "F32.9",
          display: "Major depressive disorder, single episode, unspecified",
        },
      ];

      const results = table
        .filter(
          (row) =>
            row.code.toLowerCase().includes(query) ||
            row.display.toLowerCase().includes(query)
        )
        .slice(0, limit);

      res.json({ query, results });
    });
  }
);

// ---------------------------------------------------------------------------
// CPT SEARCH (stub)
// ---------------------------------------------------------------------------

export const cptSearch = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      const q = (req.method === "GET" ? req.query.query : req.body.query) || "";
      const limitRaw =
        (req.method === "GET" ? req.query.limit : req.body.limit) || 10;

      const query = String(q).toLowerCase();
      const limit = Math.min(Number(limitRaw) || 10, 50);

      if (!query || query.length < 2) {
        badRequest(res, "query must be at least 2 characters");
        return;
      }

      const table = [
        {
          code: "47562",
          display: "Laparoscopy, surgical; cholecystectomy",
        },
        {
          code: "99213",
          display: "Office/outpatient visit, est. patient, lvl 3",
        },
        { code: "93000", display: "Electrocardiogram, complete" },
        { code: "71046", display: "Chest x-ray, 2 views" },
      ];

      const results = table
        .filter(
          (row) =>
            row.code.toLowerCase().includes(query) ||
            row.display.toLowerCase().includes(query)
        )
        .slice(0, limit);

      res.json({ query, results });
    });
  }
);

// ---------------------------------------------------------------------------
// AI HISTORY NORMALIZATION (no external AI required)
// ---------------------------------------------------------------------------

/**
 * POST { text: string, type: "condition" | "procedure" }
 * Simple normalizer: trims & title-cases, no external API required.
 */
export const aiNormalizeHistory = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      if (req.method !== "POST") {
        res.status(405).send("POST only");
        return;
      }

      const { text, type } = req.body as {
        text?: string;
        type?: "condition" | "procedure";
      };

      if (!text || !type) {
        badRequest(res, "text and type are required");
        return;
      }

      const trimmed = String(text).trim();
      const normalized =
        trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

      // You can later plug in real ICD/CPT engine here.
      res.json({
        normalized,
        candidates: [],
        engine: "simple-normalizer",
      });
    });
  }
);

// ---------------------------------------------------------------------------
// FHIR Helpers
// ---------------------------------------------------------------------------

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
              display: "Medical spending account",
            },
          ],
        },
        class: [
          {
            type: { text: "Account Type" },
            value: paymentType,
          },
        ],
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
      };

    default:
      return null;
  }
}

function buildVitalObservations(
  vitals: CheckInVitals,
  patientRef: string
): any[] {
  const entries: any[] = [];
  const categoryVitalSigns = [
    {
      coding: [
        {
          system:
            "http://terminology.hl7.org/CodeSystem/observation-category",
          code: "vital-signs",
        },
      ],
    },
  ];

  if (vitals.systolicBp != null && vitals.diastolicBp != null) {
    entries.push({
      resourceType: "Observation",
      status: "final",
      category: categoryVitalSigns,
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "85354-9",
            display: "Blood pressure panel",
          },
        ],
      },
      subject: { reference: patientRef },
      component: [
        {
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "8480-6",
                display: "Systolic blood pressure",
              },
            ],
          },
          valueQuantity: {
            value: vitals.systolicBp,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]",
          },
        },
        {
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "8462-4",
                display: "Diastolic blood pressure",
              },
            ],
          },
          valueQuantity: {
            value: vitals.diastolicBp,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]",
          },
        },
      ],
    });
  }

  if (vitals.heartRate != null) {
    entries.push({
      resourceType: "Observation",
      status: "final",
      category: categoryVitalSigns,
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "8867-4",
            display: "Heart rate",
          },
        ],
      },
      subject: { reference: patientRef },
      valueQuantity: {
        value: vitals.heartRate,
        unit: "beats/minute",
        system: "http://unitsofmeasure.org",
        code: "/min",
      },
    });
  }

  if (vitals.spo2 != null) {
    entries.push({
      resourceType: "Observation",
      status: "final",
      category: categoryVitalSigns,
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "59408-5",
            display: "Oxygen saturation",
          },
        ],
      },
      subject: { reference: patientRef },
      valueQuantity: {
        value: vitals.spo2,
        unit: "%",
        system: "http://unitsofmeasure.org",
        code: "%",
      },
    });
  }

  if (vitals.temperatureF != null) {
    entries.push({
      resourceType: "Observation",
      status: "final",
      category: categoryVitalSigns,
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "8310-5",
            display: "Body temperature",
          },
        ],
      },
      subject: { reference: patientRef },
      valueQuantity: {
        value: vitals.temperatureF,
        unit: "°F",
        system: "http://unitsofmeasure.org",
        code: "[degF]",
      },
    });
  }

  if (vitals.weightLbs != null) {
    entries.push({
      resourceType: "Observation",
      status: "final",
      category: categoryVitalSigns,
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "29463-7",
            display: "Body weight",
          },
        ],
      },
      subject: { reference: patientRef },
      valueQuantity: {
        value: vitals.weightLbs,
        unit: "lb",
        system: "http://unitsofmeasure.org",
        code: "[lb_av]",
      },
    });
  }

  if (vitals.glucoseMgDl != null) {
    entries.push({
      resourceType: "Observation",
      status: "final",
      category: categoryVitalSigns,
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "2339-0",
            display: "Glucose [Mass/volume] in Blood",
          },
        ],
      },
      subject: { reference: patientRef },
      valueQuantity: {
        value: vitals.glucoseMgDl,
        unit: "mg/dL",
        system: "http://unitsofmeasure.org",
        code: "mg/dL",
      },
    });
  }

  return entries;
}

function buildCheckInBundle(input: CheckInFHIRInput): any {
  const {
    profile,
    paymentType,
    vitals,
    chiefComplaint,
    checkInDateTime,
    insuranceCardBase64,
  } = input;

  const bundle: any = {
    resourceType: "Bundle",
    type: "transaction",
    entry: [] as any[],
  };

  const patientFullUrl = "urn:uuid:patient";
  const encounterFullUrl = "urn:uuid:encounter";

  const addEntry = (
    resource: any,
    request: { method: "POST" | "PUT"; url: string },
    fullUrl?: string
  ) => {
    const entry: any = { resource, request };
    if (fullUrl) entry.fullUrl = fullUrl;
    bundle.entry.push(entry);
  };

  const patient: any = {
    resourceType: "Patient",
    name: [
      {
        family: profile.lastName,
        given: [profile.firstName],
      },
    ],
    telecom: profile.phone
      ? [
          {
            system: "phone",
            value: profile.phone,
          },
        ]
      : [],
    birthDate: profile.dateOfBirth,
  };

  addEntry(patient, { method: "POST", url: "Patient" }, patientFullUrl);

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
      name: profile.emergencyName ? [{ text: profile.emergencyName }] : undefined,
      telecom: profile.emergencyPhone
        ? [
            {
              system: "phone",
              value: profile.emergencyPhone,
            },
          ]
        : undefined,
    };

    addEntry(related, { method: "POST", url: "RelatedPerson" });
  }

  const coverage = buildCoverageResource(profile, paymentType);
  if (coverage) {
    addEntry(coverage, { method: "POST", url: "Coverage" });
  }

  if (profile.pharmacyName || profile.pharmacyAddress) {
    const org: any = {
      resourceType: "Organization",
      name: profile.pharmacyName || undefined,
      address: profile.pharmacyAddress
        ? [{ text: profile.pharmacyAddress }]
        : undefined,
    };
    addEntry(org, { method: "POST", url: "Organization" });
  }

  const encounter: any = {
    resourceType: "Encounter",
    status: "planned",
    class: { code: "AMB" },
    subject: { reference: patientFullUrl },
    reasonCode: chiefComplaint ? [{ text: chiefComplaint }] : undefined,
    period: checkInDateTime ? { start: checkInDateTime } : undefined,
  };

  addEntry(encounter, { method: "POST", url: "Encounter" }, encounterFullUrl);

  if (vitals) {
    const obs = buildVitalObservations(vitals, patientFullUrl);
    obs.forEach((o) =>
      addEntry(o, { method: "POST", url: "Observation" })
    );
  }

  if (insuranceCardBase64 && insuranceCardBase64.trim()) {
    const attachment: any = {};
    if (insuranceCardBase64.startsWith("data:")) {
      const [meta, data] = insuranceCardBase64.split(",");
      attachment.data = data;
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

function buildProviderBundle(input: ProviderClinicalInput): any {
  const {
    profile,
    encounterId = `enc-${Date.now()}`,
    hpi,
    ros,
    assessmentPlan,
    clinicalSummary,
    pmh = [],
    psh = [],
    medications = [],
    allergies = [],
    conditions = [],
    vitals,
    labs = [],
    imaging = [],
    socialHistory = [],
    familyHistory = [],
    encounterDate = new Date().toISOString(),
  } = input;

  const bundle: any = {
    resourceType: "Bundle",
    type: "collection",
    entry: [] as any[],
  };

  const add = (resource: any) => bundle.entry.push({ resource });

  add({
    resourceType: "Patient",
    id: profile.uid,
    name: [{ family: profile.lastName, given: [profile.firstName] }],
    telecom: profile.phone ? [{ system: "phone", value: profile.phone }] : [],
    birthDate: profile.dateOfBirth,
  });

  add({
    resourceType: "Encounter",
    id: encounterId,
    status: "finished",
    class: { code: "AMB" },
    subject: { reference: `Patient/${profile.uid}` },
    period: { start: encounterDate, end: encounterDate },
  });

  const addNarrative = (title: string, text?: string) => {
    if (!text) return;
    add({
      resourceType: "Observation",
      status: "final",
      code: { text: title },
      subject: { reference: `Patient/${profile.uid}` },
      encounter: { reference: `Encounter/${encounterId}` },
      valueString: text,
    });
  };

  addNarrative("HPI", hpi);
  addNarrative("Review of Systems", ros);
  addNarrative("Assessment & Plan", assessmentPlan);
  addNarrative("Clinical Summary", clinicalSummary);

  const addList = (title: string, items: string[]) => {
    if (!items.length) return;
    add({
      resourceType: "List",
      status: "current",
      mode: "snapshot",
      title,
      subject: { reference: `Patient/${profile.uid}` },
      entry: items.map((x) => ({ item: { display: x } })),
    });
  };

  addList("Past Medical History", pmh);
  addList("Past Surgical History", psh);
  addList("Social History", socialHistory);
  addList("Family History", familyHistory);

  conditions.forEach((c) => {
    const coding: any[] = [];
    if (c.icd10) {
      coding.push({
        system: "http://hl7.org/fhir/sid/icd-10-cm",
        code: c.icd10,
        display: c.display,
      });
    }
    if (c.snomed) {
      coding.push({
        system: "http://snomed.info/sct",
        code: c.snomed,
        display: c.display,
      });
    }

    add({
      resourceType: "Condition",
      clinicalStatus: { text: c.status || "active" },
      code: coding.length ? { coding } : { text: c.display },
      subject: { reference: `Patient/${profile.uid}` },
    });
  });

  allergies.forEach((a) =>
    add({
      resourceType: "AllergyIntolerance",
      clinicalStatus: { text: "active" },
      code: { text: a.substance },
      reaction: a.reaction ? [{ description: a.reaction }] : undefined,
      criticality: a.severity,
      patient: { reference: `Patient/${profile.uid}` },
    })
  );

  medications.forEach((m) =>
    add({
      resourceType: "MedicationStatement",
      status: m.status || "active",
      medicationCodeableConcept: {
        text: `${m.name} ${m.dose || ""} ${m.route || ""} ${
          m.frequency || ""
        }`.trim(),
      },
      subject: { reference: `Patient/${profile.uid}` },
    })
  );

  if (vitals) {
    const v = vitals;
    const addVital = (
      loinc: string,
      display: string,
      value: any,
      unit: string
    ) => {
      if (value == null) return;
      add({
        resourceType: "Observation",
        status: "final",
        code: {
          coding: [{ system: "http://loinc.org", code: loinc, display }],
        },
        subject: { reference: `Patient/${profile.uid}` },
        encounter: { reference: `Encounter/${encounterId}` },
        valueQuantity: { value, unit },
      });
    };

    addVital("8480-6", "Systolic Blood Pressure", v.systolic, "mmHg");
    addVital("8462-4", "Diastolic Blood Pressure", v.diastolic, "mmHg");
    addVital("8867-4", "Heart rate", v.heartRate, "beats/min");
    addVital("59408-5", "SpO2", v.spo2, "%");
    addVital("9279-1", "Respiratory rate", v.respiratoryRate, "breaths/min");
    addVital("8310-5", "Body temperature", v.tempF, "°F");
    addVital("29463-7", "Body weight", v.weightLbs, "lb");
    addVital("8302-2", "Body height", v.heightIn, "in");
  }

  labs.forEach((lab) =>
    add({
      resourceType: "Observation",
      status: "final",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: lab.loinc,
            display: lab.display,
          },
        ],
      },
      subject: { reference: `Patient/${profile.uid}` },
      encounter: { reference: `Encounter/${encounterId}` },
      valueQuantity: lab.unit ? { value: lab.value, unit: lab.unit } : undefined,
      valueString: !lab.unit ? String(lab.value) : undefined,
    })
  );

  imaging.forEach((img) =>
    add({
      resourceType: "DiagnosticReport",
      status: "final",
      code: { text: img.type },
      subject: { reference: `Patient/${profile.uid}` },
      encounter: { reference: `Encounter/${encounterId}` },
      conclusion: img.report,
    })
  );

  return bundle;
}

// ---------------------------------------------------------------------------
// HTTPS: buildCheckInBundle / buildProviderBundle
// ---------------------------------------------------------------------------

export const buildCheckInBundleFn = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      (async () => {
        if (req.method !== "POST") {
          res.status(405).send("POST only");
          return;
        }
        try {
          const input = req.body as CheckInFHIRInput;
          const bundle = buildCheckInBundle(input);
          res.json(bundle);
        } catch (err) {
          console.error("buildCheckInBundleFn error", err);
          res.status(500).json({ error: "Failed to build bundle" });
        }
      })();
    });
  }
);

export const buildProviderBundleFn = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      (async () => {
        if (req.method !== "POST") {
          res.status(405).send("POST only");
          return;
        }
        try {
          const input = req.body as ProviderClinicalInput;
          const bundle = buildProviderBundle(input);
          res.json(bundle);
        } catch (err) {
          console.error("buildProviderBundleFn error", err);
          res.status(500).json({ error: "Failed to build provider bundle" });
        }
      })();
    });
  }
);

// ---------------------------------------------------------------------------
// PDF GENERATION
// ---------------------------------------------------------------------------

export const generateCheckInPdf = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      (async () => {
        if (req.method !== "POST") {
          res.status(405).send("POST only");
          return;
        }

        try {
          const {
            profile,
            chiefComplaint,
            clinicName,
            checkInDateTime,
            summary,
          } = req.body as {
            profile: PatientProfile;
            chiefComplaint?: string;
            clinicName?: string;
            checkInDateTime?: string;
            summary?: string;
          };

          if (!profile || !profile.uid) {
            badRequest(res, "profile with uid is required");
            return;
          }

          const bucket = storage.bucket();
          const filePath = `checkin-pdfs/${profile.uid}-${Date.now()}.pdf`;
          const file = bucket.file(filePath);

          const doc = new PDFDocument({ margin: 50 });
          const stream = doc.pipe(file.createWriteStream());

          doc.fontSize(20).text(clinicName || "Clinic Check-In Summary", {
            align: "center",
          });
          doc.moveDown();

          doc.fontSize(14).text("Patient", { underline: true });
          doc.text(`${profile.firstName} ${profile.lastName}`);
          doc.text(`DOB: ${profile.dateOfBirth}`);
          if (profile.phone) doc.text(`Phone: ${profile.phone}`);
          doc.moveDown();

          if (checkInDateTime) {
            doc.fontSize(12).text(`Check-in time: ${checkInDateTime}`);
            doc.moveDown();
          }

          if (chiefComplaint) {
            doc.fontSize(14).text("Reason for visit", { underline: true });
            doc.fontSize(12).text(chiefComplaint);
            doc.moveDown();
          }

          if (summary) {
            doc.fontSize(14).text("Summary", { underline: true });
            doc.fontSize(12).text(summary);
            doc.moveDown();
          }

          doc
            .fontSize(10)
            .text(
              `Generated at ${new Date().toISOString()} via MyHealthVaultAI`,
              { align: "right" }
            );

          doc.end();

          await new Promise<void>((resolve, reject) => {
            stream.on("finish", resolve);
            stream.on("error", reject);
          });

          await file.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
          res.json({ filePath, publicUrl });
        } catch (err) {
          console.error("generateCheckInPdf error", err);
          res.status(500).json({ error: "PDF generation failed" });
        }
      })();
    });
  }
);

// ---------------------------------------------------------------------------
// SEND TO CLINIC
// ---------------------------------------------------------------------------

export const sendToClinic = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      (async () => {
        if (req.method !== "POST") {
          res.status(405).send("POST only");
          return;
        }

        try {
          const { clinicId, profile, fhirBundle, pdfUrl } = req.body as {
            clinicId?: string;
            profile?: PatientProfile;
            fhirBundle?: any;
            pdfUrl?: string;
          };

          if (!clinicId) {
            badRequest(res, "clinicId is required");
            return;
          }
          if (!profile || !profile.uid) {
            badRequest(res, "profile with uid is required");
            return;
          }
          if (!fhirBundle) {
            badRequest(res, "fhirBundle is required");
            return;
          }

          const ref = db
            .collection("clinicInboxes")
            .doc(clinicId)
            .collection("checkins")
            .doc();

          await ref.set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            profile,
            fhirBundle,
            pdfUrl: pdfUrl || null,
            status: "queued",
          });

          res.json({ ok: true, id: ref.id });
        } catch (err) {
          console.error("sendToClinic error", err);
          res.status(500).json({ error: "Failed to send to clinic" });
        }
      })();
    });
  }
);
