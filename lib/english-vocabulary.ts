import authored from "@/content/english/topics.json";
import expansion from "@/content/english/topic-expansion.json";

export type VocabularyEntry = { id: string; term: string; meaning: string; example: string; tip: string; audioPath: string };
export type VocabularyTopic = { id: string; title: string; vi: string; entries: VocabularyEntry[] };
export type VocabularyProgress = Record<string, "known" | "review">;
export type VocabularyMode = "learn" | "quiz" | "write" | "listen" | "match";
export const VOCABULARY_TOPICS: VocabularyTopic[] = authored.map(topic => ({ ...topic, entries: [...topic.entries, ...expansion[topic.id as keyof typeof expansion].map(entry => ({ ...entry, tip: entry.usage }))].map((entry, index) => ({ ...entry, id: `${topic.id}-${index + 1}`, audioPath: `/english/vocabulary/${topic.id}-${index + 1}.mp3` })) }));
export const VOCABULARY_COUNT = VOCABULARY_TOPICS.reduce((sum, topic) => sum + topic.entries.length, 0);

// Comparison only: tolerate case, punctuation, hyphens and extra spaces.
// Do not fuzzy-pass wrong words or silently accept different British/US spellings.
export function normaliseRecall(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[’‘]/g, "'").replace(/[-‐‑–—]/g, " ").replace(/[.,!?;:]/g, "").replace(/\s+/g, " ").trim();
}
export function recallMatches(value: string, expected: string): boolean {
  return !!normaliseRecall(value) && normaliseRecall(value) === normaliseRecall(expected);
}
export function topicMatches(topic: VocabularyTopic, query: string): boolean {
  const normalise = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").toLowerCase();
  return normalise([topic.title, topic.vi, ...topic.entries.flatMap(e => [e.term, e.meaning])].join(" ")).includes(normalise(query.trim()));
}
export function vocabularyHash(value: string): number {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function orderVocabulary<T extends { id: string }>(entries: T[], seed: string): T[] {
  return [...entries].sort((a, b) => vocabularyHash(seed + a.id) - vocabularyHash(seed + b.id) || a.id.localeCompare(b.id));
}
// Four distinct meanings, including the answer, stable until the prompt changes.
export function meaningChoices(topic: VocabularyTopic, entry: VocabularyEntry): VocabularyEntry[] {
  const seen = new Set([normaliseRecall(entry.meaning)]);
  const distractors = orderVocabulary(topic.entries.filter(e => e.id !== entry.id), entry.id).filter(e => {
    const meaning = normaliseRecall(e.meaning);
    if (seen.has(meaning)) return false;
    seen.add(meaning); return true;
  }).slice(0, 3);
  return orderVocabulary([entry, ...distractors], `${entry.id}:choices`);
}
