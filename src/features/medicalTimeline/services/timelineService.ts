// src/features/medicalTimeline/services/timelineService.ts
//
// Firestore-backed Medical Timeline service with legacy back-compat.
//
// Firestore path:
//   patients/{uid}/timeline/{eventId}
//
// Key stability goals:
// - Never crash UI if auth isn't ready yet (return empty lists)
// - Query ordering uses timestampMs (number) to avoid mixed Timestamp/number types
// - Provides legacy method names used by older screens: getEvents(), saveEvents()

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  limit,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import type { TimelineEvent, TimelineEventLevel, TimelineEventType } from "./timelineTypes";

/**
 * Legacy local storage keys
 */
const LEGACY_STORAGE_KEY = "medical_timeline_events_v1";
const MIGRATION_FLAG_KEY = "medical_timeline_migrated_to_firestore_v1";

/**
 * Firestore location:
 * patients/{uid}/timeline/{eventId}
 */
function timelineCollectionPath(uid: string) {
  return `patients/${uid}/timeline`;
}

function safeUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

function normalizeEvent(e: TimelineEvent): TimelineEvent {
  return {
    ...e,
    title: (e as any).title ?? e.summary,
    notes: (e as any).notes ?? null,
    meta: e.meta ?? {},
  };
}

/** ✅ Canonical YYYY-MM-DD string (local date) */
function toYmd(ms: number): string {
  const d = new Date(ms);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromFirestore(id: string, data: any): TimelineEvent {
  // Prefer timestampMs (number). Fallback to Timestamp/number fields if present.
  const tsMs =
    typeof data.timestampMs === "number"
      ? data.timestampMs
      : data.timestamp instanceof Timestamp
      ? data.timestamp.toMillis()
      : typeof data.timestamp === "number"
      ? data.timestamp
      : Date.now();

  const dateStr =
    typeof data.date === "string" && data.date.length >= 8 ? data.date : toYmd(tsMs);

  return normalizeEvent({
    id,
    type: (data.type ?? "GENERAL") as TimelineEventType,
    summary: data.summary ?? "",
    detail: data.detail ?? null,
    level: (data.level ?? "low") as TimelineEventLevel,
    timestamp: tsMs,
    date: dateStr,
    meta: data.meta ?? {},
    title: data.title ?? data.summary ?? "",
    notes: data.notes ?? null,
  } as TimelineEvent);
}

/**
 * ✅ Store THREE date formats:
 * - timestampMs (number)   <-- query ordering uses THIS
 * - timestamp (Firestore Timestamp) (kept for readability / back-compat)
 * - date (YYYY-MM-DD string)
 */
function toFirestore(event: TimelineEvent) {
  const tsMs = typeof event.timestamp === "number" ? event.timestamp : Date.now();
  const dateStr = (event.date && String(event.date).trim()) || toYmd(tsMs);

  return {
    type: event.type,
    summary: event.summary,
    detail: event.detail ?? null,
    title: event.title ?? event.summary,
    notes: (event as any).notes ?? null,
    level: event.level ?? "low",

    // ✅ canonical fields
    timestampMs: tsMs,
    timestamp: Timestamp.fromMillis(tsMs),
    date: dateStr,

    meta: event.meta ?? {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function randomSuffix() {
  return Math.random().toString(16).slice(2, 8);
}

/** INTERNAL: Write helper */
async function upsertEventInternal(uid: string, event: TimelineEvent) {
  const colRef = collection(db, timelineCollectionPath(uid));
  const ref = doc(colRef, event.id);
  await setDoc(ref, toFirestore(normalizeEvent(event)), { merge: true });
}

export const timelineService = {
  //-----------------------------------------------------------------------
  // ✅ ONE-TIME migration (AsyncStorage -> Firestore)
  //-----------------------------------------------------------------------
  async migrateFromAsyncStorageToFirestore() {
    try {
      const uid = safeUid();
      if (!uid) return;

      const already = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
      if (already === "true") return;

      const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) {
        await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
        return;
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
        return;
      }

      const colRef = collection(db, timelineCollectionPath(uid));

      for (const e of parsed) {
        const event = normalizeEvent(e as TimelineEvent);
        if (!event.id) continue;

        const ref = doc(colRef, event.id);
        await setDoc(ref, toFirestore(event), { merge: true });
      }

      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
    } catch (e) {
      console.log("Timeline migration error:", e);
    }
  },

  //-----------------------------------------------------------------------
  // ✅ Back-compat: Add event (returns id)
  //-----------------------------------------------------------------------
  async addEvent(input: any): Promise<string> {
    const uid = safeUid();
    if (!uid) throw new Error("Not signed in.");

    const ts = typeof input?.timestamp === "number" ? input.timestamp : Date.now();

    const dedupeKey =
      typeof input?.meta?.dedupeKey === "string" && input.meta.dedupeKey.length > 0
        ? input.meta.dedupeKey
        : null;

    const id =
      typeof input?.id === "string" && input.id.length > 0
        ? input.id
        : dedupeKey ?? `event-${ts}-${randomSuffix()}`;

    const event: TimelineEvent = normalizeEvent({
      id,
      type: (input?.type ?? "GENERAL") as TimelineEventType,
      summary: String(input?.summary ?? "").trim(),
      detail:
        typeof input?.detail === "string" && input.detail.trim()
          ? input.detail.trim()
          : undefined,
      notes:
        input?.notes === null
          ? null
          : typeof input?.notes === "string" && input.notes.trim()
          ? input.notes.trim()
          : null,
      timestamp: ts,
      date: typeof input?.date === "string" && input.date.length >= 8 ? input.date : toYmd(ts),
      level: (input?.level ?? "low") as TimelineEventLevel,
      meta: input?.meta ?? {},
      title: input?.title ?? input?.summary ?? "",
    } as TimelineEvent);

    await upsertEventInternal(uid, event);
    return id;
  },

  //-----------------------------------------------------------------------
  // ✅ Create or update event
  //-----------------------------------------------------------------------
  async upsertEvent(event: TimelineEvent) {
    const uid = safeUid();
    if (!uid) throw new Error("Not signed in.");
    await upsertEventInternal(uid, event);
  },

  //-----------------------------------------------------------------------
  // ✅ Delete event
  //-----------------------------------------------------------------------
  async deleteEvent(eventId: string) {
    const uid = safeUid();
    if (!uid) throw new Error("Not signed in.");
    const ref = doc(db, timelineCollectionPath(uid), eventId);
    await deleteDoc(ref);
  },

  //-----------------------------------------------------------------------
  // ✅ List (most recent first)
  //-----------------------------------------------------------------------
  async listRecent(take = 50): Promise<TimelineEvent[]> {
    const uid = safeUid();
    if (!uid) return [];

    // ✅ Order by numeric field to avoid Timestamp vs number type drift
    const colRef = collection(db, timelineCollectionPath(uid));
    const q = query(colRef, orderBy("timestampMs", "desc"), limit(take));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  //-----------------------------------------------------------------------
  // ✅ Legacy API expected by screens/hooks
  //-----------------------------------------------------------------------
  async getEvents(): Promise<TimelineEvent[]> {
    // Defensive: try migration once (safe/no-op if already done)
    await this.migrateFromAsyncStorageToFirestore();
    return await this.listRecent(100);
  },

  /**
   * Legacy: some older flows used saveEvents(list) as "bulk write".
   * We keep it as a best-effort upsert loop.
   */
  async saveEvents(events: TimelineEvent[]): Promise<void> {
    const uid = safeUid();
    if (!uid) throw new Error("Not signed in.");
    if (!Array.isArray(events)) return;

    for (const e of events) {
      const event = normalizeEvent(e);
      if (!event.id) continue;
      await upsertEventInternal(uid, event);
    }
  },

  //-----------------------------------------------------------------------
  // Convenience
  //-----------------------------------------------------------------------
  async getEventById(eventId: string): Promise<TimelineEvent | null> {
    const uid = safeUid();
    if (!uid) return null;

    const ref = doc(db, timelineCollectionPath(uid), eventId);
    const snap = await getDoc(ref);
    return snap.exists() ? fromFirestore(snap.id, snap.data()) : null;
  },
};
