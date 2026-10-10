import { VOCABULARY_TOPICS, orderVocabulary, type VocabularyMode, type VocabularyProgress, type VocabularyTopic } from "./english-vocabulary";

export type VocabularyFocus = "all" | "review";
export type VocabularyRound = { ids: string[]; index: number; used: string[]; cycle: number };
export type VocabularySession = { version: 1; topicId: string; mode: VocabularyMode; focus: VocabularyFocus; progress: VocabularyProgress; rounds: Record<string, VocabularyRound> };
export const VOCABULARY_MODES: VocabularyMode[] = ["learn", "quiz", "write", "listen", "match"];
export const VOCABULARY_SESSION_PREFIX = "kg.english-vocabulary.v1:";
type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const entries = new Set(VOCABULARY_TOPICS.flatMap(t => t.entries.map(e => e.id)));
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const boundedInteger = (value: unknown, maximum: number) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximum;
export const vocabularyRoundKey = (topic: string, mode: VocabularyMode, focus: VocabularyFocus) => `${topic}|${mode}|${focus}`;
export function createVocabularySession(): VocabularySession {
  return openVocabularyLocation({ version: 1, topicId: VOCABULARY_TOPICS[0].id, mode: "learn", focus: "all", progress: {}, rounds: {} });
}
function topicFor(session: VocabularySession): VocabularyTopic {
  return VOCABULARY_TOPICS.find(t => t.id === session.topicId) ?? VOCABULARY_TOPICS[0];
}
function createRound(session: VocabularySession, previous?: VocabularyRound, preferred?: string): VocabularyRound {
  const topic = topicFor(session);
  const pool = topic.entries.filter(e => session.focus === "all" || session.progress[e.id] === "review");
  let used = previous?.used ?? [];
  let cycle = previous?.cycle ?? 0;
  let candidates = pool.filter(e => !used.includes(e.id));
  // Consume a final short batch before cycling; never discard the last unseen terms.
  if (pool.length && !candidates.length) { used = []; cycle++; candidates = pool; }
  const preferredEntry = pool.find(e => e.id === preferred);
  const ordered = session.mode === "learn" && !cycle && !used.length ? candidates : orderVocabulary(candidates, `${session.topicId}:${session.mode}:${session.focus}:${cycle}:${used.length}`);
  const ids = (preferredEntry ? [preferredEntry, ...ordered.filter(e => e.id !== preferred)] : ordered).slice(0, 4).map(e => e.id);
  return { ids, index: 0, used, cycle };
}
export function openVocabularyLocation(session: VocabularySession, location: Partial<Pick<VocabularySession, "topicId" | "mode" | "focus">> = {}, preferred?: string): VocabularySession {
  const next = { ...session, ...location };
  const key = vocabularyRoundKey(next.topicId, next.mode, next.focus);
  const prior = next.rounds[key];
  // A previously empty revisit queue must refresh when new mistakes have been marked.
  const staleReview = next.focus === "review" && prior && !prior.ids.some(id => next.progress[id] === "review");
  const round = preferred || !prior || !prior.ids.length || staleReview ? createRound(next, prior, preferred) : prior;
  return { ...next, rounds: { ...next.rounds, [key]: round } };
}
export function currentVocabularyRound(session: VocabularySession): VocabularyRound {
  return session.rounds[vocabularyRoundKey(session.topicId, session.mode, session.focus)] ?? createRound(session);
}
export function moveVocabularyCursor(session: VocabularySession, delta: -1 | 1): VocabularySession {
  const round = currentVocabularyRound(session);
  if (!round.ids.length) return session;
  const used = delta > 0 ? [...new Set([...round.used, round.ids[round.index]])] : round.used;
  const key = vocabularyRoundKey(session.topicId, session.mode, session.focus);
  if (delta > 0 && round.index === round.ids.length - 1) {
    return { ...session, rounds: { ...session.rounds, [key]: createRound(session, { ...round, used }) } };
  }
  return { ...session, rounds: { ...session.rounds, [key]: { ...round, used, index: Math.max(0, Math.min(round.ids.length - 1, round.index + delta)) } } };
}
export function nextVocabularyRound(session: VocabularySession): VocabularySession {
  const round = currentVocabularyRound(session);
  const used = [...new Set([...round.used, ...round.ids])];
  const key = vocabularyRoundKey(session.topicId, session.mode, session.focus);
  return { ...session, rounds: { ...session.rounds, [key]: createRound(session, { ...round, used }) } };
}
export function resetVocabularyTopic(session: VocabularySession): VocabularySession {
  const topic = topicFor(session);
  const progress = { ...session.progress };
  topic.entries.forEach(e => delete progress[e.id]);
  const rounds = Object.fromEntries(Object.entries(session.rounds).filter(([key]) => !key.startsWith(`${topic.id}|`)));
  return openVocabularyLocation({ ...session, progress, rounds, focus: "all" });
}
// Client tab metadata is untrusted and is never used for server permission, XP or grading.
export function parseVocabularySession(raw: string | null): VocabularySession {
  const fallback = createVocabularySession();
  if (!raw || raw.length > 250_000) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || !VOCABULARY_TOPICS.some(t => t.id === value.topicId) || !VOCABULARY_MODES.includes(value.mode as VocabularyMode) || !["all", "review"].includes(value.focus as string)) return fallback;
    const progress: VocabularyProgress = {};
    if (object(value.progress)) for (const [id, status] of Object.entries(value.progress)) if (entries.has(id) && (status === "known" || status === "review")) progress[id] = status;
    const rounds: Record<string, VocabularyRound> = {};
    if (object(value.rounds)) for (const topic of VOCABULARY_TOPICS) for (const mode of VOCABULARY_MODES) for (const focus of ["all", "review"] as const) {
      const key = vocabularyRoundKey(topic.id, mode, focus);
      const round = value.rounds[key];
      if (!object(round) || !Array.isArray(round.ids) || !Array.isArray(round.used) || !boundedInteger(round.cycle, 1_000_000)) continue;
      const allowed = new Set(topic.entries.map(e => e.id));
      const clean = (ids: unknown[]) => [...new Set(ids.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
      const ids = clean(round.ids).slice(0, 4);
      const index = boundedInteger(round.index, 3) ? Math.min(round.index as number, Math.max(0, ids.length - 1)) : 0;
      rounds[key] = { ids, index, used: clean(round.used), cycle: round.cycle as number };
    }
    return openVocabularyLocation({ version: 1, topicId: value.topicId as string, mode: value.mode as VocabularyMode, focus: value.focus as VocabularyFocus, progress, rounds });
  } catch { return fallback; }
}
function storageKey(owner: string): string | null {
  return /^[a-zA-Z0-9-]{1,100}$/.test(owner) ? VOCABULARY_SESSION_PREFIX + owner : null;
}
export function readVocabularySession(owner: string, storage: SessionStorage): { session: VocabularySession; available: boolean } {
  const key = storageKey(owner);
  if (!key) return { session: createVocabularySession(), available: false };
  try { return { session: parseVocabularySession(storage.getItem(key)), available: true }; }
  catch { return { session: createVocabularySession(), available: false }; }
}
export function saveVocabularySession(owner: string, session: VocabularySession, storage: SessionStorage): boolean {
  const key = storageKey(owner);
  if (!key) return false;
  try { storage.setItem(key, JSON.stringify(session)); return true; } catch { return false; }
}
export function clearVocabularySession(owner: string, storage: SessionStorage): void {
  const key = storageKey(owner);
  if (key) try { storage.removeItem(key); } catch { /* Memory-only fallback. */ }
}
