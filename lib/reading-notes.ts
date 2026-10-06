import { apiRequest } from "./api-client";

/**
 * Ghi chú neo vào đoạn văn đang đọc.
 *
 * Mỗi note có thể mang thêm `highlight` mô tả đúng đoạn người đọc bôi đen: câu trích nguyên văn,
 * chỉ số khối và phiên đọc. Nhờ vậy ghi chú nằm ngay trong ngữ cảnh đang khám phá, và gom được
 * theo từng phiên đọc của từng người — dữ liệu của người này không lẫn với người khác.
 */
export type NoteHighlight = {
  quote: string | null;
  start: number | null;
  end: number | null;
  blockIndex: number | null;
  sessionId: string | null;
  path: string | null;
};

export type ReadingNote = {
  id: string;
  questionId: string | null;
  moduleId: string | null;
  noteType: string;
  content: string | null;
  highlight: NoteHighlight | null;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

export const NOTE_TYPES: ReadingNoteType[] = ["HIGHLIGHT", "QUICK", "STUDY"];
export type ReadingNoteType = "HIGHLIGHT" | "QUICK" | "STUDY";

/** Câu trích dài hơn mức này bị cắt bớt: neo chỉ cần đủ để nhận ra đoạn đang đọc. */
export const MAX_QUOTE = 400;

export type PageIds = { questionId?: string | null; moduleId?: string | null };

export type SessionGroup = { sessionId: string | null; notes: ReadingNote[]; latest: number };

export type TextNodeSlice = { text: string };

export type SearchAnchor = { node: number; offset: number };

/** Chuẩn hoá câu trích: gộp khoảng trắng, cắt độ dài để không lưu cả bài vào neo. */
export function clampQuote(quote: string, max = MAX_QUOTE): string {
  const clean = quote.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max).trimEnd();
}

export function newSessionId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Khoá lưu phiên đọc trong `sessionStorage`: mỗi người, mỗi trang, một phiên riêng. */
export function sessionKeyFor(userKey: string, path: string): string {
  return `kg:reading-session:${userKey || "anon"}:${path}`;
}

/** Đọc phiên đang có (hoặc tạo mới) — dùng khi vào trang đọc. */
export function readSession(key: string, storage?: Storage | null): string {
  try {
    const existing = storage?.getItem(key);
    if (existing) return existing;
    const fresh = newSessionId();
    storage?.setItem(key, fresh);
    return fresh;
  } catch {
    // Trình duyệt chặn storage (chế độ riêng tư): vẫn cần một phiên để note không trộn nhóm.
    return newSessionId();
  }
}

/** Bắt đầu phiên đọc mới: ghi chú từ đây gom vào nhóm khác với phiên trước. */
export function startSession(key: string, storage?: Storage | null): string {
  const fresh = newSessionId();
  try {
    storage?.setItem(key, fresh);
  } catch {
    // Bỏ qua: phiên vẫn dùng được trong RAM của tab hiện tại.
  }
  return fresh;
}

/** Note có thuộc bài đang đọc không. */
export function belongsToPage(note: ReadingNote, ids: PageIds): boolean {
  if (ids.questionId) return note.questionId === ids.questionId;
  if (ids.moduleId) return note.moduleId === ids.moduleId;
  return false;
}

function timeOf(note: ReadingNote): number {
  const raw = note.updatedAt ?? note.createdAt ?? "";
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Gom note theo phiên đọc, phiên mới nhất lên đầu. */
export function groupBySession(notes: ReadingNote[]): SessionGroup[] {
  const groups = new Map<string, ReadingNote[]>();
  for (const note of notes) {
    const key = note.highlight?.sessionId ?? "";
    const bucket = groups.get(key);
    if (bucket) bucket.push(note);
    else groups.set(key, [note]);
  }
  return [...groups.entries()]
    .map(([sessionId, items]) => ({
      sessionId: sessionId === "" ? null : sessionId,
      notes: [...items].sort((a, b) => timeOf(b) - timeOf(a)),
      latest: items.reduce((max, note) => Math.max(max, timeOf(note)), 0),
    }))
    .sort((a, b) => b.latest - a.latest);
}

/**
 * Dựng chuỗi tìm kiếm từ text của các node: khoảng trắng gộp về một dấu cách và bảng ánh xạ
 * ngược về (node, offset) để tô sáng đúng đoạn dù HTML xuống dòng/thụt lề khác câu đã lưu.
 */
export function buildSearchIndex(slices: TextNodeSlice[]): { text: string; map: SearchAnchor[] } {
  const map: SearchAnchor[] = [];
  let text = "";
  let pendingSpace = false;
  for (let node = 0; node < slices.length; node += 1) {
    const raw = slices[node].text;
    for (let offset = 0; offset < raw.length; offset += 1) {
      const char = raw[offset];
      if (/\s/.test(char)) {
        pendingSpace = text.length > 0;
        continue;
      }
      if (pendingSpace) {
        text += " ";
        map.push({ node, offset });
        pendingSpace = false;
      }
      text += char;
      map.push({ node, offset });
    }
  }
  return { text, map };
}

/** Tìm đoạn trích trong chỉ mục đã dựng; trả về mốc đầu/cuối (offset cuối là inclusive). */
export function locateQuote(
  index: { text: string; map: SearchAnchor[] },
  quote: string,
): { start: SearchAnchor; end: SearchAnchor } | null {
  const needle = clampQuote(quote);
  if (!needle || index.text.length === 0) return null;
  let at = index.text.indexOf(needle);
  let length = needle.length;
  if (at < 0) {
    // Câu trích có thể bị cắt ở cuối hoặc người đọc bôi đen lệch: thử lại bằng đoạn đầu.
    const head = needle.slice(0, Math.min(60, needle.length));
    at = index.text.indexOf(head);
    length = head.length;
  }
  if (at < 0) return null;
  const start = index.map[at];
  const end = index.map[at + length - 1];
  if (!start || !end) return null;
  return { start, end };
}

/** Note thuộc phiên đang đọc hay phiên trước — dùng để tô đậm nhạt khác nhau. */
export function isCurrentSession(note: ReadingNote, sessionId: string | null): boolean {
  if (!sessionId) return true;
  return (note.highlight?.sessionId ?? "") === sessionId;
}

export function listReadingNotes(ids: PageIds, signal?: AbortSignal): Promise<ReadingNote[]> {
  return apiRequest<ReadingNote[]>("/notes", { signal }).then(all => all.filter(note => belongsToPage(note, ids)));
}

export function createReadingNote(
  input: {
    questionId?: string | null;
    moduleId?: string | null;
    noteType: ReadingNoteType;
    content: string;
    highlight: NoteHighlight | null;
    tags?: string[];
  },
): Promise<ReadingNote> {
  return apiRequest<ReadingNote>("/notes", { method: "POST", body: input });
}

export function updateReadingNote(
  id: string,
  input: { noteType: ReadingNoteType; content: string; highlight?: NoteHighlight | null },
): Promise<ReadingNote> {
  return apiRequest<ReadingNote>(`/notes/${id}`, { method: "PUT", body: input });
}

export function deleteReadingNote(id: string): Promise<void> {
  return apiRequest<void>(`/notes/${id}`, { method: "DELETE" });
}
