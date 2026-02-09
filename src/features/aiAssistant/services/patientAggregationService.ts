// src/features/aiAssistant/services/patientAggregationService.ts
/**
 * Firestore-backed EMR doc:
 *   users/{uid}/emr/active
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export interface Timestamped {
  id: string;
  timestamp: string;
}

export interface Demographics {
  [key: string]: any;
}
export interface Medication {
  [key: string]: any;
}
export interface Allergy {
  [key: string]: any;
}
export interface Condition {
  [key: string]: any;
}
export interface Surgery {
  [key: string]: any;
}
export interface FamilyHistoryItem {
  [key: string]: any;
}
export interface SocialHistory {
  [key: string]: any;
}

export interface VitalRecord extends Timestamped {
  type: string;
  value: number | string;
  unit?: string;
  [key: string]: any;
}

export interface LabResult extends Timestamped {
  test: string;
  value: string;
  [key: string]: any;
}

export interface TimelineEvent extends Timestamped {
  title: string;
  [key: string]: any;
}

export interface Provider {
  id?: string;
  name: string;
  [key: string]: any;
}

export interface PatientNote extends Timestamped {
  text: string;
}

export interface AIPatientMemory {
  concerns: string[];
  goals: string[];
  risks: string[];
  symptomPatterns: Record<
    string,
    {
      occurrences: number;
      lastMentioned: string;
    }
  >;
  lifestyle: string[];
  preferences: string[];
  flaggedTopics: string[];
}

export type ChartSetupPhase = "demographics" | "medical" | "complete";
export type ChartSetupMode = "ai" | "manual";

export type ChartSetupProgress = {
  status: "not_started" | "in_progress" | "complete";
  phase: ChartSetupPhase;
  mode?: ChartSetupMode;

  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;

  lastStepKey?: string;
  lastQuestion?: string;

  demographics?: {
    done?: boolean;
    skippedKeys?: string[];
    completedKeys?: string[];
  };

  medical?: {
    done?: boolean;
    skippedKeys?: string[];
    completedKeys?: string[];
  };

  dismissedUntil?: string;
  lastPromptShownAt?: string;
};

export interface PatientAggregationModel {
  demographics: Demographics;
  medications: Medication[];
  allergies: Allergy[];
  conditions: Condition[];
  surgeries: Surgery[];
  familyHistory: FamilyHistoryItem[];
  socialHistory: SocialHistory;
  vitals: VitalRecord[];
  labs: LabResult[];
  timeline: TimelineEvent[];
  providers: Provider[];
  notes: PatientNote[];
  aiMemory: AIPatientMemory;
  chartSetup?: ChartSetupProgress;
}

export type ResetTransientOptions = {
  clearAiMemory?: boolean;
  clearNotes?: boolean;
  clearTimeline?: boolean;
  clearProviderSummaries?: boolean;
};

type EmrDoc = {
  schemaVersion: 1;
  updatedAt?: any;
  patient: PatientAggregationModel;
};

const SCHEMA_VERSION = 1;

const nowIso = () => new Date().toISOString();

const createEmptyPatient = (): PatientAggregationModel => ({
  demographics: {},
  medications: [],
  allergies: [],
  conditions: [],
  surgeries: [],
  familyHistory: [],
  socialHistory: {},
  vitals: [],
  labs: [],
  timeline: [],
  providers: [],
  notes: [],
  aiMemory: {
    concerns: [],
    goals: [],
    risks: [],
    symptomPatterns: {},
    lifestyle: [],
    preferences: [],
    flaggedTopics: [],
  },
  chartSetup: {
    status: "not_started",
    phase: "demographics",
    demographics: { done: false, skippedKeys: [], completedKeys: [] },
    medical: { done: false, skippedKeys: [], completedKeys: [] },
  },
});

const coerceArray = <T = any>(v: any): T[] => (Array.isArray(v) ? v : []);
const coerceObject = (v: any): Record<string, any> =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};

/**
 * ✅ Removes undefined recursively so Firestore never receives "undefined".
 */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as any;
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v as any);
    }
    return out;
  }
  return obj;
}

const normalizeChartSetup = (raw: any): ChartSetupProgress => {
  const s = raw ?? {};
  const status = s.status === "in_progress" || s.status === "complete" ? s.status : "not_started";
  const phase = s.phase === "medical" || s.phase === "complete" ? s.phase : "demographics";

  return {
    status,
    startedAt: typeof s.startedAt === "string" ? s.startedAt : undefined,
    updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : undefined,
    completedAt: typeof s.completedAt === "string" ? s.completedAt : undefined,
    lastStepKey: typeof s.lastStepKey === "string" ? s.lastStepKey : undefined,
    lastQuestion: typeof s.lastQuestion === "string" ? s.lastQuestion : undefined,
    dismissedUntil: typeof s.dismissedUntil === "string" ? s.dismissedUntil : undefined,
    lastPromptShownAt: typeof s.lastPromptShownAt === "string" ? s.lastPromptShownAt : undefined,
    phase,
    mode: s.mode === "ai" || s.mode === "manual" ? s.mode : undefined,

    demographics: {
      done: !!s.demographics?.done,
      skippedKeys: coerceArray(s.demographics?.skippedKeys),
      completedKeys: coerceArray(s.demographics?.completedKeys),
    },
    medical: {
      done: !!s.medical?.done,
      skippedKeys: coerceArray(s.medical?.skippedKeys),
      completedKeys: coerceArray(s.medical?.completedKeys),
    },
  };
};

const normalizePatient = (raw: any): PatientAggregationModel => {
  const p = raw ?? {};
  const ai = p.aiMemory ?? {};

  return {
    demographics: coerceObject(p.demographics),
    medications: coerceArray(p.medications),
    allergies: coerceArray(p.allergies),
    conditions: coerceArray(p.conditions),
    surgeries: coerceArray(p.surgeries),
    familyHistory: coerceArray(p.familyHistory),
    socialHistory: coerceObject(p.socialHistory),
    vitals: coerceArray(p.vitals),
    labs: coerceArray(p.labs),
    timeline: coerceArray(p.timeline),
    providers: coerceArray(p.providers),
    notes: coerceArray(p.notes),
    aiMemory: {
      concerns: coerceArray(ai.concerns),
      goals: coerceArray(ai.goals),
      risks: coerceArray(ai.risks),
      symptomPatterns: coerceObject(ai.symptomPatterns) as any,
      lifestyle: coerceArray(ai.lifestyle),
      preferences: coerceArray(ai.preferences),
      flaggedTopics: coerceArray(ai.flaggedTopics),
    },
    chartSetup: normalizeChartSetup(p.chartSetup),
  };
};

// ----------
// ✅ DEDUPE HELPERS
// ----------
const norm = (v: any) => String(v ?? "").trim().toLowerCase();

function dedupeBy<T>(items: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function dedupeArrays(patient: PatientAggregationModel) {
  patient.allergies = dedupeBy(patient.allergies, (a: any) =>
    norm(typeof a === "string" ? a : a?.substance ?? a?.name)
  );

  patient.medications = dedupeBy(patient.medications, (m: any) =>
    norm(typeof m === "string" ? m : m?.name)
  );

  patient.conditions = dedupeBy(patient.conditions, (c: any) =>
    norm(typeof c === "string" ? c : c?.name)
  );

  patient.surgeries = dedupeBy(patient.surgeries, (s: any) =>
    norm(typeof s === "string" ? s : s?.procedure ?? s?.name)
  );

  patient.familyHistory = dedupeBy(patient.familyHistory, (f: any) => {
    if (typeof f === "string") return norm(f);
    const rel = norm(f?.relation);
    const cond = norm(f?.condition);
    return rel && cond ? `${rel}|${cond}` : "";
  });
}


class PatientAggregationService {
  private patient: PatientAggregationModel = createEmptyPatient();
  private uid: string | null = null;

  private autoPersistEnabled = true;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly saveDebounceMs = 900;

  setUser(uid: string) {
    this.uid = uid;
  }

  clearUser() {
    this.uid = null;
    this.cancelScheduledSave();
  }

  setAutoPersist(enabled: boolean) {
    this.autoPersistEnabled = enabled;
    if (!enabled) this.cancelScheduledSave();
  }

  getPatient(): PatientAggregationModel {
    return this.patient;
  }

  setPatient(next: PatientAggregationModel) {
    this.patient = normalizePatient(next);
    dedupeArrays(this.patient);
  }

  reset() {
    this.patient = createEmptyPatient();
    this.schedulePersist();
  }

  setChartSetupProgress(patch: Partial<ChartSetupProgress>) {
    const existing = normalizeChartSetup(this.patient.chartSetup);
    const merged: ChartSetupProgress = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };

    if (merged.status === "in_progress" && !merged.startedAt) {
      merged.startedAt = nowIso();
    }

    if (merged.status === "complete" && !merged.completedAt) {
      merged.completedAt = nowIso();
    }

    this.patient.chartSetup = merged;
    this.schedulePersist();
    return this.patient.chartSetup;
  }

    // Backwards-compatible alias (some screens still call this)
  setLastPromptShownAt(): void {
    this.markChartSetupPromptShown();
  }
  // -----------------------------
  // Chart setup prompt helpers (Dashboard)
  // -----------------------------
  shouldShowChartSetupPrompt(): boolean {
    const cs = this.patient?.chartSetup;

    // never show if completed
    if (cs?.status === "complete" || cs?.phase === "complete") return false;

    const now = Date.now();

    // respect dismissal
    if (typeof cs?.dismissedUntil === "string") {
      const until = Date.parse(cs.dismissedUntil);
      if (!Number.isNaN(until) && until > now) return false;
    }

    // throttle prompt frequency (once per 12 hours)
    if (typeof cs?.lastPromptShownAt === "string") {
      const last = Date.parse(cs.lastPromptShownAt);
      if (!Number.isNaN(last) && now - last < 12 * 60 * 60 * 1000) return false;
    }

    return true;
  }

  markChartSetupPromptShown(): void {
    const existing = normalizeChartSetup(this.patient?.chartSetup);
    this.patient.chartSetup = {
      ...existing,
      lastPromptShownAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.schedulePersist();
  }

  dismissChartSetup(days: number = 7): void {
    const existing = normalizeChartSetup(this.patient?.chartSetup);

    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    this.patient.chartSetup = {
      ...existing,
      dismissedUntil: until,
      updatedAt: nowIso(),
    };

    this.schedulePersist();
  }

  // -----------------------------
  // ✅ Merge updates (NOW with dedupe + alias handling)
  // -----------------------------
  updatePatientData(updates: Partial<PatientAggregationModel> = {}) {
    const u: any = updates as any;

    // ✅ Alias support from AI patches (pmh/psh)
    if (u.pmh && !u.conditions) u.conditions = u.pmh;
    if (u.psh && !u.surgeries) u.surgeries = u.psh;

    Object.keys(u).forEach((key) => {
      const incoming = u[key];
      const existing = (this.patient as any)[key];

      if (incoming === undefined || incoming === null) return;

      if (typeof existing === "object" && !Array.isArray(existing) && !Array.isArray(incoming)) {
        (this.patient as any)[key] = { ...(existing ?? {}), ...(incoming ?? {}) };
      } else if (Array.isArray(existing) && Array.isArray(incoming)) {
        (this.patient as any)[key] = [...(existing ?? []), ...(incoming ?? [])];
      } else if (existing === undefined) {
        (this.patient as any)[key] = incoming;
      } else {
        (this.patient as any)[key] = incoming;
      }
    });

    // ✅ Dedupe after merge so AI double-apply can’t explode
    dedupeArrays(this.patient);

    this.schedulePersist();
    return this.patient;
  }

  addTimelineEvent(event: { title: string; [key: string]: any }) {
    this.patient.timeline.push({
      id: Date.now().toString(),
      timestamp: nowIso(),
      ...event,
    });
    this.schedulePersist();
  }

  addVitalRecord(record: { type: string; value: any; [key: string]: any }) {
    this.patient.vitals.push({
      id: Date.now().toString(),
      timestamp: nowIso(),
      ...record,
    });
    this.schedulePersist();
  }

  addLabResult(result: { test: string; value: string; [key: string]: any }) {
    this.patient.labs.push({
      id: Date.now().toString(),
      timestamp: nowIso(),
      ...result,
    });
    this.schedulePersist();
  }

  addProvider(provider: { name: string; [key: string]: any }) {
    this.patient.providers.push({
      id: Date.now().toString(),
      ...provider,
    });
    this.schedulePersist();
  }

  addNote(text: string) {
    this.patient.notes.push({
      id: Date.now().toString(),
      timestamp: nowIso(),
      text,
    });
    this.schedulePersist();
  }

  private emrDocRef(uid: string) {
    return doc(db, "users", uid, "emr", "active");
  }

  private cancelScheduledSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  private schedulePersist() {
    if (!this.autoPersistEnabled) return;
    if (!this.uid) return;

    this.cancelScheduledSave();
    this.saveTimer = setTimeout(() => {
      this.persistToFirestore().catch(() => {});
    }, this.saveDebounceMs);
  }

  async loadFromFirestore(uid?: string): Promise<PatientAggregationModel> {
    const effectiveUid = uid ?? this.uid;
    if (!effectiveUid) return this.patient;

    const ref = this.emrDocRef(effectiveUid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const empty = createEmptyPatient();
      await setDoc(ref, {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: serverTimestamp(),
        patient: stripUndefined(empty),
      } satisfies EmrDoc);

      this.setUser(effectiveUid);
      this.setPatient(empty);
      return this.patient;
    }

    const data = snap.data() as any;
    const patient = normalizePatient(data?.patient);

    this.setUser(effectiveUid);
    this.setPatient(patient);
    return this.patient;
  }

  async persistToFirestore(uid?: string): Promise<void> {
    const effectiveUid = uid ?? this.uid;
    if (!effectiveUid) return;

    const ref = this.emrDocRef(effectiveUid);
    const payload: EmrDoc = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: serverTimestamp(),
      patient: this.patient,
    };

    await setDoc(ref, stripUndefined(payload), { merge: true });
  }
}

export const patientAggregationService = new PatientAggregationService();
