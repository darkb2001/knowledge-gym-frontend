import { describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "../.fixtures/english/catalog.json";
import { LocaleProvider } from "../components/locale";
import { ReferenceResponse } from "../components/english/ReferenceResponse";
import { ExamPreparationGuide } from "../components/english/ExamPreparationGuide";
import { englishPracticeHref, HCMUS_TRANSFER_IDS, matchesEnglishTrack, readEnglishTrack, trackForEnglishExercise } from "./english-preparation";
import type { EnglishExercise, EnglishReferenceResponse } from "./english";

const render = (child: ReactNode) => renderToStaticMarkup(createElement(LocaleProvider, null, child));
const bank = fixture as (EnglishExercise & { referenceResponse: EnglishReferenceResponse | null })[];
describe("English preparation tracks and reference models", () => {
  it("keeps the 31 VSTEP tasks separate from sixteen HCMUS preparatory tasks", () => {
    expect(bank).toHaveLength(47);
    expect(bank.filter(e => matchesEnglishTrack(e, "VSTEP"))).toHaveLength(31);
    expect(bank.filter(e => e.curriculum === "HCMUS_PREPARATION")).toHaveLength(16);
    expect(bank.filter(e => matchesEnglishTrack(e, "HCMUS_PREPARATION"))).toHaveLength(24);
    expect(bank.filter(e => matchesEnglishTrack(e, "HCMUS_PREPARATION")).every(e => e.curriculum === "HCMUS_PREPARATION" || HCMUS_TRANSFER_IDS.has(e.id))).toBe(true);
    expect(matchesEnglishTrack({ ...bank[0], curriculum: undefined }, "VSTEP")).toBe(true);
    expect(matchesEnglishTrack(bank.find(e => e.id === "writing-essay-v1")!, "HCMUS_PREPARATION")).toBe(false);
  });
  it("keeps transfer practice in HCMUS but restores a non-transfer historical VSTEP task to its own track", () => {
    expect(trackForEnglishExercise(bank.find(e => e.id === "listening-study-space-v1")!, "HCMUS_PREPARATION")).toBe("HCMUS_PREPARATION");
    expect(trackForEnglishExercise(bank.find(e => e.id === "writing-email-v1")!, "HCMUS_PREPARATION")).toBe("VSTEP");
    expect(trackForEnglishExercise(bank.find(e => e.id === "hcmus-grammar-v1")!, "VSTEP")).toBe("HCMUS_PREPARATION");
  });
  it("preserves the HCMUS study context in shareable/reloadable links without owner or score parameters", () => {
    expect(englishPracticeHref("VSTEP")).toBe("/english");
    expect(englishPracticeHref("HCMUS_PREPARATION")).toBe("/english?track=hcmus");
    expect(readEnglishTrack("?track=hcmus&attempt=example")).toBe("HCMUS_PREPARATION");
    expect(readEnglishTrack("?track=unknown")).toBe("VSTEP");
    expect(englishPracticeHref("HCMUS_PREPARATION", "a&b")).toBe("/english?track=hcmus&attempt=a%26b");
  });
  it("includes the actual grammar/cloze task types without claiming an official weighted mock", () => {
    expect(bank.find(e => e.id === "hcmus-vocabulary-v1")!.items).toHaveLength(10);
    expect(bank.find(e => e.id === "hcmus-grammar-v1")!.items).toHaveLength(15);
    expect(bank.find(e => e.id === "hcmus-cloze-v1")!.items).toHaveLength(10);
    const html = render(createElement(ExamPreparationGuide, { track: "HCMUS_PREPARATION", disabled: false, onChange: () => {} }));
    expect(html).toContain("biến đổi câu");
    expect(html).toContain("không phải đề thi của trường");
    expect(html).toContain("Phụ lục 6");
    expect(html).toContain("10 + 5 + 5");
    expect(bank.find(e => e.id === "hcmus-listening-complete-v1")!.parts?.map(p => p.itemIds.length)).toEqual([10, 5, 5]);
  });
  it.each(bank.filter(e => e.referenceResponse))("renders a complete plain-text reference and Vietnamese notes for $id", e => {
    const html = render(createElement(ReferenceResponse, { value: e.referenceResponse!, skill: e.skill }));
    expect(html).toContain("Không phải đáp án chính thức");
    expect(html).toContain("Đọc mẫu để học điều gì?");
    expect(html).toContain(e.skill === "WRITING" ? "Bài viết mẫu tham khảo" : "Câu trả lời mẫu tham khảo");
    expect(html).toContain('lang="en"');
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });
  it("escapes markup rather than evaluating reference content", () => {
    const html = render(createElement(ReferenceResponse, { skill: "WRITING", value: { title: "Test", text: '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>', notes: [{ vi: "Ghi chú", en: "Note" }] } }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });
  it("binds every grouped question to exactly one section without changing its ID", () => {
    for (const exercise of bank.filter(e => e.parts?.length)) {
      const ids = exercise.parts!.flatMap(p => p.itemIds);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual(exercise.items.map(q => q.id));
    }
  });
});
