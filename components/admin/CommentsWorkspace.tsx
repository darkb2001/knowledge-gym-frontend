"use client";

import { useState } from "react";
import { Pagination } from "@/components/Pagination";
import { AdminField, adminError, useAdminCopy } from "@/components/admin/shared";
import { useAdminDirectory } from "@/components/admin/use-directory";
import { moderateComment, type AdminComment, type CommentStatus } from "@/lib/admin-platform";

/** Nội dung tab Bình luận trong hub /admin/users. Không còn page shell/heading/guard — hub cung cấp. */
export function CommentsWorkspace() {
  const { c, locale } = useAdminCopy();
  const [query, setQuery] = useState(""); const [search, setSearch] = useState("");
  const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminComment | null>(null);
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null); const [message, setMessage] = useState("");
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (search) params.set("q", search); if (status) params.set("status", status);
  const directory = useAdminDirectory<AdminComment>(`/admin/blog/comments?${params}`);
  async function act(action: CommentStatus | "RESTORE") {
    if (!selected || busy || !reason.trim()) return;
    if (!window.confirm(c("Áp dụng thay đổi cho bình luận này? Xóa là xóa mềm, có thể khôi phục.", "Apply this change? Deletion is reversible soft deletion."))) return;
    setBusy(true); setError(null); setMessage("");
    try { setSelected(await moderateComment(selected.id, action, reason)); setReason(""); setMessage(c("Đã cập nhật bình luận.", "Comment updated.")); directory.reload(); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <>
    <form className="mb-7 flex flex-wrap items-end gap-4" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}><AdminField label={c("Nội dung bình luận", "Comment content")}><input className="kg-field" maxLength={200} value={query} onChange={event => setQuery(event.target.value)} /></AdminField><AdminField label={c("Trạng thái", "Status")}><select className="kg-field" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">{c("Tất cả", "All")}</option>{["VISIBLE", "HIDDEN", "DELETED"].map(value => <option key={value}>{value}</option>)}</select></AdminField><button className="kg-secondary" disabled={directory.loading}>{c("Tìm bình luận", "Search comments")}</button></form>
    {Boolean(error || directory.error) && <p role="alert" className="mb-5 text-danger">{adminError(error || directory.error, locale === "en")} <button className="underline" onClick={directory.reload}>{c("Thử lại", "Retry")}</button></p>}
    {message && <p role="status" className="mb-5">{message}</p>}
    <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label={c("Danh sách bình luận", "Comment directory")}>
        {directory.loading ? <p role="status">{c("Đang tải…", "Loading…")}</p> : directory.data && !directory.data.items.length ? <p>{c("Không có bình luận phù hợp.", "No matching comments.")}</p> : <ul className="divide-y divide-line">{directory.data?.items.map(comment => <li key={comment.id}><button className={`w-full p-4 text-left hover:bg-muted ${selected?.id === comment.id ? "bg-sage" : ""}`} disabled={busy} aria-pressed={selected?.id === comment.id} onClick={() => { setSelected(comment); setReason(""); setError(null); setMessage(""); }}><span className="block font-semibold text-strong">{comment.postTitle}</span><span className="mt-2 block whitespace-pre-wrap break-words text-sm">{comment.content}</span><span className="mt-2 block text-sm text-subtle">{comment.displayName} · {comment.status}</span></button></li>)}</ul>}
      </section>
      <section className="space-y-5 border-t border-line pt-5 xl:border-t-0 xl:pt-0" aria-label={c("Thao tác kiểm duyệt", "Moderation actions")}>
        {!selected ? <p className="text-subtle">{c("Chọn bình luận để xử lý.", "Select a comment to moderate.")}</p> : <><h2 className="text-xl">{selected.displayName}</h2><p className="text-sm">{c("Trạng thái", "Status")}: {selected.status}</p><p className="whitespace-pre-wrap break-words">{selected.content}</p><AdminField label={c("Lý do xử lý", "Moderation reason")}><textarea className="kg-field min-h-24" maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></AdminField><div className="flex flex-wrap gap-2">{selected.status === "DELETED" ? <button className="kg-secondary" disabled={busy || !reason.trim()} onClick={() => void act("RESTORE")}>{c("Khôi phục về trạng thái ẩn", "Restore as hidden")}</button> : <><button className="kg-secondary" disabled={busy || !reason.trim()} onClick={() => void act(selected.status === "VISIBLE" ? "HIDDEN" : "VISIBLE")}>{selected.status === "VISIBLE" ? c("Ẩn bình luận", "Hide comment") : c("Cho hiển thị", "Show comment")}</button><button className="kg-secondary text-danger" disabled={busy || !reason.trim()} onClick={() => void act("DELETED")}>{c("Xóa mềm", "Soft-delete")}</button></>}</div><p className="text-sm text-subtle">{c("Khôi phục không tự hiển thị lại. Cần duyệt riêng để công khai bình luận.", "Restoring does not make the comment public. Approve visibility separately.")}</p></>}
      </section>
    </div>
    <Pagination page={page} totalPages={directory.data?.totalPages ?? 0} onChange={setPage} disabled={directory.loading || busy} />
  </>;
}
