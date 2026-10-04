import { describe, expect, it } from "vitest";
import { learningDraftPreview } from "./learning-draft-preview";

describe("learning draft display extraction", () => {
  it("extracts known fields without executing or translating source content", () => {
    expect(learningDraftPreview(JSON.stringify({ title: "JVM", answerHtml: "<p>Bytecode</p>" }))).toEqual({ title: "JVM", html: "<p>Bytecode</p>", text: null });
  });
  it("handles text-based flashcards", () => {
    expect(learningDraftPreview('{"front":"Question","back":"Answer"}')).toEqual({ title: "Question", html: null, text: "Answer" });
  });
  it.each(["not JSON", "null", "[]", '"string"', '{"answerHtml":[],"title":123}', '{"unknown":"<script>bad()</script>"}'])("fails safely for %s", value => {
    expect(learningDraftPreview(value)).toEqual({ title: null, html: null, text: null });
  });
});
