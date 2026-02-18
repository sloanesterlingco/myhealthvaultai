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

import type {
  TimelineEvent,
  TimelineEventLevel,
  TimelineEventType,
  TimelineCategory,
} from "./timelineTypes";

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
    category: (e as any).category ?? undefined,
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

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function toNumberTimestamp(v: any): number {
  if (typeof v === "number") return v;
  if (v instanceof Timestamp) return v.toMillis();
  if (v?.toMillis) return v.toMillis();
  return Date.now();
}

async function migrateLegacyIfNeeded(uid: string) {
  try {
    const already = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (already === "true") return;

    const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return;
    }

    // Bulk upsert
    const basePath = timelineCollectionPath(uid);
    await Promise.all(
      parsed.map(async (e: any) => {
        const ev = normalizeEvent({
          id: String(e?.id ?? `legacy-${Date.now()}-${randomSuffix()}`),
          type: (e?.type ?? "GENERAL") as any,
          category: (e?.category ?? undefined) as any,
          summary: String(e?.summary ?? e?.title ?? "Legacy item"),
          detail: typeof e?.detail === "string" ? e.detail : undefined,
          title: typeof e?.title === "string" ? e.title : undefined,
          notes: typeof e?.notes === "string" ? e.notes : null,
          timestamp: toNumberTimestamp(e?.timestamp ?? e?.timestampMs ?? Date.now()),
          date: typeof e?.date === "string" ? e.date : undefined,
          level: (e?.level ?? "low") as any,
          meta: e?.meta ?? {},
        });

        const ref = doc(db, basePath, ev.id);
        await setDoc(
          ref,
          {
            ...ev,
            timestampMs: ev.timestamp,
            updatedAt: serverTimestamp(),
            createdAt:
              typeof (e as any)?.createdAt !== "undefined"
                ? (e as any).createdAt
                : serverTimestamp(),
          },
          { merge: true }
        );
      })
    );

    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "true");
  } catch {
    // Never block app if migration fails
  }
}

async function upsertEventInternal(uid: string, event: TimelineEvent) {
  const basePath = timelineCollectionPath(uid);
  const ref = doc(db, basePath, event.id);

  const timestamp = typeof event.timestamp === "number" ? event.timestamp : Date.now();
  const date = typeof event.date === "string" ? event.date : toYmd(timestamp);

  const payload = {
    ...event,
    timestamp,
    timestampMs: timestamp,
    date,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });
}

async function readLatestEvents(uid: string, max: number): Promise<TimelineEvent[]> {
  const col = collection(db, timelineCollectionPath(uid));
  const q = query(col, orderBy("timestampMs", "desc"), limit(max));
  const snap = await getDocs(q);

  const out: TimelineEvent[] = [];
  snap.forEach((docSnap) => {
    const d: any = docSnap.data();
    out.push(
      normalizeEvent({
        id: docSnap.id,
        type: d.type ?? "GENERAL",
        category: d.category ?? undefined,
        summary: d.summary ?? d.title ?? "",
        detail: d.detail ?? undefined,
        title: d.title ?? undefined,
        notes: d.notes ?? null,
        timestamp: toNumberTimestamp(d.timestampMs ?? d.timestamp),
        date: typeof d.date === "string" ? d.date : undefined,
        level: (d.level ?? "low") as TimelineEventLevel,
        meta: d.meta ?? {},
      })
    );
  });

  return out;
}

export const timelineService = {
  //-----------------------------------------------------------------------
  // ✅ Primary consumer API
  //-----------------------------------------------------------------------
  async getEvents(): Promise<TimelineEvent[]> {
    const uid = safeUid();
    if (!uid) return [];
    await migrateLegacyIfNeeded(uid);
    return await readLatestEvents(uid, 250);
  },

  //-----------------------------------------------------------------------
  // ✅ Legacy compatibility (older screens call saveEvents)
  //-----------------------------------------------------------------------
  async saveEvents(events: TimelineEvent[]) {
    const uid = safeUid();
    if (!uid) return;

    await Promise.all(events.map((e) => upsertEventInternal(uid, normalizeEvent(e))));
  },

  //-----------------------------------------------------------------------
  // ✅ Add a single event (preferred)
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
      category: (input?.category ?? undefined) as TimelineCategory | undefined,
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
  // ✅ Get single event
  //-----------------------------------------------------------------------
  async getEvent(eventId: string): Promise<TimelineEvent | null> {
    const uid = safeUid();
    if (!uid) return null;
    const ref = doc(db, timelineCollectionPath(uid), eventId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const d: any = snap.data();
    return normalizeEvent({
      id: snap.id,
      type: d.type ?? "GENERAL",
      category: d.category ?? undefined,
      summary: d.summary ?? d.title ?? "",
      detail: d.detail ?? undefined,
      title: d.title ?? undefined,
      notes: d.notes ?? null,
      timestamp: toNumberTimestamp(d.timestampMs ?? d.timestamp),
      date: typeof d.date === "string" ? d.date : undefined,
      level: (d.level ?? "low") as TimelineEventLevel,
      meta: d.meta ?? {},
    });
  },
};
