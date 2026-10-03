import { useEffect, useState } from "react";
import { CheckCircleIcon, FloppyDiskIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { Module, Difficulty } from "@/lib/types";
import { changeQuestionStatus, deleteQuestion, questionV2Enabled, saveOptions, saveQuestion, splitTags, type AdminOption, type AdminQuestion } from "@/lib/admin-content";
import { sanitizeAnswerHtml } from "@/lib/sanitize-html";
import { ContentEditor } from "./ContentEditor";
import { AdminField, adminError, DeleteConfirmation, PendingBackend, useAdminCopy, useDraftWarning } from "./shared";

type Draft = { moduleId: string; title: string; answerHtml: string; difficulty: Difficulty; tags: string; sortOrder: string };
const toDraft = (question: AdminQuestion | null, modules: Module[]): Draft => ({ moduleId: question?.moduleId ?? modules[0]?.id ?? "", title: question?.title ?? "", answerHtml: question?.answerHtml ?? "", difficulty: question?.difficulty ?? "JUNIOR", tags: question?.tags.join(", ") ?? "", sortOrder: question ? String(question.sortOrder) : "" });

export function QuestionEditor({ question, modules, onSaved, onDeleted, onDirty }: {
  question: AdminQuestion | null; modules: Module[]; onSaved: (question: AdminQuestion) => void; onDeleted: () => void; onDirty: (dirty: boolean) => void;
}) {
  const { c, locale } = useAdminCopy();
  const [draft, setDraft] = useState(() => toDraft(question, modules));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(question, modules)));
  const [options, setOptions] = useState<AdminOption[]>(question?.options ?? []);
  const [optionBaseline, setOptionBaseline] = useState(JSON.stringify(question?.options ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const dirty = JSON.stringify(draft) !== baseline || JSON.stringify(options) !== optionBaseline;
  useDraftWarning(dirty);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => { setDraft(previous => ({ ...previous, [key]: value })); setMessage(""); };
  async function save() {
    if (busy) return;
    setBusy(true); setError(null); setMessage("");
    try {
      if (!sanitizeAnswerHtml(draft.answerHtml).trim()) { setError(new Error("empty")); return; }
      const saved = await saveQuestion(question?.id ?? null, { moduleId: draft.moduleId, title: draft.title.trim(), answerHtml: draft.answerHtml, difficulty: draft.difficulty, tags: splitTags(draft.tags), ...(draft.sortOrder === "" ? {} : { sortOrder: Number(draft.sortOrder) }) });
      const next = toDraft(saved, modules); setDraft(next); setBaseline(JSON.stringify(next));
      if (!questionV2Enabled || JSON.stringify(options) === optionBaseline) setOptions(saved.options ?? []);
      setOptionBaseline(JSON.stringify(saved.options ?? []));
      setMessage(c("Đã lưu câu hỏi. Nội dung hiển thị là bản backend đã làm sạch.", "Question saved. You are viewing the backend-sanitized content.")); onSaved(saved);
    } catch (reason) { setError(reason); }
    finally { setBusy(false); }
  }
  async function storeOptions() {
    if (!question || busy || options.length < 2 || options.filter(option => option.isCorrect).length !== 1 || options.some(option => !option.content.trim())) return;
    setBusy(true); setError(null);
    try { const saved = await saveOptions(question.id, options.map((option, index) => ({ ...option, content: option.content.trim(), displayOrder: index + 1 }))); setOptions(saved); setOptionBaseline(JSON.stringify(saved)); setMessage(c("Đã lưu bộ lựa chọn.", "Answer choices saved.")); }
    catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  async function changeVisibility(status: "PUBLISHED" | "HIDDEN") {
    if (!question || busy || dirty || !statusReason.trim()) return;
    if (!window.confirm(status === "PUBLISHED" ? c("Xuất bản câu hỏi này cho người học?", "Publish this question for learners?") : c("Ẩn câu hỏi này? Lịch sử học được giữ lại.", "Hide this question? Learning history is preserved."))) return;
    setBusy(true); setError(null); setMessage("");
    try {
      const saved = await changeQuestionStatus(question.id, status, statusReason);
      // Status responses deliberately omit options; never discard the editor's choices.
      onSaved({ ...question, contentStatus: saved.contentStatus });
      setStatusReason(""); setMessage(c("Đã cập nhật trạng thái nội dung.", "Content visibility updated."));
    } catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  async function remove() {
    if (!question || busy) return;
    setBusy(true); setError(null);
    try { await deleteQuestion(question.id); onDirty(false); onDeleted(); }
    catch (reason) { setError(reason); setBusy(false); }
  }
  return <div className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">{question ? c("Biên tập câu hỏi", "Edit question") : c("Câu hỏi mới", "New question")}</h2><span className={`text-xs ${dirty ? "text-warning" : "text-subtle"}`}>{dirty ? c("Có thay đổi chưa lưu", "Unsaved changes") : c("Sẵn sàng biên tập", "Ready to edit")}</span></div>
    <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-5">
      <fieldset disabled={busy} className="!bg-transparent space-y-5">
        <AdminField label={c("Câu hỏi", "Question title")}><input required className="kg-field" value={draft.title} onChange={event => update("title", event.target.value)} /></AdminField>
        <div className="grid gap-4 sm:grid-cols-2"><AdminField label={c("Module", "Module")} hint={question && !questionV2Enabled ? c("API hiện tại chưa hỗ trợ chuyển module.", "The current API cannot move questions between modules.") : undefined}><select className="kg-field" required disabled={!!question && !questionV2Enabled} value={draft.moduleId} onChange={event => update("moduleId", event.target.value)}><option value="">{c("Chọn module", "Select a module")}</option>{modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></AdminField><AdminField label={c("Độ khó", "Difficulty")}><select className="kg-field" value={draft.difficulty} onChange={event => update("difficulty", event.target.value as Difficulty)}>{["JUNIOR", "MID", "SENIOR"].map(level => <option key={level}>{level}</option>)}</select></AdminField></div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]"><AdminField label={c("Tags", "Tags")} hint={c("Phân tách bằng dấu phẩy, ví dụ: java, collections.", "Separate with commas, for example: java, collections.")}><input className="kg-field" value={draft.tags} onChange={event => update("tags", event.target.value)} /></AdminField><AdminField label={c("Thứ tự", "Order")} hint={c("Câu mới: để trống để tự xếp.", "New question: leave blank for automatic order.")}><input type="number" min={0} step={1} disabled={!!question && !questionV2Enabled} className="kg-field" value={draft.sortOrder} onChange={event => update("sortOrder", event.target.value)} /></AdminField></div>
        <ContentEditor value={draft.answerHtml} onChange={value => update("answerHtml", value)} disabled={busy} />
        <p className="text-xs leading-relaxed text-subtle">{questionV2Enabled ? c("Lưu nội dung trước khi chỉnh bộ lựa chọn. Backend phải giữ lại các lựa chọn thủ công.", "Save content before editing answer choices. The backend must preserve manual choices.") : c("Backend hiện tự sinh lựa chọn trắc nghiệm khi tạo hoặc sửa đáp án.", "The current backend automatically generates quiz choices when creating or updating answers.")}</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3"><button className="kg-button" disabled={busy || !modules.length}><FloppyDiskIcon size={18} aria-hidden />{busy ? c("Đang lưu…", "Saving…") : c("Lưu câu hỏi", "Save question")}</button>{question && (!question.contentStatus || question.contentStatus === "PUBLISHED") && <a className="kg-secondary" href={`/questions/${question.id}`} target="_blank" rel="noreferrer">{c("Mở trang người học", "Open learner page")}</a>}</div>
    </form>
    {Boolean(error) && <p role="alert">{error instanceof Error && error.message === "empty" ? c("Cần nhập nội dung đáp án hợp lệ.", "Please enter a valid answer.") : adminError(error, locale === "en")}</p>}
    {message && <p role="status"><CheckCircleIcon size={18} className="mr-2 inline" aria-hidden />{message}</p>}
    {question && questionV2Enabled && <section className="space-y-4 border-t border-line pt-6" aria-label={c("Trạng thái xuất bản", "Publication status")}>
      <h3 className="text-lg">{c("Trạng thái xuất bản", "Publication status")}: {question.contentStatus ?? "PUBLISHED"}</h3>
      <p className="text-sm text-subtle">{c("Duyệt bản AI không tự xuất bản. Lưu mọi thay đổi trước khi xuất bản hoặc ẩn; ẩn không xóa lịch sử học.", "Approving an AI draft does not publish it. Save all edits before publishing or hiding; hiding preserves learning history.")}</p>
      <AdminField label={c("Lý do thay đổi trạng thái", "Reason for visibility change")}><textarea className="kg-field min-h-24" maxLength={500} disabled={busy} value={statusReason} onChange={event => setStatusReason(event.target.value)} /></AdminField>
      <div className="flex flex-wrap gap-2"><button type="button" className="kg-button" disabled={busy || dirty || !statusReason.trim() || question.contentStatus === "PUBLISHED"} onClick={() => void changeVisibility("PUBLISHED")}>{c("Xuất bản cho người học", "Publish to learners")}</button><button type="button" className="kg-secondary" disabled={busy || dirty || !statusReason.trim() || question.contentStatus === "HIDDEN"} onClick={() => void changeVisibility("HIDDEN")}>{c("Ẩn, giữ lịch sử", "Hide, preserve history")}</button></div>
    </section>}
    {question && <section className="space-y-4 border-t border-line pt-6">
      <h3 className="text-lg">{c("Lựa chọn trắc nghiệm", "Quiz answer choices")}</h3>
      {!questionV2Enabled && <PendingBackend>{c("Có thể xem các lựa chọn tự sinh. Lưu lựa chọn thủ công cần endpoint mới; API đọc hiện tại có thể chưa trả thông tin đáp án đúng.", "Generated choices can be reviewed. Manual editing requires the new endpoint; the current read API may not include the correct answer.")}</PendingBackend>}
      {options.map((option, index) => <div key={option.id ?? `new-${index}`} className="space-y-2 rounded-xl border border-line p-4">
        <div className="flex items-center justify-between gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name={`correct-${question.id}`} disabled={!questionV2Enabled || busy} checked={option.isCorrect === true} onChange={() => setOptions(previous => previous.map((item, number) => ({ ...item, isCorrect: number === index })))} />{c("Đáp án đúng", "Correct answer")} {index + 1}</label>{questionV2Enabled && <button type="button" className="kg-secondary !px-3" disabled={busy} aria-label={`${c("Xóa lựa chọn", "Remove choice")} ${index + 1}`} onClick={() => setOptions(previous => previous.filter((_, number) => number !== index))}><TrashIcon size={17} aria-hidden /></button>}</div>
        <textarea aria-label={`${c("Nội dung lựa chọn", "Choice content")} ${index + 1}`} className="kg-field min-h-24" readOnly={!questionV2Enabled} disabled={busy} value={option.content} onChange={event => setOptions(previous => previous.map((item, number) => number === index ? { ...item, content: event.target.value } : item))} />
      </div>)}
      {!options.length && <p className="text-sm text-subtle">{c("Chưa có lựa chọn. Câu hỏi chưa sẵn sàng cho quiz.", "No answer choices yet. This question is not ready for a quiz.")}</p>}
      {questionV2Enabled && <div className="flex flex-wrap gap-2"><button type="button" className="kg-secondary" disabled={busy} onClick={() => setOptions(previous => [...previous, { content: "", isCorrect: false, displayOrder: previous.length + 1 }])}><PlusIcon size={17} aria-hidden />{c("Thêm lựa chọn", "Add choice")}</button><button type="button" className="kg-button" disabled={busy || JSON.stringify(draft) !== baseline || options.length < 2 || options.filter(option => option.isCorrect).length !== 1 || options.some(option => !option.content.trim())} onClick={() => void storeOptions()}>{c("Lưu lựa chọn", "Save choices")}</button></div>}
    </section>}
    {question && <div className="border-t border-line pt-5"><button type="button" className="kg-secondary text-danger" disabled={busy} onClick={() => setDeleting(true)}><TrashIcon size={17} aria-hidden />{c("Xóa câu hỏi", "Delete question")}</button>{deleting && <DeleteConfirmation name={question.title} busy={busy} onDelete={() => void remove()} onCancel={() => setDeleting(false)} />}</div>}
  </div>;
}
