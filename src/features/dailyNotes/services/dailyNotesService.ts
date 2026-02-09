// src/features/dailyNotes/services/dailyNotesService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import type { DailyNote, DailyNoteTag } from "../types";

function requireUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

function notesCol(uid: string) {
  return collection(db, "users", uid, "daily_notes");
}

function noteDoc(uid: string, noteId: string) {
  return doc(db, "users", uid, "daily_notes", noteId);
}

export const dailyNotesService = {
  async listLatest(max = 60): Promise<DailyNote[]> {
    const uid = requireUid();
    const q = query(notesCol(uid), orderBy("createdAt", "desc"), limit(max));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        text: String(data?.text ?? ""),
        tags: (data?.tags ?? []) as DailyNoteTag[],
        createdAt: Number(data?.createdAt ?? Date.now()),
        updatedAt: Number(data?.updatedAt ?? data?.createdAt ?? Date.now()),
      };
    });
  },

  async getById(noteId: string): Promise<DailyNote | null> {
    const uid = requireUid();
    const ref = noteDoc(uid, noteId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as any;
    return {
      id: snap.id,
      text: String(data?.text ?? ""),
      tags: (data?.tags ?? []) as DailyNoteTag[],
      createdAt: Number(data?.createdAt ?? Date.now()),
      updatedAt: Number(data?.updatedAt ?? data?.createdAt ?? Date.now()),
    };
  },

  async create(payload: { text: string; tags: DailyNoteTag[] }) {
    const uid = requireUid();
    const now = Date.now();

    const ref = await addDoc(notesCol(uid), {
      text: payload.text,
      tags: payload.tags ?? [],
      createdAt: now,
      updatedAt: now,
      _serverCreatedAt: serverTimestamp(),
      _serverUpdatedAt: serverTimestamp(),
    });

    return ref.id;
  },

  async update(noteId: string, payload: { text: string; tags: DailyNoteTag[] }) {
    const uid = requireUid();
    const now = Date.now();

    await updateDoc(noteDoc(uid, noteId), {
      text: payload.text,
      tags: payload.tags ?? [],
      updatedAt: now,
      _serverUpdatedAt: serverTimestamp(),
    });
  },

  async upsert(note: DailyNote) {
    const uid = requireUid();
    await setDoc(
      noteDoc(uid, note.id),
      {
        text: note.text,
        tags: note.tags ?? [],
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        _serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async remove(noteId: string) {
    const uid = requireUid();
    await deleteDoc(noteDoc(uid, noteId));
  },
};
