import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";
import { countEnglishWords, formatPracticeTime, getEnglishTranscript, getEnglishAttempt, listEnglishExercises, listEnglishHistory, saveEnglishAttempt, startEnglishPractice, type EnglishAttempt } from "./english";
vi.mock("./api-client", () => ({ apiRequest: vi.fn() }));
const attempt = { id: "a", version: 2 } as EnglishAttempt;
describe("English Studio contract", () => {
  beforeEach(() => vi.clearAllMocks());
  it("counts words with apostrophes/hyphens and punctuation without awarding a score", () => {
    expect(countEnglishWords("")).toBe(0);
    expect(countEnglishWords("  Dear Alex,\nI'd recommend a well-known café. ")).toBe(7);
    expect(countEnglishWords("… ! ?")).toBe(0);
    expect(countEnglishWords("student’s study")).toBe(2);
  });
  it("formats elapsed time, including overtime", () => {
    expect(formatPracticeTime(-3)).toBe("00:00");
    expect(formatPracticeTime(125)).toBe("02:05");
    expect(formatPracticeTime(7200)).toBe("120:00");
  });
  it("uses dedicated authenticated routes and paginated history", () => {
    listEnglishExercises(); listEnglishHistory(3);
    expect(apiRequest).toHaveBeenCalledWith("/english/exercises");
    expect(apiRequest).toHaveBeenCalledWith("/english/attempts?page=3&size=10");
  });
  it("sends no client actor or claimed score", () => {
    startEnglishPractice("writing-email-v1");
    saveEnglishAttempt(attempt, {}, "Dear Alex", 100, true);
    expect(apiRequest).toHaveBeenCalledWith("/english/attempts", { method: "POST", body: { exerciseId: "writing-email-v1" } });
    expect(apiRequest).toHaveBeenCalledWith("/english/attempts/a", { method: "PUT", body: { version: 2, answers: {}, response: "Dear Alex", elapsedSeconds: 100, submit: true } });
  });
  it("fetches only explicitly requested transcript paths and encodes exercise/section parameters", () => {
    getEnglishTranscript("listening-announcement-v1"); getEnglishTranscript("../lesson", "a&b");
    expect(apiRequest).toHaveBeenCalledWith("/english/exercises/listening-announcement-v1/transcript");
    expect(apiRequest).toHaveBeenCalledWith("/english/exercises/..%2Flesson/transcript?partId=a%26b");
  });
  it("encodes attempt paths", () => {
    getEnglishAttempt("../other");
    expect(apiRequest).toHaveBeenCalledWith("/english/attempts/..%2Fother");
  });
});
