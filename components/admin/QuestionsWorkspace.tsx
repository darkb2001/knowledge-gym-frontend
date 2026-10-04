import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { adminQuestion, adminQuestions, isUuid, type AdminQuestion, type ContentStatus } from "@/lib/admin-content";
import type { Module, QuestionSummary } from "@/lib/types";
import { Pagination } from "../Pagination";
import { QuestionEditor } from "./QuestionEditor";
import { adminError, useAdminCopy } from "./shared";

export function QuestionsWorkspace({ modules, dirty, onDirty }: { modules: Module[]; dirty: boolean; onDirty: (value: boolean) => void }) {
  const { c, locale } = useAdminCopy();
  const [items, setItems] = useState<(QuestionSummary & { contentStatus?: ContentStatus })[]>([]);
  const [selected, setSelected] = useState<AdminQuestion | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  const selection = useRef<AbortController | null>(null);
  const editor = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!opening && editorKey > 0 && window.matchMedia("(max-width: 1279px)").matches) {
      editor.current?.focus({ preventScroll: true });
      editor.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [editorKey, opening]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("questionId");
    if (!id || !isUuid(id)) return;
    const controller = new AbortController(); selection.current = controller; setOpening(true);
    adminQuestion(id, controller.signal).then(question => {
      if (!controller.signal.aborted) { setSelected(question); setEditorKey(value => value + 1); onDirty(false); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason); })
      .finally(() => { if (!controller.signal.aborted) setOpening(false); });
    return () => controller.abort();
  }, [onDirty]);
  useEffect(() => () => selection.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    const params = new URLSearchParams({ page: String(page), size: "10" });
    if (moduleId) params.set("moduleId", moduleId);
    if (difficulty) params.set("difficulty", difficulty);
    if (search) params.set("q", search);
    adminQuestions(params, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (data.totalPages > 0 && page > data.totalPages) { setPage(data.totalPages); return; }
      setItems(data.items); setPages(data.totalPages); setTotal(data.totalElements);
    }).catch(reason => { if (!controller.signal.aborted) { setError(reason); setItems([]); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, moduleId, difficulty, search, tick]);
  const discard = () => !dirty || window.confirm(c("Bỏ các thay đổi chưa lưu để mở nội dung khác?", "Discard unsaved changes and open other content?"));
  async function choose(id: string) {
    if (!discard()) return;
    selection.current?.abort(); const controller = new AbortController(); selection.current = controller;
    setOpening(true); setError(null);
    try { const question = await adminQuestion(id, controller.signal); if (!controller.signal.aborted) { setSelected(question); setEditorKey(value => value + 1); onDirty(false); } }
    catch (reason) { if (!controller.signal.aborted) setError(reason); }
    finally { if (!controller.signal.aborted) setOpening(false); }
  }
  function create() { if (!discard()) return; selection.current?.abort(); setOpening(false); setSelected(null); setEditorKey(value => value + 1); onDirty(false); }
  return <div className="kg-page">
    <div className="grid min-w-0 gap-7 2xl:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
    <section className="min-w-0" aria-label={c("Danh sách câu hỏi quản trị", "Admin question list")}>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg">{c("Thư viện", "Library")} <span className="text-sm font-normal tabular-nums text-subtle">({total})</span></h2><button type="button" onClick={create} className="kg-button !px-3"><PlusIcon size={18} aria-hidden />{c("Tạo mới", "New")}</button></div>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}>
        <label className="block"><span className="sr-only">{c("Tìm câu hỏi", "Search questions")}</span><input className="kg-field" value={query} onChange={event => setQuery(event.target.value)} placeholder={c("Tìm theo nội dung…", "Search content…")} /></label>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><label className="block text-xs text-subtle">{c("Module", "Module")}<select className="kg-field mt-1" value={moduleId} onChange={event => { setModuleId(event.target.value); setPage(1); }}><option value="">{c("Tất cả module", "All modules")}</option>{modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label><label className="block text-xs text-subtle">{c("Độ khó", "Difficulty")}<select className="kg-field mt-1" value={difficulty} onChange={event => { setDifficulty(event.target.value); setPage(1); }}><option value="">{c("Tất cả độ khó", "All levels")}</option>{["JUNIOR", "MID", "SENIOR"].map(level => <option key={level}>{level}</option>)}</select></label></div>
        <button type="submit" className="kg-secondary w-full"><MagnifyingGlassIcon size={18} aria-hidden />{c("Tìm câu hỏi", "Search questions")}</button>
      </form>
      {Boolean(error) && <p role="alert" className="mt-4">{adminError(error, locale === "en")} <button type="button" className="underline" onClick={() => setTick(value => value + 1)}>{c("Thử lại", "Retry")}</button></p>}
      {loading ? <div aria-busy="true" aria-label={c("Đang tải thư viện", "Loading library")} className="mt-5 space-y-3">{[0, 1, 2].map(index => <div key={index} className="h-24 rounded-lg bg-muted" />)}</div> : !items.length ? <p className="py-8 text-sm leading-relaxed text-subtle">{c("Chưa có câu hỏi khớp bộ lọc. Tạo câu mới hoặc đổi bộ lọc.", "No matching questions. Create a question or adjust your filters.")}</p> : <ul className="mt-5 space-y-1">{items.map(item => <li key={item.id}><button type="button" disabled={opening} aria-pressed={selected?.id === item.id} onClick={() => void choose(item.id)} className={`w-full rounded-xl p-4 text-left transition-colors disabled:opacity-50 ${selected?.id === item.id ? "bg-sage" : "hover:bg-muted"}`}><span className="mb-2 block text-xs text-subtle">{item.difficulty} / {item.moduleSlug}{item.contentStatus && ` · ${item.contentStatus}`}</span><span className="block break-words text-sm font-medium leading-relaxed text-strong">{item.title}</span></button></li>)}</ul>}
    </section>
    <section ref={editor} tabIndex={-1} className="kg-panel min-w-0 scroll-mt-24" aria-label={c("Vùng biên tập câu hỏi", "Question editor")}>
      {opening ? <p role="status">{c("Đang mở câu hỏi…", "Opening question…")}</p> : <QuestionEditor key={editorKey} question={selected} modules={modules} onDirty={onDirty} onSaved={question => { setSelected(question); setTick(value => value + 1); }} onDeleted={() => { setSelected(null); setEditorKey(value => value + 1); setTick(value => value + 1); }} />}
    </section>
    </div>
    <Pagination page={page} totalPages={pages} onChange={setPage} disabled={loading} />
  </div>;
}
