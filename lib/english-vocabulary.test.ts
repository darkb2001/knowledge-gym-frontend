import { describe, expect, it } from "vitest";
import { meaningChoices, normaliseRecall, recallMatches, topicMatches, VOCABULARY_COUNT, VOCABULARY_TOPICS } from "./english-vocabulary";

const entries = VOCABULARY_TOPICS.flatMap(t => t.entries);
describe("curated English vocabulary", () => {
  it("ships twenty small topics, not a fabricated four-thousand-word claim", () => {
    expect(VOCABULARY_TOPICS).toHaveLength(20);
    expect(VOCABULARY_COUNT).toBe(160);
    expect(new Set(entries.map(e => e.id)).size).toBe(160);
    expect(new Set(entries.map(e => e.term)).size).toBe(158);
    expect(VOCABULARY_TOPICS.every(t => t.entries.length === 8)).toBe(true);
  });
  it.each(entries)("includes an original usage sentence and local audio for $id", entry => {
    expect(entry.meaning.length).toBeGreaterThan(10);
    expect(entry.example.toLowerCase()).toContain(entry.term.toLowerCase());
    expect(entry.tip.length).toBeGreaterThan(20);
    expect(entry.audioPath).toBe(`/english/vocabulary/${entry.id}.mp3`);
  });
  it("normalises harmless formatting but does not fuzzy-pass wrong or empty answers", () => {
    expect(normaliseRecall("  LIFELONG   LEARNING! ")).toBe("lifelong learning");
    expect(recallMatches("PUBLIC INTEREST JOURNALISM", "public-interest journalism")).toBe(true);
    expect(recallMatches("higher education", "higher education")).toBe(true);
    expect(recallMatches("higher learning", "higher education")).toBe(false);
    expect(recallMatches("", "higher education")).toBe(false);
    expect(recallMatches("recycling programs", "recycling programmes")).toBe(false);
  });
  it("finds topics by Vietnamese, accent-free text and phrases", () => {
    expect(topicMatches(VOCABULARY_TOPICS[1], "moi truong")).toBe(true);
    expect(topicMatches(VOCABULARY_TOPICS[1], "renewable")).toBe(true);
    expect(topicMatches(VOCABULARY_TOPICS[1], "no-such-topic")).toBe(false);
  });
  it("provides four unique, stable meaning choices for each card", () => {
    for (const topic of VOCABULARY_TOPICS) for (const entry of topic.entries) {
      const choices = meaningChoices(topic, entry);
      expect(choices).toEqual(meaningChoices(topic, entry));
      expect(choices).toHaveLength(4);
      expect(new Set(choices.map(e => e.meaning)).size).toBe(4);
      expect(choices.filter(e => e.id === entry.id)).toHaveLength(1);
      expect(topic.entries.map(e => e.id)).toEqual(topic.entries.map((_, i) => `${topic.id}-${i + 1}`));
    }
  });
});
