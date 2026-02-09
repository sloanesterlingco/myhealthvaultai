// src/features/dailyNotes/types.ts

export type DailyNoteTag =
  | "symptoms"
  | "meds"
  | "questions"
  | "side_effects"
  | "follow_up";

export type DailyNote = {
  id: string;
  text: string;
  tags: DailyNoteTag[];
  createdAt: number;
  updatedAt: number;
};
