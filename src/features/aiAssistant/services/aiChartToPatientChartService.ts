// src/features/aiAssistant/services/aiChartToPatientChartService.ts
//
// Takes the AI chart-setup patch and writes it into the V1 patient chart schema:
// - patients/{uid} core demographics
// - patients/{uid}/conditions
// - patients/{uid}/surgeries
// - patients/{uid}/familyHistory
// - patients/{uid}/allergies (allergiesService)
// - patients/{uid}/medications (medicationsService)
// - patients/{uid}/more/socialHistory (socialHistoryService)
//
// Defensive: accepts strings OR objects, dedupes, and never throws to UI.

import { auth } from "../../../lib/firebase";

import {
  upsertPatientCore,
  addCondition,
  listConditions,
  addSurgery,
  listSurgeries,
  addFamilyHistoryItem,
  listFamilyHistory,
} from "../../patient/services/patientRepository";

import { allergiesService } from "../../allergies/services/allergiesService";
import { medicationsService } from "../../medications/services/medicationsService";
import { socialHistoryService } from "../../socialHistory/services/socialHistoryService";

type AnyRecord = Record<string, any>;

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User is not authenticated");
  return uid;
}

const norm = (v: any) => String(v ?? "").trim();
const normLower = (v: any) => norm(v).toLowerCase();

function toStringList(v: any): string[] {
  if (Array.isArray(v)) return v.map(norm).filter(Boolean);
  if (typeof v === "string") return [norm(v)].filter(Boolean);
  return [];
}

function toObjectList(v: any): AnyRecord[] {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object" && !Array.isArray(x));
  if (v && typeof v === "object" && !Array.isArray(v)) return [v as AnyRecord];
  return [];
}

function isObject(v: any): v is AnyRecord {
  return v && typeof v === "object" && !Array.isArray(v);
}

function coerceAllergySeverity(v: any): "mild" | "moderate" | "severe" | undefined {
  const s = normLower(v);
  if (s === "mild") return "mild";
  if (s === "moderate") return "moderate";
  if (s === "severe") return "severe";
  return undefined;
}

function coerceSexAtBirth(v: any): "male" | "female" | "other" | undefined {
  const s = normLower(v);
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  if (s) return "other";
  return undefined;
}

export const aiChartToPatientChartService = {
  async applyPatch(patch: any): Promise<void> {
    const uid = requireUid();
    if (!patch || typeof patch !== "object") return;

    // ----------------------------
    // DEMOGRAPHICS -> patients/{uid}
    // ----------------------------
    try {
      const demo = (patch.demographics ?? patch.profile ?? patch.patient ?? null) as any;

      if (isObject(demo)) {
        const core: AnyRecord = {};

        if (demo.firstName) core.firstName = norm(demo.firstName);
        if (demo.lastName) core.lastName = norm(demo.lastName);

        // accept dob/dateOfBirth formats
        if (demo.dateOfBirth) core.dateOfBirth = norm(demo.dateOfBirth);
        else if (demo.dob) core.dateOfBirth = norm(demo.dob);

        if (demo.sexAtBirth) core.sexAtBirth = coerceSexAtBirth(demo.sexAtBirth);
        else if (demo.sex) core.sexAtBirth = coerceSexAtBirth(demo.sex);

        if (demo.phone) core.phone = norm(demo.phone);
        if (demo.email) core.email = norm(demo.email);

        if (Object.keys(core).length > 0) {
          await upsertPatientCore(uid, core as any);
        }
      }
    } catch (e) {
      console.log("AI patch demographics write failed:", (e as any)?.message ?? e);
    }

    // ----------------------------
    // Preload existing to dedupe
    // ----------------------------
    let existingConditions: { name?: string }[] = [];
    let existingSurgeries: { procedure?: string }[] = [];
    let existingFamily: { relation?: string; condition?: string }[] = [];
    let existingAllergies: { substance?: string }[] = [];
    let existingMeds: { name?: string }[] = [];

    try {
      existingConditions = await listConditions(uid);
    } catch {}
    try {
      existingSurgeries = await listSurgeries(uid);
    } catch {}
    try {
      existingFamily = await listFamilyHistory(uid);
    } catch {}
    try {
      existingAllergies = await allergiesService.getAllergies();
    } catch {}
    try {
      existingMeds = await medicationsService.getMedications();
    } catch {}

    const conditionSet = new Set(existingConditions.map((c) => normLower(c?.name)));
    const surgerySet = new Set(existingSurgeries.map((s) => normLower(s?.procedure)));
    const familySet = new Set(
      existingFamily.map((f) => `${normLower(f?.relation)}|${normLower(f?.condition)}`)
    );
    const allergySet = new Set(existingAllergies.map((a) => normLower(a?.substance)));
    const medSet = new Set(existingMeds.map((m) => normLower(m?.name)));

    // ----------------------------
    // PMH -> patients/{uid}/conditions
    // ----------------------------
    try {
      const pmhStrs = toStringList(patch.pmh);
      for (const name of pmhStrs) {
        const key = normLower(name);
        if (!key || conditionSet.has(key)) continue;
        await addCondition(uid, { name, status: "active" } as any);
        conditionSet.add(key);
      }

      const pmhObjs = toObjectList(patch.pmh);
      for (const obj of pmhObjs) {
        const name = norm(obj.name ?? obj.condition ?? obj.dx);
        const key = normLower(name);
        if (!key || conditionSet.has(key)) continue;

        await addCondition(uid, {
          name,
          diagnosed: norm(obj.diagnosed ?? obj.diagnosedAt ?? obj.year ?? ""),
          status: obj.status ? String(obj.status) : "active",
          notes: norm(obj.notes ?? obj.detail ?? obj.description ?? ""),
        } as any);

        conditionSet.add(key);
      }
    } catch (e) {
      console.log("AI patch PMH write failed:", (e as any)?.message ?? e);
    }

    // ----------------------------
    // PSH -> patients/{uid}/surgeries
    // ----------------------------
    try {
      const pshStrs = toStringList(patch.psh);
      for (const procedure of pshStrs) {
        const key = normLower(procedure);
        if (!key || surgerySet.has(key)) continue;
        await addSurgery(uid, { procedure } as any);
        surgerySet.add(key);
      }

      const pshObjs = toObjectList(patch.psh);
      for (const obj of pshObjs) {
        const procedure = norm(obj.procedure ?? obj.name ?? obj.surgery);
        const key = normLower(procedure);
        if (!key || surgerySet.has(key)) continue;

        await addSurgery(uid, {
          procedure,
          year: norm(obj.year ?? obj.date ?? ""),
          location: norm(obj.location ?? ""),
          notes: norm(obj.notes ?? obj.detail ?? ""),
        } as any);

        surgerySet.add(key);
      }
    } catch (e) {
      console.log("AI patch PSH write failed:", (e as any)?.message ?? e);
    }

    // ----------------------------
    // FAMILY -> patients/{uid}/familyHistory
    // ----------------------------
    try {
      const famObjs = toObjectList(patch.familyHistory);
      for (const obj of famObjs) {
        const relation = norm(obj.relation ?? obj.relative ?? "");
        const condition = norm(obj.condition ?? obj.name ?? "");
        const key = `${normLower(relation)}|${normLower(condition)}`;
        if (!relation || !condition || familySet.has(key)) continue;

        await addFamilyHistoryItem(uid, {
          relation,
          condition,
          diagnosedAge:
            typeof obj.diagnosedAge === "number"
              ? obj.diagnosedAge
              : obj.diagnosedAge
              ? Number(obj.diagnosedAge)
              : undefined,
          notes: norm(obj.notes ?? obj.detail ?? ""),
        } as any);

        familySet.add(key);
      }

      const famStrs = toStringList(patch.familyHistory);
      for (const line of famStrs) {
        // "Father: diabetes" style
        const parts = line.split(/[:\-–]/).map((x) => x.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const relation = parts[0];
          const condition = parts.slice(1).join(" - ");
          const key = `${normLower(relation)}|${normLower(condition)}`;
          if (familySet.has(key)) continue;

          await addFamilyHistoryItem(uid, { relation, condition } as any);
          familySet.add(key);
        }
      }
    } catch (e) {
      console.log("AI patch family history write failed:", (e as any)?.message ?? e);
    }

    // ----------------------------
    // SOCIAL -> patients/{uid}/more/socialHistory
    // ----------------------------
    try {
      const sh = patch.socialHistory ?? patch.social ?? null;

      if (isObject(sh)) {
        await socialHistoryService.updateSocialHistory(sh);
      } else {
        const lines = toStringList(sh);
        if (lines.length) {
          await socialHistoryService.updateSocialHistory({
            notes: lines.join("\n"),
          });
        }
      }
    } catch (e) {
      console.log("AI patch social history write failed:", (e as any)?.message ?? e);
    }

    // ----------------------------
    // ALLERGIES -> patients/{uid}/allergies
    // ----------------------------
    try {
      const allergyStrs = toStringList(patch.allergies);
      for (const substance of allergyStrs) {
        const key = normLower(substance);
        if (!key || allergySet.has(key)) continue;
        await allergiesService.addAllergy({ substance } as any);
        allergySet.add(key);
      }

      const allergyObjs = toObjectList(patch.allergies);
      for (const obj of allergyObjs) {
        const substance = norm(obj.substance ?? obj.allergen ?? obj.name);
        const key = normLower(substance);
        if (!key || allergySet.has(key)) continue;

        await allergiesService.addAllergy({
          substance,
          reaction: norm(obj.reaction ?? ""),
          severity: coerceAllergySeverity(obj.severity),
          notes: norm(obj.notes ?? obj.detail ?? ""),
          year: norm(obj.year ?? ""),
        } as any);

        allergySet.add(key);
      }
    } catch (e) {
      console.log("AI patch allergies write failed:", (e as any)?.message ?? e);
    }

    // ----------------------------
    // MEDS -> patients/{uid}/medications
    // ----------------------------
    try {
      const medStrs = toStringList(patch.medications);
      for (const name of medStrs) {
        const key = normLower(name);
        if (!key || medSet.has(key)) continue;

        await medicationsService.addMedication({
          name,
          source: "patient_entered",
          sourceType: "manual",
        } as any);

        medSet.add(key);
      }

      const medObjs = toObjectList(patch.medications);
      for (const obj of medObjs) {
        const name = norm(obj.name ?? obj.medication ?? obj.drug);
        const key = normLower(name);
        if (!key || medSet.has(key)) continue;

        const dosage = norm(obj.dosage ?? obj.dose ?? obj.strength ?? obj.doseStrength ?? "");
        const frequency = norm(obj.frequency ?? obj.directions ?? obj.sig ?? obj.instructions ?? "");

        await medicationsService.addMedication({
          name,
          genericName: obj.genericName ? norm(obj.genericName) : undefined,
          dosage: dosage || undefined,
          frequency: frequency || undefined,
          route: obj.route ? norm(obj.route) : undefined,
          instructions: obj.instructions ? norm(obj.instructions) : undefined,
          rxNumber: obj.rxNumber ? norm(obj.rxNumber) : undefined,
          pharmacy: obj.pharmacy ? norm(obj.pharmacy) : undefined,
          prescriber: obj.prescriber ? norm(obj.prescriber) : undefined,
          startDate: obj.startDate ? norm(obj.startDate) : undefined,
          endDate: obj.endDate ? norm(obj.endDate) : undefined,
          source: "patient_entered",
          sourceType: obj.sourceType ? obj.sourceType : "manual",
        } as any);

        medSet.add(key);
      }
    } catch (e) {
      console.log("AI patch medications write failed:", (e as any)?.message ?? e);
    }
  },
};

export default aiChartToPatientChartService;
