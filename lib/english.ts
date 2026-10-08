import { apiRequest } from "./api-client";

export type EnglishSkill = "LISTENING" | "SPEAKING" | "READING" | "WRITING";
export type EnglishExercise = {
  id: string; skill: EnglishSkill; title: string; focus: string; minutes: number;
  minimumWords: number; prompt: string; passage: string; audioPath: string;
  items: { id: string; stem: string; options: string[] }[]; checklist: string[];
};
export type EnglishAttempt = {
  id: string; exerciseId: string; status: "DRAFT" | "SUBMITTED"; version: number;
  answers: Record<string, number>; response: string; elapsedSeconds: number;
  createdAt: string; updatedAt: string;
  feedback: null | { correct: number | null; total: number; transcript: string;
    items: { id: string; correctIndex: number; explanation: string }[] };
};
export type EnglishHistory = { items: EnglishAttempt[]; totalElements: number; page: number; size: number };
export const ENGLISH_SKILLS: EnglishSkill[] = ["LISTENING", "SPEAKING", "READING", "WRITING"];
export function countEnglishWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}
export function formatPracticeTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}
export const listEnglishExercises = () => apiRequest<EnglishExercise[]>("/english/exercises");
export const listEnglishHistory = (page = 1) => apiRequest<EnglishHistory>(`/english/attempts?page=${page}&size=10`);
export const startEnglishPractice = (exerciseId: string) => apiRequest<EnglishAttempt>("/english/attempts", { method: "POST", body: { exerciseId } });
export const getEnglishAttempt = (id: string) => apiRequest<EnglishAttempt>(`/english/attempts/${encodeURIComponent(id)}`);
export const saveEnglishAttempt = (attempt: EnglishAttempt, answers: Record<string, number>, response: string, elapsedSeconds: number, submit: boolean) =>
  apiRequest<EnglishAttempt>(`/english/attempts/${encodeURIComponent(attempt.id)}`, {
    method: "PUT", body: { version: attempt.version, answers, response, elapsedSeconds, submit },
  });
