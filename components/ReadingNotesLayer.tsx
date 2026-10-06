"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocale } from "@/components/locale";
import {
  MAX_QUOTE,
  NOTE_TYPES,
  buildSearchIndex,
  clampQuote,
  createReadingNote,
  deleteReadingNote,
  groupBySession,
  isCurrentSession,
  listReadingNotes,
  locateQuote,
  readSession,
  sessionKeyFor,
  startSession,
  updateReadingNote,
  type NoteHighlight,
  type ReadingNote,
  type ReadingNoteType,
  type TextNodeSlice,
} from "@/lib/reading-notes";

const NOTE_TYPE_LABEL: Record<ReadingNoteType, string> = {
  HIGHLIGHT: "Đánh dấu",
  QUICK: "Ghi nhanh",
  STUDY: "Ghi chú học",
};

type Props = {
  /** id của phần tử chứa nội dung đang đọc (LearningContent render vào đó). */
  rootId: string;
  questionId?: string | null;
  moduleId?: string | null;
  /** Phân biệt phiên đọc của từng người trên cùng một máy. */
  userKey?: string;
};

type Picked = {
  quote: string;
  blockIndex: number | null;
  start: number | null;
  end: number | null;
  top: number;
  left: number;
};

function safeStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function currentPath(): string {
  try {
    return globalThis.location?.pathname ?? "/";
  } catch {
    return "/";
  }
}

/** Khối trực tiếp của root chứa node — dùng làm mốc "đoạn đang đọc". */
function blockFor(root: HTMLElement, node: Node): HTMLElement | null {
  let cursor: Node | null = node;
  while (cursor && cursor.parentNode !== root) cursor = cursor.parentNode;
  return cursor instanceof HTMLElement ? cursor : null;
}

function offsetInBlock(block: HTMLElement | null, range: Range): number | null {
  if (!block) return null;
  try {
    const probe = document.createRange();
    probe.setStart(block, 0);
    probe.setEnd(range.startContainer, range.startOffset);
    return probe.toString().length;
  } catch {
    return null;
  }
}

function textSlices(root: HTMLElement): { nodes: Text[]; slices: TextNodeSlice[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("mark[data-kg-note], script, style")) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  const slices: TextNodeSlice[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    nodes.push(node);
    slices.push({ text: node.nodeValue ?? "" });
  }
  return { nodes, slices };
}

function rangeForQuote(root: HTMLElement, quote: string): Range | null {
  const { nodes, slices } = textSlices(root);
  const found = locateQuote(buildSearchIndex(slices), quote);
  if (!found) return null;
  const startNode = nodes[found.start.node];
  const endNode = nodes[found.end.node];
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, found.start.offset);
  range.setEnd(endNode, found.end.offset + 1);
  return range;
}

/** Tô sáng các đoạn đã ghi chú; trả về số đoạn tô được. */
function paintNotes(root: HTMLElement, notes: ReadingNote[], sessionId: string): number {
  let painted = 0;
  for (const note of notes) {
    const quote = note.highlight?.quote;
    if (!quote) continue;
    if (root.querySelector(`mark[data-kg-note="${note.id}"]`)) continue;
    const range = rangeForQuote(root, quote);
    if (!range) continue;
    const mark = document.createElement("mark");
    mark.className = "kg-note-mark";
    mark.dataset.kgNote = note.id;
    mark.dataset.current = isCurrentSession(note, sessionId) ? "true" : "false";
    mark.title = note.content ?? quote;
    try {
      range.surroundContents(mark);
      painted += 1;
    } catch {
      // Đoạn trích vắt qua nhiều khối (bảng, danh sách): giữ ghi chú ở bảng bên cạnh, không tô.
    }
  }
  return painted;
}

function unpaint(root: HTMLElement | null, id: string): void {
  const mark = root?.querySelector(`mark[data-kg-note="${id}"]`);
  const parent = mark?.parentNode;
  if (!mark || !parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  mark.remove();
}

export function ReadingNotesLayer({ rootId, questionId = null, moduleId = null, userKey = "" }: Props) {
  const { t } = useLocale();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const paintingRef = useRef(false);
  const notesRef = useRef<ReadingNote[]>([]);
  const sessionRef = useRef("");
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  const [sessionKey, setSessionKey] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [draft, setDraft] = useState("");
  const [noteType, setNoteType] = useState<ReadingNoteType>("HIGHLIGHT");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  notesRef.current = notes;
  sessionRef.current = sessionId;

  useEffect(() => {
    setSessionKey(sessionKeyFor(userKey, currentPath()));
  }, [userKey]);

  useEffect(() => {
    if (!sessionKey) return;
    setSessionId(previous => previous || readSession(sessionKey, safeStorage()));
  }, [sessionKey]);

  const load = useCallback(async () => {
    try {
      setNotes(await listReadingNotes({ questionId, moduleId }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không tải được ghi chú"));
    }
  }, [questionId, moduleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const captureSelection = useCallback(() => {
    const root = document.getElementById(rootId);
    const host = hostRef.current;
    const selection = globalThis.getSelection?.();
    if (!root || !host || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      setPicked(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setPicked(null);
      return;
    }
    const quote = clampQuote(selection.toString(), MAX_QUOTE);
    if (quote.length < 3) {
      setPicked(null);
      return;
    }
    const block = blockFor(root, range.startContainer);
    const rect = range.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const start = offsetInBlock(block, range);
    setPicked({
      quote,
      blockIndex: block ? [...root.children].indexOf(block) : null,
      start,
      end: start === null ? null : start + quote.length,
      top: rect.bottom - hostRect.top + 8,
      left: Math.min(Math.max(rect.left - hostRect.left, 0), Math.max(hostRect.width - 220, 0)),
    });
  }, [rootId]);

  useEffect(() => {
    const onRelease = () => globalThis.setTimeout(captureSelection, 0);
    document.addEventListener("pointerup", onRelease);
    document.addEventListener("touchend", onRelease);
    document.addEventListener("keyup", onRelease);
    return () => {
      document.removeEventListener("pointerup", onRelease);
      document.removeEventListener("touchend", onRelease);
      document.removeEventListener("keyup", onRelease);
    };
  }, [captureSelection]);

  // Tô sáng lại khi có note mới hoặc khi nội dung bài vừa render xong.
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    paintingRef.current = true;
    paintNotes(root, notes, sessionId);
    const handle = globalThis.setTimeout(() => {
      paintingRef.current = false;
    }, 0);
    return () => globalThis.clearTimeout(handle);
  }, [notes, sessionId, rootId]);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    let queued: ReturnType<typeof globalThis.setTimeout> | undefined;
    const observer = new MutationObserver(records => {
      if (paintingRef.current) return;
      // Bỏ qua thay đổi do chính việc tô sáng tạo ra (chỉ thêm/thay <mark> của layer).
      const causedByPainting = records.every(record =>
        [...record.addedNodes].every(node => node instanceof HTMLElement && node.matches("mark[data-kg-note]")),
      );
      if (causedByPainting) return;
      globalThis.clearTimeout(queued);
      queued = globalThis.setTimeout(() => paintNotes(root, notesRef.current, sessionRef.current), 150);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      globalThis.clearTimeout(queued);
      observer.disconnect();
    };
  }, [rootId]);

  // Bấm vào đoạn đã tô sáng => mở đúng ghi chú đó trong bảng.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const mark = target?.closest?.("mark[data-kg-note]");
      if (!(mark instanceof HTMLElement)) return;
      setPanelOpen(true);
      setActiveId(mark.dataset.kgNote ?? null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const mark = document.getElementById(rootId)?.querySelector(`mark[data-kg-note="${activeId}"]`);
    (mark as HTMLElement | null)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeId, rootId]);

  const groups = useMemo(() => groupBySession(notes), [notes]);
  const editing = useMemo(() => notes.find(note => note.id === editingId) ?? null, [notes, editingId]);

  const resetComposer = () => {
    setDraft("");
    setPicked(null);
    setEditingId(null);
    setComposerOpen(false);
    setConfirmId(null);
  };

  const beginForSelection = () => {
    if (!picked) return;
    setEditingId(null);
    setNoteType("HIGHLIGHT");
    setDraft("");
    setComposerOpen(true);
    setPanelOpen(true);
  };

  const beginEdit = (note: ReadingNote) => {
    setEditingId(note.id);
    setPicked(null);
    setDraft(note.content ?? "");
    setNoteType((NOTE_TYPES.includes(note.noteType as ReadingNoteType) ? note.noteType : "QUICK") as ReadingNoteType);
    setComposerOpen(true);
    setPanelOpen(true);
  };

  const save = async () => {
    const content = draft.trim() || picked?.quote || "";
    if (!content) return;
    const highlight: NoteHighlight | null = picked
      ? {
          quote: picked.quote,
          start: picked.start,
          end: picked.end,
          blockIndex: picked.blockIndex,
          sessionId: sessionId || null,
          path: currentPath(),
        }
      : null;
    setBusy(true);
    try {
      if (editingId) {
        const updated = await updateReadingNote(editingId, {
          noteType,
          content,
          ...(highlight ? { highlight } : {}),
        });
        setNotes(previous => previous.map(note => (note.id === updated.id ? updated : note)));
      } else {
        const created = await createReadingNote({ questionId, moduleId, noteType, content, highlight });
        setNotes(previous => [created, ...previous]);
      }
      setError("");
      resetComposer();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không lưu được ghi chú"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteReadingNote(id);
      unpaint(document.getElementById(rootId), id);
      setNotes(previous => previous.filter(note => note.id !== id));
      setError("");
      setConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không xoá được ghi chú"));
    } finally {
      setBusy(false);
    }
  };

  const beginNewSession = () => {
    if (!sessionKey) return;
    setSessionId(startSession(sessionKey, safeStorage()));
    resetComposer();
  };

  return (
    <div ref={hostRef} className="relative mt-8">
      {picked ? (
        <div className="kg-note-pick" style={{ top: picked.top, left: picked.left }}>
          <button type="button" className="kg-note-pick-btn" onClick={beginForSelection}>
            {t("Ghi chú đoạn này")}
          </button>
          <button type="button" className="kg-note-pick-close" aria-label={t("Bỏ chọn")} onClick={() => setPicked(null)}>
            ✕
          </button>
        </div>
      ) : null}

      <section className="kg-note-panel" aria-label={t("Ghi chú trong bài đang đọc")}>
        <header className="kg-note-panel-head">
          <h2 className="text-sm font-semibold text-strong">
            {t("Ghi chú của bạn")} <span className="text-subtle">({notes.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="kg-note-mini" onClick={beginNewSession} disabled={!sessionKey}>
              {t("Phiên đọc mới")}
            </button>
            <button type="button" className="kg-note-mini" onClick={() => setPanelOpen(value => !value)}>
              {panelOpen ? t("Thu gọn") : t("Mở rộng")}
            </button>
          </div>
        </header>

        {error ? (
          <p className="mt-3 text-xs text-warning" role="alert">
            {t(error)}
          </p>
        ) : null}

        {panelOpen ? (
          <>
            {composerOpen ? (
              <div className="kg-note-composer">
                {picked?.quote ?? editing?.highlight?.quote ? (
                  <blockquote className="kg-note-quote">{picked?.quote ?? editing?.highlight?.quote}</blockquote>
                ) : null}
                <textarea
                  className="kg-field mt-2 min-h-24"
                  value={draft}
                  maxLength={2000}
                  placeholder={t("Điều bạn muốn nhớ về đoạn này…")}
                  onChange={event => setDraft(event.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="text-xs text-subtle">
                    {t("Loại ghi chú")}
                    <select
                      className="kg-field mt-1 block w-40"
                      value={noteType}
                      onChange={event => setNoteType(event.target.value as ReadingNoteType)}
                    >
                      {NOTE_TYPES.map(type => (
                        <option key={type} value={type}>
                          {t(NOTE_TYPE_LABEL[type])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" className="kg-button" onClick={() => void save()} disabled={busy || (!draft.trim() && !picked)}>
                      {busy ? t("Đang lưu…") : t("Lưu ghi chú")}
                    </button>
                    <button type="button" className="kg-secondary" onClick={resetComposer} disabled={busy}>
                      {t("Huỷ")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="kg-note-hint">
                {t("Bôi đen một đoạn trong bài rồi bấm “Ghi chú đoạn này” — ghi chú sẽ neo đúng vào đoạn đó và gom theo phiên đọc của bạn.")}
              </p>
            )}

            {groups.length === 0 ? (
              <p className="kg-note-empty">{t("Chưa có ghi chú nào cho bài này.")}</p>
            ) : (
              groups.map(group => {
                const current = Boolean(sessionId) && group.sessionId === sessionId;
                return (
                  <div key={group.sessionId ?? "legacy"} className="mt-4">
                    <p className="kg-note-group">
                      {current ? t("Phiên đọc này") : group.sessionId ? t("Phiên trước") : t("Ghi chú cũ")}
                      <span className="text-subtle"> · {group.notes.length}</span>
                      {group.latest ? <span className="text-subtle"> · {new Date(group.latest).toLocaleString()}</span> : null}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {group.notes.map(note => (
                        <li key={note.id} className={activeId === note.id ? "kg-note-item kg-note-item-active" : "kg-note-item"}>
                          {note.highlight?.quote ? (
                            <button type="button" className="kg-note-quote-link" onClick={() => setActiveId(note.id)}>
                              “{note.highlight.quote}”
                            </button>
                          ) : null}
                          <p className="mt-1 whitespace-pre-wrap text-sm text-body">{note.content}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" className="kg-note-mini" onClick={() => beginEdit(note)}>
                              {t("Sửa")}
                            </button>
                            <button type="button" className="kg-note-mini" onClick={() => setConfirmId(confirmId === note.id ? null : note.id)}>
                              {t("Xoá")}
                            </button>
                            {confirmId === note.id ? (
                              <button type="button" className="kg-note-mini kg-note-mini-danger" onClick={() => void remove(note.id)} disabled={busy}>
                                {t("Xác nhận xoá")}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
