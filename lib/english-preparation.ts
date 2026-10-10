import type { EnglishExercise } from "./english";

export type EnglishTrack = "VSTEP" | "HCMUS_PREPARATION";
// Transfer practice, not exact replicas of the HCMUS Listening paper.
export const HCMUS_TRANSFER_IDS = new Set([
  "reading-repair-cafe-v1", "reading-flexible-work-v1", "reading-community-gardens-v1", "reading-citizen-science-v1",
  "listening-study-space-v1", "listening-volunteer-shifts-v1", "listening-urban-shade-v1", "listening-retrieval-practice-v1",
]);
export function matchesEnglishTrack(exercise: EnglishExercise, track: EnglishTrack): boolean {
  return track === "VSTEP" ? exercise.curriculum !== "HCMUS_PREPARATION"
    : exercise.curriculum === "HCMUS_PREPARATION" || HCMUS_TRANSFER_IDS.has(exercise.id);
}
export function trackForEnglishExercise(exercise: EnglishExercise, preferred: EnglishTrack): EnglishTrack {
  if (exercise.curriculum === "HCMUS_PREPARATION") return "HCMUS_PREPARATION";
  return matchesEnglishTrack(exercise, preferred) ? preferred : "VSTEP";
}
export function readEnglishTrack(search: string): EnglishTrack {
  return new URLSearchParams(search).get("track") === "hcmus" ? "HCMUS_PREPARATION" : "VSTEP";
}
export function englishPracticeHref(track: EnglishTrack, attemptId?: string): string {
  const query = new URLSearchParams();
  if (track === "HCMUS_PREPARATION") query.set("track", "hcmus");
  if (attemptId) query.set("attempt", attemptId);
  return `/english${query.size ? `?${query.toString()}` : ""}`;
}
export const HCMUS_NOTICE = "https://sdh.hcmus.edu.vn/2026/08/05/thong-bao-xet-tuyen-chuong-trinh-dao-tao-trinh-do-thac-si-nam-2026-dot-2/";
export const HUS_ADMISSIONS = "https://tuyensinh.hus.vnu.edu.vn/sau-dai-hoc";
