import { useEffect, useState } from "react";
import { FloppyDiskIcon } from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api-client";
import { createPost, isUuid, splitTags, type AdminPost } from "@/lib/admin-content";
import type { Module } from "@/lib/types";
import { moderatePost, type PostAction } from "@/lib/admin-platform";
import { sanitizeAnswerHtml } from "@/lib/sanitize-html";
import { ContentEditor } from "./ContentEditor";
import { AdminField, adminError, useAdminCopy, useDraftWarning } from "./shared";

const fromPost = (post: AdminPost | null) => ({ title: post?.title ?? "", body: post?.body ?? "", excerpt: post?.excerpt ?? "", tags: post?.tags?.join(", ") ?? "", moduleId: post?.moduleId ?? "", questionId: post?.questionId ?? "" });
export function PostEditor({ post, modules, onSaved, onDirty }: { post: AdminPost | null; modules: Module[]; onSaved: () => void; onDirty: (value: boolean) => void }) {
  const { c, locale } = useAdminCopy();
  const [id, setId] = useState(post?.id ?? null);
  const [status, setStatus] = useState(post?.status ?? "NEW");
  const [draft, setDraft] = useState(() => fromPost(post));
  const [baseline, setBaseline] = useState(() => JSON.stringify(fromPost(post)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const dirty = JSON.stringify(draft) !== baseline;
  useDraftWarning(dirty);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  async function save() {
    if (busy || !["NEW", "DRAFT", "REVIEW"].includes(status)) return;
    if (!sanitizeAnswerHtml(draft.body).trim()) { setMessage(""); setError(new Error("empty")); return; }
    setBusy(true); setError(null); setMessage("");
    try {
      let savedId = id;
      if (!savedId) {
        const created = await createPost({ title: draft.title.trim(), body: draft.body, tags: splitTags(draft.tags), moduleId: draft.moduleId || null, questionId: draft.questionId || null });
        savedId = created.id; setId(created.id); setStatus(created.status);
      } else {
        const saved = await apiRequest<{ status: string }>(`/admin/blog/writer/posts/${encodeURIComponent(savedId)}`, { method: "PUT", body: { title: draft.title.trim(), body: draft.body, excerpt: draft.excerpt || null } });
        setStatus(saved.status);
      }
      // Mark the write complete before the readback. A failed GET must not create a duplicate on retry.
      setBaseline(JSON.stringify(draft)); setMessage(c("Đã lưu bản nháp. Chưa xuất bản cho người học.", "Draft saved. It has not been published to learners.")); onSaved();
      try {
        const latest = await apiRequest<AdminPost>(`/admin/blog/writer/posts/${encodeURIComponent(savedId)}`);
        const next = fromPost(latest); setDraft(next); setBaseline(JSON.stringify(next)); setStatus(latest.status);
      } catch (reason) { setError(reason); }
    } catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  async function action(kind: "publish" | PostAction) {
    if (!id || busy || dirty || (kind !== "publish" && !reason.trim())) return;
    if (!window.confirm(kind === "publish" ? c("Xuất bản bài viết này cho người học?", "Publish this article for learners?") : c("Áp dụng thay đổi trạng thái? Xóa là xóa mềm; khôi phục đưa bài về REVIEW, không tự xuất bản.", "Apply this state change? Deletion is reversible; restoration returns to REVIEW, not public."))) return;
    setBusy(true); setError(null); setMessage("");
    try {
      if (kind === "publish") { await apiRequest(`/admin/blog/posts/${encodeURIComponent(id)}/publish`, { method: "POST" }); setStatus("PUBLISHED"); }
      else { const result = await moderatePost(id, kind, reason); setStatus(result.status); }
      setReason(""); setMessage(kind === "publish" ? c("Đã xuất bản bài viết.", "Article published.") : c("Đã cập nhật trạng thái bài viết.", "Article status updated.")); onSaved();
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <div className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">{id ? c("Biên tập bài viết", "Edit article") : c("Bài viết mới", "New article")}</h2><span className="rounded-md bg-muted px-3 py-1 text-xs text-subtle">{dirty ? c("Chưa lưu", "Unsaved") : status}</span></div>
    {id && <p className="break-all text-xs text-subtle">ID: {id}</p>}
    <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset className="!bg-transparent space-y-5" disabled={busy || !["NEW", "DRAFT", "REVIEW"].includes(status)}>
        <AdminField label={c("Tiêu đề bài viết", "Article title")}><input className="kg-field" required value={draft.title} onChange={event => setDraft(previous => ({ ...previous, title: event.target.value }))} /></AdminField>
        <div className="grid gap-4 sm:grid-cols-2"><AdminField label={c("Module liên quan", "Related module")}><select className="kg-field" disabled={!!id} value={draft.moduleId} onChange={event => setDraft(previous => ({ ...previous, moduleId: event.target.value }))}><option value="">{c("Không liên kết", "No link")}</option>{modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></AdminField><AdminField label={c("ID câu hỏi liên quan (tùy chọn)", "Related question ID (optional)")}><input className="kg-field font-mono text-sm" disabled={!!id} pattern="[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}" value={draft.questionId} onChange={event => setDraft(previous => ({ ...previous, questionId: event.target.value }))} /></AdminField></div>
        <AdminField label="Tags" hint={id ? c("API chỉnh sửa hiện chỉ hỗ trợ tiêu đề, nội dung và tóm tắt.", "The current edit API supports title, body and excerpt only.") : c("Phân tách bằng dấu phẩy.", "Separate with commas.")}><input className="kg-field" disabled={!!id} value={draft.tags} onChange={event => setDraft(previous => ({ ...previous, tags: event.target.value }))} /></AdminField>
        {id && <AdminField label={c("Tóm tắt", "Excerpt")}><textarea className="kg-field min-h-24" value={draft.excerpt} onChange={event => setDraft(previous => ({ ...previous, excerpt: event.target.value }))} /></AdminField>}
        <ContentEditor label={c("Nội dung bài viết", "Article content")} value={draft.body} onChange={body => setDraft(previous => ({ ...previous, body }))} disabled={busy} />
        {status === "PUBLISHED" && <p className="text-sm text-warning">{c("Ẩn bài rồi khôi phục về REVIEW để chỉnh sửa. Xuất bản lại sau khi kiểm tra.", "Hide and restore to REVIEW before editing. Publish again after review.")}</p>}
      </fieldset>
      <button className="kg-button" disabled={busy || !["NEW", "DRAFT", "REVIEW"].includes(status) || (!!draft.questionId && !isUuid(draft.questionId))}><FloppyDiskIcon size={18} aria-hidden />{busy ? c("Đang xử lý…", "Working…") : c("Lưu bản nháp", "Save draft")}</button>
    </form>
    {Boolean(error) && <p role="alert">{error instanceof Error && error.message === "empty" ? c("Cần nhập nội dung bài viết hợp lệ.", "Please enter valid article content.") : adminError(error, locale === "en")}</p>}{message && <p role="status">{message}</p>}
    {id && <div className="space-y-4 border-t border-line pt-5"><AdminField label={c("Lý do thay đổi trạng thái", "Reason for state change")} hint={c("Bắt buộc khi ẩn, lưu trữ, xóa hoặc khôi phục.", "Required for hiding, archiving, deletion or restoration.")}><textarea className="kg-field min-h-24" maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></AdminField><div className="flex flex-wrap gap-2"><button type="button" className="kg-button" disabled={busy || dirty || !["DRAFT", "REVIEW"].includes(status)} onClick={() => void action("publish")}>{c("Xuất bản", "Publish")}</button>{status !== "DELETED" && <><button className="kg-secondary" disabled={busy || dirty || !reason.trim() || status === "HIDDEN"} onClick={() => void action("HIDE")}>{c("Ẩn bài", "Hide")}</button><button className="kg-secondary" disabled={busy || dirty || !reason.trim() || status === "ARCHIVED"} onClick={() => void action("ARCHIVE")}>{c("Lưu trữ", "Archive")}</button><button className="kg-secondary text-danger" disabled={busy || dirty || !reason.trim()} onClick={() => void action("DELETE")}>{c("Xóa mềm", "Soft-delete")}</button></>}{["HIDDEN", "ARCHIVED", "DELETED"].includes(status) && <button className="kg-secondary" disabled={busy || dirty || !reason.trim()} onClick={() => void action("RESTORE")}>{c("Khôi phục về REVIEW", "Restore to REVIEW")}</button>}</div></div>}
  </div>;
}
