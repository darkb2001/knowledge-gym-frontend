"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookmarkSimpleIcon,
  CheckCircleIcon,
  FloppyDiskIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import { apiRequest, ensureAccessToken, getAccessToken, getApiBase } from "@/lib/api-client";
import { renderSafeMarkdown } from "@/lib/markdown";
import { LearningContent } from "@/components/LearningContent";
import { PageHeading, RequireAuth, inputClass } from "@/components/ui";
import { getQuestion, listQuestions } from "@/lib/questions";
import type { QuestionSummary } from "@/lib/types";

type Note = {
  id: string;
  questionId: string | null;
  moduleId: string | null;
  noteType: string;
  content: string | null;
  tags: string[];
};
type Hit = { type: string; id: string; title: string; excerpt: string };
type Draft = { id?: string; noteType: string; content: string; questionId: string; tags: string };

const EMPTY: Draft = { noteType: "QUICK", content: "", questionId: "", tags: "" };
const NOTE_TYPES = ["QUICK", "STUDY", "HIGHLIGHT"] as const;

function Notes() {
  const { t } = useLocale();
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Note[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [findQuery, setFindQuery] = useState("");
  const [findHits, setFindHits] = useState<QuestionSummary[]>([]);
  const [findBusy, setFindBusy] = useState(false);
  const [questionTitle, setQuestionTitle] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [titles, setTitles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [all, marks] = await Promise.all([
        apiRequest<Note[]>("/notes"),
        apiRequest<Note[]>("/users/me/bookmarks"),
      ]);
      setNotes(all);
      setBookmarks(marks);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không tải được ghi chú"));
    } finally {
      setLoaded(true);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Xem trước Markdown chỉ render khi người dùng mở (đỡ tốn CPU trên điện thoại).
  useEffect(() => {
    if (!showPreview) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void renderSafeMarkdown(draft.content).then(html => {
        if (!cancelled) setPreviewHtml(html);
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft.content, showPreview]);

  // Tìm câu hỏi để liên kết — thay cho việc bắt người dùng dán UUID.
  useEffect(() => {
    const keyword = findQuery.trim();
    if (keyword.length < 2) {
      setFindHits([]);
      return;
    }
    let cancelled = false;
    setFindBusy(true);
    const timer = setTimeout(() => {
      listQuestions({ q: keyword, size: 8 })
        .then(page => {
          if (!cancelled) setFindHits(page.items);
        })
        .catch(() => {
          if (!cancelled) setFindHits([]);
        })
        .finally(() => {
          if (!cancelled) setFindBusy(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [findQuery]);

  // Lấy tiêu đề câu hỏi đã liên kết để hiện tên thật thay vì id cắt ngắn.
  useEffect(() => {
    const ids = Array.from(new Set(notes.map(note => note.questionId).filter((v): v is string => Boolean(v)))).slice(0, 12);
    const missing = ids.filter(id => !titles[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(id =>
        getQuestion(id)
          .then(question => [id, question.title] as const)
          .catch(() => [id, ""] as const),
      ),
    ).then(pairs => {
      if (cancelled) return;
      setTitles(prev => {
        const next = { ...prev };
        pairs.forEach(([id, title]) => {
          if (title) next[id] = title;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [notes, titles]);

  const linkedTitle = useMemo(() => questionTitle || t("Câu hỏi đã liên kết"), [questionTitle, t]);

  async function loadQuestionTitle(id: string) {
    try {
      const detail = await getQuestion(id);
      setQuestionTitle(detail.title);
    } catch {
      setQuestionTitle("");
    }
  }

  async function save() {
    if (!draft.content.trim()) {
      setError(t("Ghi chú cần có nội dung."));
      return;
    }
    setBusy(true);
    try {
      const body = {
        noteType: draft.noteType,
        content: draft.content,
        tags: draft.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
        questionId: draft.questionId.trim() || null,
      };
      if (draft.id) {
        await apiRequest(`/notes/${draft.id}`, { method: "PUT", body });
        setToast(t("Đã cập nhật ghi chú."));
      } else {
        await apiRequest("/notes", { method: "POST", body });
        setToast(t("Đã lưu ghi chú."));
      }
      setDraft(EMPTY);
      setQuestionTitle("");
      setComposerOpen(false);
      setError("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không lưu được ghi chú"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiRequest(`/notes/${id}`, { method: "DELETE" });
      if (draft.id === id) {
        setDraft(EMPTY);
        setComposerOpen(false);
      }
      setConfirmId("");
      setToast(t("Đã xóa ghi chú."));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không xóa được ghi chú"));
    }
  }

  async function convert(id: string) {
    try {
      await apiRequest<{ cardId: string }>(`/notes/${id}/convert`, { method: "POST" });
      setError("");
      setToast(t("Đã tạo flashcard từ ghi chú này."));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không chuyển thành flashcard được"));
    }
  }

  async function search(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setHits([]);
      return;
    }
    try {
      setHits(await apiRequest<Hit[]>(`/search?q=${encodeURIComponent(value)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Tìm kiếm thất bại"));
    }
  }

  async function exportMarkdown() {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await ensureAccessToken())) return;
      const response = await fetch(`${getApiBase()}/notes/export?format=md`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: "include",
      });
      if (!response.ok) {
        setError(t("Không xuất được ghi chú"));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "notes.md";
      link.click();
      URL.revokeObjectURL(url);
      setToast(t("Đã tải ghi chú dưới dạng Markdown."));
    } finally {
      setBusy(false);
    }
  }

  function edit(note: Note) {
    setDraft({
      id: note.id,
      noteType: note.noteType,
      content: note.content ?? "",
      questionId: note.questionId ?? "",
      tags: (note.tags ?? []).join(", "),
    });
    setQuestionTitle("");
    if (note.questionId) void loadQuestionTitle(note.questionId);
    setComposerOpen(true);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={t("Ghi chú")}
        description={t("Lưu lại điều bạn muốn nhớ, gắn thẻ và liên kết tới câu hỏi trong thư viện.")}
        action={
          <button
            type="button"
            onClick={() => void exportMarkdown()}
            disabled={busy}
            className="kg-secondary min-h-10 px-4 text-sm disabled:opacity-60"
          >
            {busy ? t("Đang xuất…") : t("Xuất Markdown")}
          </button>
        }
      />

      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-strong">
          <MagnifyingGlassIcon size={16} aria-hidden />
          {t("Tìm câu hỏi và ghi chú")}
        </span>
        <input
          className={inputClass}
          type="search"
          value={query}
          onChange={e => void search(e.target.value)}
          placeholder={t("Nhập từ khóa…")}
        />
      </label>

      {hits.length > 0 && (
        <section aria-label={t("Kết quả tìm kiếm")} className="space-y-3 rounded-2xl border border-line/80 bg-surface p-4">
          <h2 className="font-display text-lg text-strong">{t("Kết quả")}</h2>
          <ul className="space-y-3">
            {hits.map(hit => {
              const isQuestion = hit.type.toUpperCase() === "QUESTION";
              const body = (
                <>
                  <span className="mr-2 rounded-full bg-sage px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-positive">
                    {isQuestion ? t("Câu hỏi") : t("Ghi chú")}
                  </span>
                  <span className="text-sm font-medium text-strong">{hit.title}</span>
                  <p className="mt-1 text-sm text-subtle">{hit.excerpt}</p>
                </>
              );
              return (
                <li key={`${hit.type}-${hit.id}`} className="border-b border-line/70 pb-3 last:border-0 last:pb-0">
                  {isQuestion ? (
                    <Link href={`/questions/${hit.id}`} className="block rounded-xl px-2 py-1 transition-colors hover:bg-sage/40">
                      {body}
                    </Link>
                  ) : (
                    <div className="px-2 py-1">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-strong">{t("Ghi chú của bạn")}</h2>
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY);
            setQuestionTitle("");
            setComposerOpen(open => !open);
          }}
          className="kg-button inline-flex min-h-10 items-center gap-2 px-4 text-sm"
        >
          <NotePencilIcon size={17} weight="bold" aria-hidden />
          {composerOpen ? t("Đóng") : t("Ghi chú mới")}
        </button>
      </div>

      {composerOpen && (
        <section className="kg-panel space-y-5">
          <h3 className="font-display text-lg text-strong">{draft.id ? t("Sửa ghi chú") : t("Ghi chú mới")}</h3>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-strong">{t("Loại ghi chú")}</span>
            <div className="flex flex-wrap gap-2">
              {NOTE_TYPES.map(type => {
                const active = draft.noteType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDraft(current => ({ ...current, noteType: type }))}
                    className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-colors ${
                      active ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-strong hover:border-accent/60"
                    }`}
                  >
                    {t(type)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-strong">{t("Liên kết câu hỏi (tùy chọn)")}</span>
            {draft.questionId ? (
              <p className="flex flex-wrap items-center gap-2 rounded-xl border border-line/80 bg-muted/40 px-3 py-2 text-sm text-body">
                <span className="min-w-0 flex-1 truncate">{linkedTitle}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(current => ({ ...current, questionId: "" }));
                    setQuestionTitle("");
                    setFindQuery("");
                  }}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-3 text-xs text-strong"
                >
                  <XIcon size={13} aria-hidden />
                  {t("Bỏ liên kết")}
                </button>
              </p>
            ) : (
              <>
                <input
                  className={inputClass}
                  type="search"
                  value={findQuery}
                  onChange={e => setFindQuery(e.target.value)}
                  placeholder={t("Tìm câu hỏi theo tiêu đề…")}
                />
                {findBusy && <p className="text-xs text-subtle">{t("Đang tìm…")}</p>}
                {findHits.length > 0 && (
                  <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line/80 bg-surface p-1">
                    {findHits.map(question => (
                      <li key={question.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(current => ({ ...current, questionId: question.id }));
                            setQuestionTitle(question.title);
                            setFindQuery("");
                            setFindHits([]);
                          }}
                          className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-body transition-colors hover:bg-muted"
                        >
                          <span className="min-w-0 flex-1 truncate">{question.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!findBusy && findQuery.trim().length >= 2 && findHits.length === 0 && (
                  <p className="text-xs text-subtle">{t("Không tìm thấy câu hỏi phù hợp.")}</p>
                )}
              </>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-strong">{t("Thẻ (phẩy tách)")}</span>
            <input
              className={inputClass}
              value={draft.tags}
              onChange={e => setDraft(current => ({ ...current, tags: e.target.value }))}
              placeholder={t("java, jvm")}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-strong">{t("Nội dung ghi chú")}</span>
            <textarea
              className="kg-field min-h-40 resize-y font-mono text-sm leading-relaxed"
              value={draft.content}
              onChange={e => setDraft(current => ({ ...current, content: e.target.value }))}
              placeholder={t("Viết ghi chú Markdown…")}
            />
            <span className="mt-1.5 block text-xs text-subtle">
              {t("Hỗ trợ Markdown: **đậm**, `code`, danh sách, tiêu đề.")}
            </span>
          </label>

          <div className="space-y-2">
            <button
              type="button"
              aria-expanded={showPreview}
              onClick={() => setShowPreview(value => !value)}
              className="min-h-10 text-sm font-medium text-accent underline"
            >
              {showPreview ? t("Ẩn xem trước") : t("Xem trước")}
            </button>
            {showPreview &&
              (previewHtml ? (
                <LearningContent html={previewHtml} className="min-h-24 rounded-xl border border-line/80 bg-surface/80 p-4" />
              ) : (
                <p className="text-sm text-subtle">{t("Chưa có nội dung")}</p>
              ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="kg-button inline-flex min-h-11 items-center justify-center gap-2 disabled:opacity-50"
            >
              <FloppyDiskIcon size={17} weight="bold" aria-hidden />
              {busy ? t("Đang lưu…") : draft.id ? t("Cập nhật") : t("Lưu ghi chú")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY);
                setQuestionTitle("");
                setComposerOpen(false);
              }}
              className="kg-secondary inline-flex min-h-11 items-center justify-center px-4"
            >
              {t("Hủy")}
            </button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {t(error)}
        </p>
      )}

      {bookmarks.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl text-strong">
            <BookmarkSimpleIcon size={20} aria-hidden />
            {t("Bookmarks")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {bookmarks.map(note => (
              <li key={note.id} className="rounded-xl border border-line/80 bg-surface p-4 text-sm text-body">
                <span className="text-xs font-medium text-accent">{t(note.noteType)}</span>
                <p className="mt-1 whitespace-pre-wrap break-words">{note.content}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {!loaded ? (
          <div className="space-y-3" aria-busy>
            {[0, 1, 2].map(index => (
              <div key={index} className="h-24 animate-pulse rounded-2xl border border-line/60 bg-surface" />
            ))}
            <p role="status" className="text-sm text-subtle">{t("Đang tải ghi chú…")}</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center">
            <NotePencilIcon size={28} className="mx-auto text-subtle" aria-hidden />
            <p className="mt-3 text-sm text-subtle">{t("Chưa có ghi chú nào.")}</p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="kg-button mt-4 inline-flex min-h-10 items-center px-4 text-sm"
            >
              {t("Viết ghi chú đầu tiên")}
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map(note => (
              <li key={note.id} className="space-y-3 rounded-2xl border border-line/80 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sage px-2.5 py-1 text-xs font-medium text-positive">
                    {t(note.noteType)}
                  </span>
                  {note.tags?.map(tag => (
                    <span key={tag} className="rounded-full border border-line px-2.5 py-1 text-xs text-subtle">
                      #{tag}
                    </span>
                  ))}
                </div>

                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-strong">{note.content}</p>

                {note.questionId && (
                  <p className="text-xs text-subtle">
                    {t("Liên kết câu hỏi:")}{" "}
                    <Link
                      href={`/questions/${note.questionId}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {titles[note.questionId] ?? `${note.questionId.slice(0, 8)}…`}
                    </Link>
                  </p>
                )}

                {confirmId === note.id ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
                    <span className="text-sm text-warning">{t("Xóa ghi chú này?")}</span>
                    <button
                      type="button"
                      onClick={() => void remove(note.id)}
                      className="inline-flex min-h-10 items-center rounded-full bg-warning px-4 text-sm text-on-accent"
                    >
                      {t("Xóa")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId("")}
                      className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm text-strong"
                    >
                      {t("Hủy")}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => edit(note)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-strong transition-colors hover:border-accent/60"
                    >
                      <NotePencilIcon size={15} aria-hidden />
                      {t("Sửa")}
                    </button>
                    {note.questionId && (
                      <button
                        type="button"
                        onClick={() => void convert(note.id)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-strong transition-colors hover:border-accent/60"
                      >
                        <CheckCircleIcon size={15} aria-hidden />
                        {t("Tạo flashcard")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmId(note.id)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-warning transition-colors hover:border-warning/60"
                    >
                      <TrashIcon size={15} aria-hidden />
                      {t("Xóa")}
                    </button>
                  </div>
                )}

                <p className="text-xs text-subtle">
                  {t("Loại ghi chú")}: {t(note.noteType)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-4 z-20 rounded-xl bg-strong px-4 py-3 text-center text-sm text-on-accent shadow-lg sm:left-auto sm:right-6 sm:w-80"
        >
          {toast}
        </p>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <RequireAuth>
      <Notes />
    </RequireAuth>
  );
}
