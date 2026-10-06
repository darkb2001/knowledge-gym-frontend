import { describe, expect, it } from "vitest";

import {
  MAX_QUOTE,
  belongsToPage,
  buildSearchIndex,
  clampQuote,
  groupBySession,
  isCurrentSession,
  locateQuote,
  readSession,
  sessionKeyFor,
  startSession,
  type ReadingNote,
} from "./reading-notes";

function fakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

function note(partial: Partial<ReadingNote> & { id: string }): ReadingNote {
  return {
    questionId: "q1",
    moduleId: "m1",
    noteType: "HIGHLIGHT",
    content: "nội dung",
    highlight: null,
    tags: [],
    createdAt: "2026-10-06T08:00:00Z",
    updatedAt: "2026-10-06T08:00:00Z",
    ...partial,
  };
}

describe("clampQuote", () => {
  it("gộp khoảng trắng và cắt theo giới hạn", () => {
    expect(clampQuote("  G1 là   bộ sưu tập\n young ")).toBe("G1 là bộ sưu tập young");
    expect(clampQuote("x".repeat(MAX_QUOTE + 50))).toHaveLength(MAX_QUOTE);
  });

  it("trả chuỗi rỗng với đoạn chỉ có khoảng trắng", () => {
    expect(clampQuote("   \n\t ")).toBe("");
  });
});

describe("phiên đọc", () => {
  it("giữ nguyên phiên trong cùng một lượt đọc", () => {
    const storage = fakeStorage();
    const key = sessionKeyFor("user-1", "/questions/abc");
    const first = readSession(key, storage);
    expect(readSession(key, storage)).toBe(first);
    expect(sessionKeyFor("user-2", "/questions/abc")).not.toBe(key);
  });

  it("bắt đầu phiên mới thì id đổi", () => {
    const storage = fakeStorage();
    const key = sessionKeyFor("user-1", "/questions/abc");
    const first = readSession(key, storage);
    const second = startSession(key, storage);
    expect(second).not.toBe(first);
    expect(readSession(key, storage)).toBe(second);
  });

  it("không có storage vẫn trả về một id dùng được", () => {
    expect(readSession("kg:test", null)).toMatch(/[0-9a-f-]{8,}/);
  });
});

describe("lọc và gom ghi chú", () => {
  it("chỉ nhận ghi chú của đúng bài đang đọc", () => {
    expect(belongsToPage(note({ id: "a", questionId: "q1" }), { questionId: "q1", moduleId: "m1" })).toBe(true);
    expect(belongsToPage(note({ id: "b", questionId: "q2" }), { questionId: "q1", moduleId: "m1" })).toBe(false);
    expect(belongsToPage(note({ id: "c", questionId: null, moduleId: "m1" }), { moduleId: "m1" })).toBe(true);
    expect(belongsToPage(note({ id: "d" }), {})).toBe(false);
  });

  it("gom theo phiên, phiên mới nhất lên đầu, note cũ (không neo) vào nhóm riêng", () => {
    const groups = groupBySession([
      note({ id: "old", highlight: { quote: "a", start: 0, end: 1, blockIndex: 0, sessionId: "s1", path: "/p" }, updatedAt: "2026-10-01T00:00:00Z" }),
      note({ id: "new", highlight: { quote: "b", start: 0, end: 1, blockIndex: 0, sessionId: "s2", path: "/p" }, updatedAt: "2026-10-06T00:00:00Z" }),
      note({ id: "legacy", highlight: null, updatedAt: "2026-09-01T00:00:00Z" }),
    ]);
    expect(groups.map(group => group.sessionId)).toEqual(["s2", "s1", null]);
    expect(groups[0].notes.map(item => item.id)).toEqual(["new"]);
  });

  it("đánh dấu note thuộc phiên đang đọc", () => {
    const anchored = note({ id: "a", highlight: { quote: "a", start: 0, end: 1, blockIndex: 0, sessionId: "s2", path: "/p" } });
    expect(isCurrentSession(anchored, "s2")).toBe(true);
    expect(isCurrentSession(anchored, "s1")).toBe(false);
    expect(isCurrentSession(note({ id: "b" }), null)).toBe(true);
  });
});

describe("tìm đoạn trích trong nội dung đã render", () => {
  it("khớp dù HTML xuống dòng/thụt lề khác câu đã lưu", () => {
    const index = buildSearchIndex([
      { text: "Khối đầu tiên:\n" },
      { text: "  G1 là bộ sưu tập young   generation\n" },
      { text: "Khối sau." },
    ]);
    const found = locateQuote(index, "G1 là bộ sưu tập young generation");
    expect(found).not.toBeNull();
    expect(found?.start.node).toBe(1);
    expect(found?.end.node).toBe(1);
    expect(index.text.slice(0, 4)).toBe("Khối");
  });

  it("khớp qua nhiều node văn bản liền nhau", () => {
    const index = buildSearchIndex([{ text: "JVM chia heap thành " }, { text: "young generation và old generation." }]);
    const found = locateQuote(index, "heap thành young generation");
    expect(found).not.toBeNull();
    expect(found?.start.node).toBe(0);
    expect(found?.end.node).toBe(1);
  });

  it("vẫn khớp khi câu trích bị cắt ở cuối", () => {
    const long = `mở đầu ${"chi tiết ".repeat(80)}kết thúc`;
    const index = buildSearchIndex([{ text: long }]);
    expect(locateQuote(index, long)).not.toBeNull();
    expect(locateQuote(index, "đoạn không tồn tại trong bài")).toBeNull();
    expect(locateQuote(index, "")).toBeNull();
  });
});
