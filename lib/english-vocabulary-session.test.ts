import { describe, expect, it } from "vitest";
import { VOCABULARY_TOPICS, type VocabularyMode } from "./english-vocabulary";
import { clearVocabularySession, createVocabularySession, currentVocabularyRound, moveVocabularyCursor, nextVocabularyRound, openVocabularyLocation, parseVocabularySession, readVocabularySession, resetVocabularyTopic, saveVocabularySession, VOCABULARY_MODES, VOCABULARY_SESSION_PREFIX, vocabularyRoundKey } from "./english-vocabulary-session";

const cases = VOCABULARY_TOPICS.flatMap(topic => VOCABULARY_MODES.map(mode => ({ topic, mode })));
const storage = () => {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
};
describe("English vocabulary session and finite recall rounds", () => {
  it.each(cases)("covers all eight $topic.id terms without repeats in $mode", ({ topic, mode }) => {
    let session = openVocabularyLocation(createVocabularySession(), { topicId: topic.id, mode });
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      const round = currentVocabularyRound(session);
      expect(round.ids).toHaveLength(4);
      seen.push(round.ids[round.index]);
      session = moveVocabularyCursor(session, 1);
    }
    expect(new Set(seen).size).toBe(8);
    expect(new Set(seen)).toEqual(new Set(topic.entries.map(e => e.id)));
    expect(currentVocabularyRound(session).cycle).toBe(1);
  });
  it("keeps independent topic/mode cursors and resumes the exact card", () => {
    let session = moveVocabularyCursor(createVocabularySession(), 1);
    session = openVocabularyLocation(session, { mode: "quiz" });
    session = moveVocabularyCursor(session, 1);
    session = openVocabularyLocation(session, { topicId: "health", mode: "learn" });
    session = openVocabularyLocation(session, { topicId: "education" });
    expect(currentVocabularyRound(session).index).toBe(1);
    expect(currentVocabularyRound(session).ids[1]).toBe("education-2");
    session = openVocabularyLocation(session, { mode: "quiz" });
    expect(currentVocabularyRound(session).index).toBe(1);
    expect(parseVocabularySession(JSON.stringify(session))).toEqual(session);
  });
  it("selects a searched phrase instead of silently opening the topic's first card", () => {
    const session = openVocabularyLocation(createVocabularySession(), { topicId: "energy" }, "energy-8");
    expect(currentVocabularyRound(session).ids[0]).toBe("energy-8");
    expect(currentVocabularyRound(session).ids).toHaveLength(4);
  });
  it("returns an empty revisit queue rather than filling it with known phrases", () => {
    const session = openVocabularyLocation(createVocabularySession(), { focus: "review" });
    expect(currentVocabularyRound(session).ids).toEqual([]);
    expect(moveVocabularyCursor(session, 1)).toEqual(session);
  });
  it("builds short revisit rounds from mistakes only and refreshes a previously empty queue", () => {
    let session = openVocabularyLocation(createVocabularySession(), { focus: "review" });
    session = { ...session, progress: { "education-2": "review", "education-6": "review", "education-1": "known" } };
    session = openVocabularyLocation(session);
    expect(new Set(currentVocabularyRound(session).ids)).toEqual(new Set(["education-2", "education-6"]));
    session = { ...session, progress: { "education-2": "known", "education-6": "known", "education-1": "known" } };
    expect(currentVocabularyRound(openVocabularyLocation(session)).ids).toEqual([]);
  });
  it("consumes a final one-card batch before allowing repetitions", () => {
    let session = createVocabularySession();
    const progress = Object.fromEntries(VOCABULARY_TOPICS[0].entries.slice(0, 5).map(e => [e.id, "review" as const]));
    session = openVocabularyLocation({ ...session, progress }, { focus: "review" });
    expect(currentVocabularyRound(session).ids).toHaveLength(4);
    session = nextVocabularyRound(session);
    expect(currentVocabularyRound(session).ids).toHaveLength(1);
    expect(currentVocabularyRound(session).cycle).toBe(0);
    expect(currentVocabularyRound(session).used).toHaveLength(4);
    session = nextVocabularyRound(session);
    expect(currentVocabularyRound(session).cycle).toBe(1);
  });
  it("resets only the chosen topic and leaves other topic marks and cursors intact", () => {
    let session = createVocabularySession();
    session = { ...session, progress: { "education-1": "review", "health-2": "known" } };
    session = openVocabularyLocation(session, { topicId: "health" });
    session = moveVocabularyCursor(session, 1);
    session = openVocabularyLocation(session, { topicId: "education", focus: "review" });
    const reset = resetVocabularyTopic(session);
    expect(reset.progress).toEqual({ "health-2": "known" });
    expect(reset.focus).toBe("all");
    expect(reset.rounds[vocabularyRoundKey("health", "learn", "all")].index).toBe(1);
    expect(currentVocabularyRound(reset).index).toBe(0);
  });
  it.each([null, "not-json", "null", "[]", '{"version":99}', "x".repeat(250_001)])("fails safely on invalid or oversized snapshot %s", raw => {
    expect(parseVocabularySession(raw)).toEqual(createVocabularySession());
  });
  it("drops arbitrary fields, foreign IDs, duplicate IDs, invalid indices and fake mastery", () => {
    const session = createVocabularySession();
    const raw = { ...session, sentence: "PRIVATE TEXT", xp: 9999, progress: { "education-1": "known", "education-2": "MASTERED", "other-user": "known" }, rounds: { "education|learn|all": { ids: ["education-2", "health-1", "education-2", "education-3"], index: 200, used: ["education-1", "education-1", "health-1"], cycle: 0 }, "__proto__": { polluted: true } } };
    const parsed = parseVocabularySession(JSON.stringify(raw));
    expect(parsed.progress).toEqual({ "education-1": "known" });
    expect(currentVocabularyRound(parsed)).toEqual({ ids: ["education-2", "education-3"], index: 0, used: ["education-1"], cycle: 0 });
    expect(JSON.stringify(parsed)).not.toContain("PRIVATE TEXT");
    expect(JSON.stringify(parsed)).not.toContain("xp");
    expect(Object.prototype).not.toHaveProperty("polluted");
  });
  it.each(["hack", "LEARN", "", 10])("rejects unsupported mode %s", mode => {
    expect(parseVocabularySession(JSON.stringify({ ...createVocabularySession(), mode }))).toEqual(createVocabularySession());
  });
  it("namespaces snapshots by account and does not leak marks to another account", () => {
    const tab = storage();
    const session = { ...createVocabularySession(), progress: { "education-1": "review" as const } };
    expect(saveVocabularySession("owner-a", session, tab)).toBe(true);
    expect(readVocabularySession("owner-a", tab).session.progress).toEqual(session.progress);
    expect(readVocabularySession("owner-b", tab).session.progress).toEqual({});
    clearVocabularySession("owner-a", tab);
    expect(tab.data.has(VOCABULARY_SESSION_PREFIX + "owner-a")).toBe(false);
  });
  it("fails to memory-only practice when reading, writing or deleting storage throws", () => {
    const unavailable = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(readVocabularySession("owner", unavailable)).toEqual({ session: createVocabularySession(), available: false });
    expect(saveVocabularySession("owner", createVocabularySession(), unavailable)).toBe(false);
    expect(() => clearVocabularySession("owner", unavailable)).not.toThrow();
    expect(saveVocabularySession("", createVocabularySession(), storage())).toBe(false);
  });
  it("does not mutate the caller's progress, IDs or round when advancing", () => {
    const original = createVocabularySession(); const before = JSON.stringify(original);
    const next = moveVocabularyCursor(original, 1);
    expect(JSON.stringify(original)).toBe(before);
    expect(next).not.toBe(original);
    expect(next.rounds[vocabularyRoundKey("education", "learn", "all")].used).toEqual(["education-1"]);
  });
  it("allows matching batches to advance without rewriting unrelated exercise histories", () => {
    const original = openVocabularyLocation(createVocabularySession(), { mode: "match" as VocabularyMode });
    const next = nextVocabularyRound(original);
    expect(currentVocabularyRound(next).ids.some(id => currentVocabularyRound(original).ids.includes(id))).toBe(false);
    expect(next.progress).toEqual({});
  });
});
