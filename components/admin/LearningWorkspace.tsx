"use client";

import { useEffect, useState } from "react";
import { AdminField, adminError, useAdminCopy } from "@/components/admin/shared";
import { useAdminDirectory, useDebouncedValue } from "@/components/admin/use-directory";
import { Pagination } from "@/components/Pagination";
import { apiRequest } from "@/lib/api-client";
import { isUuid } from "@/lib/admin-content";
import type { AdminUser } from "@/lib/admin-platform";

type Entry = { id: string; label: string; status: string; score: number | null; total: number | null; nextReview: string | null; occurredAt: string | null };

type SelectedAccount = { id: string; displayName?: string; email?: string; role?: string };

function LearningRecords({ userId }: { userId: string }) {
  const { c, locale } = useAdminCopy();
  const [kind, setKind] = useState("QUIZ"); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Entry | null>(null); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [message, setMessage] = useState("");
  const directory = useAdminDirectory<Entry>(`/admin/users/${userId}/learning?kind=${kind}&page=${page}&size=20`);
  async function reset() {
    if (!selected || busy || !reason.trim()) return;
    if (!window.confirm(c("Đặt lại lịch ôn thẻ này? Lịch sử học, XP và điểm không bị xóa.", "Reset this card's schedule? Learning history, XP and scores are preserved."))) return;
    setBusy(true); setError(null); setMessage("");
    try { await apiRequest(`/admin/users/${userId}/learning/srs/${selected.id}/reset`, { method: "POST", body: { reason: reason.trim() } }); setSelected(null); setReason(""); setMessage(c("Đã đặt lại lịch ôn và ghi audit.", "Schedule reset and audit recorded.")); directory.reload(); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <section className="flex flex-1 flex-col gap-5">
    <AdminField label={c("Loại dữ liệu", "Record type")}><select className="kg-field max-w-sm" value={kind} disabled={busy} onChange={event => { setKind(event.target.value); setPage(1); setSelected(null); setReason(""); setMessage(""); }}>{[["QUIZ", c("Trắc nghiệm", "Quizzes")], ["SRS", c("Lịch ôn flashcard", "Flashcard schedules")], ["INTERVIEW", c("Phỏng vấn", "Interviews")], ["PROGRESS", c("Tiến độ", "Progress")]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></AdminField>
    {Boolean(error || directory.error) && <p role="alert" className="text-danger">{adminError(error || directory.error, locale === "en")} <button className="underline" onClick={directory.reload}>{c("Thử lại", "Retry")}</button></p>}
    {message && <p role="status">{message}</p>}
    {directory.loading ? <p role="status">{c("Đang tải…", "Loading…")}</p> : directory.data && !directory.data.items.length ? <p>{c("Chưa có dữ liệu học thuộc nhóm này.", "No learning records in this group.")}</p> : <ul className="divide-y divide-line">{directory.data?.items.map(entry => <li key={entry.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="break-words text-lg">{entry.label}</h2><p className="mt-2 text-sm text-subtle">{entry.status}{entry.score != null && ` · ${c("Điểm", "Score")}: ${entry.score}`}{entry.total != null && ` · ${kind === "SRS" ? c("Số lần ôn", "Repetitions") : c("Tổng", "Total")}: ${entry.total}`}</p>{entry.nextReview && <p className="mt-2 text-sm">{c("Ôn tiếp", "Next review")}: {entry.nextReview}</p>}{entry.occurredAt && <p className="mt-2 text-sm text-subtle">{new Date(entry.occurredAt).toLocaleString(locale === "en" ? "en-US" : "vi-VN")}</p>}</div>{kind === "SRS" && <button className="kg-secondary" disabled={busy} onClick={() => { setSelected(entry); setReason(""); setMessage(""); }}>{c("Đặt lại lịch ôn", "Reset schedule")}</button>}</div>{selected?.id === entry.id && kind === "SRS" && <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); void reset(); }}><AdminField label={c("Lý do đặt lại", "Reset reason")}><textarea className="kg-field min-h-24" required maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></AdminField><div className="flex gap-2"><button className="kg-secondary" disabled={busy || !reason.trim()}>{c("Xác nhận đặt lại lịch", "Confirm schedule reset")}</button><button type="button" className="kg-secondary" disabled={busy} onClick={() => setSelected(null)}>{c("Hủy", "Cancel")}</button></div></form>}</li>)}</ul>}
    <Pagination page={page} totalPages={directory.data?.totalPages ?? 0} onChange={setPage} disabled={busy || directory.loading} />
  </section>;
}

/** Bộ chọn tài khoản: tìm theo tên/email (debounce) rồi bấm để mở dữ liệu học. Không cần dán UUID. */
function AccountPicker({ onSelect }: { onSelect: (user: AdminUser) => void }) {
  const { c, locale } = useAdminCopy();
  const [query, setQuery] = useState(""); const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const params = new URLSearchParams({ page: String(page), size: "10" });
  if (debouncedQuery) params.set("q", debouncedQuery);
  const directory = useAdminDirectory<AdminUser>(`/admin/users?${params}`);
  return <section className="flex flex-1 flex-col gap-5">
    <form className="grid max-w-2xl items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={event => { event.preventDefault(); setPage(1); }}><AdminField label={c("Tìm tài khoản bằng tên hoặc email", "Find an account by name or email")}><input type="search" className="kg-field" maxLength={200} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></AdminField><button className="kg-button" disabled={directory.loading}>{c("Tìm tài khoản", "Search accounts")}</button></form>
    {directory.error ? <p role="alert">{adminError(directory.error, locale === "en")} <button className="underline" onClick={directory.reload}>{c("Thử lại", "Retry")}</button></p> : directory.loading ? <p role="status">{c("Đang tải tài khoản…", "Loading accounts…")}</p> : <>
      <p className="text-sm text-subtle">{c("Chọn người học bên dưới để xem lịch sử và hỗ trợ lịch ôn. Không cần nhập ID tài khoản.", "Select a learner below to inspect history and help with review schedules. No account ID needed.")}</p>
      {!directory.data?.items.length ? <p className="kg-notice">{c("Không tìm thấy tài khoản. Thử tên hoặc email khác.", "No accounts found. Try another name or email.")}</p> : <ul className="divide-y divide-line rounded-xl border border-line bg-surface">{directory.data.items.map(user => <li key={user.id}><button type="button" className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 p-5 text-left hover:bg-muted" onClick={() => onSelect(user)}><span className="min-w-0"><strong className="block break-words text-strong">{user.displayName}</strong><span className="mt-1 block break-all text-sm text-subtle">{user.email}</span><span className="mt-1 block text-sm text-subtle">{user.role}</span></span><span className="text-sm font-medium text-accent">{c("Xem dữ liệu học", "View learning data")}</span></button></li>)}</ul>}
    </>}
    <Pagination page={page} totalPages={directory.data?.totalPages ?? 0} onChange={setPage} disabled={directory.loading || Boolean(directory.error)} />
  </section>;
}

/** Nội dung tab Dữ liệu học. Nhận `userId` từ deep-link ?userId= để tự mở đúng tài khoản. */
export function LearningWorkspace({ userId }: { userId?: string }) {
  const { c } = useAdminCopy();
  const [selected, setSelected] = useState<SelectedAccount | null>(null);
  useEffect(() => {
    if (userId && isUuid(userId)) setSelected(previous => previous?.id === userId ? previous : { id: userId });
  }, [userId]);
  return <section className="flex flex-col gap-6">
    {selected ? <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-line bg-surface px-4 py-2">
          <strong className="break-words text-strong">{selected.displayName ?? c("Tài khoản đang xem", "Selected account")}</strong>
          <span className="break-all text-sm text-subtle">{selected.email ?? selected.id}</span>
          {selected.role && <span className="text-sm text-subtle">{selected.role}</span>}
        </div>
        <button type="button" className="kg-secondary" onClick={() => setSelected(null)}>{c("Bỏ chọn", "Clear selection")}</button>
      </div>
      <LearningRecords key={selected.id} userId={selected.id} />
    </> : <AccountPicker onSelect={user => setSelected({ id: user.id, displayName: user.displayName, email: user.email, role: user.role })} />}
  </section>;
}
