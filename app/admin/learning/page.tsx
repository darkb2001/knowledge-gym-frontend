"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAdmin, PageHeading } from "@/components/ui";
import { AdminField, adminError, useAdminCopy } from "@/components/admin/shared";
import { useAdminDirectory } from "@/components/admin/use-directory";
import { Pagination } from "@/components/Pagination";
import { apiRequest } from "@/lib/api-client";
import { isUuid } from "@/lib/admin-content";
import type { AdminUser } from "@/lib/admin-platform";

type Entry = { id: string; label: string; status: string; score: number | null; total: number | null; nextReview: string | null; occurredAt: string | null };
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
function AccountPicker({ onSelect }: { onSelect: (user: AdminUser) => void }) {
  const { c, locale } = useAdminCopy();
  const [query, setQuery] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const directory = useAdminDirectory<AdminUser>(`/admin/users?q=${encodeURIComponent(search)}&page=${page}&size=10`);
  return <section className="flex flex-1 flex-col gap-5">
    <form className="grid max-w-2xl items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={e => { e.preventDefault(); setSearch(query.trim()); setPage(1); }}><AdminField label={c("Tìm tài khoản bằng tên hoặc email", "Find an account by name or email")}><input type="search" className="kg-field" maxLength={200} value={query} onChange={e => setQuery(e.target.value)} /></AdminField><button className="kg-button" disabled={directory.loading}>{c("Tìm tài khoản", "Search accounts")}</button></form>
    {directory.error ? <p role="alert">{adminError(directory.error, locale === "en")} <button className="underline" onClick={directory.reload}>{c("Thử lại", "Retry")}</button></p> : directory.loading ? <p role="status">{c("Đang tải tài khoản…", "Loading accounts…")}</p> : <>
      <p className="text-sm text-subtle">{c("Chọn người học bên dưới để xem lịch sử và hỗ trợ lịch ôn. Không cần nhập ID tài khoản.", "Select a learner below to inspect history and help with review schedules. No account ID needed.")}</p>
      {!directory.data?.items.length ? <p className="kg-notice">{c("Không tìm thấy tài khoản. Thử tên hoặc email khác.", "No accounts found. Try another name or email.")}</p> : <ul className="divide-y divide-line rounded-xl border border-line bg-surface">{directory.data.items.map(user => <li key={user.id}><button type="button" className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 p-5 text-left hover:bg-muted" onClick={() => onSelect(user)}><span className="min-w-0"><strong className="block break-words text-strong">{user.displayName}</strong><span className="mt-1 block break-all text-sm text-subtle">{user.email}</span></span><span className="text-sm font-medium text-accent">{c("Xem dữ liệu học", "View learning data")}</span></button></li>)}</ul>}
    </>}
    <Pagination page={page} totalPages={directory.data?.totalPages ?? 0} onChange={setPage} disabled={directory.loading || Boolean(directory.error)} />
  </section>;
}
function LearningWorkspace() {
  const { c } = useAdminCopy(); const [input, setInput] = useState(""); const [userId, setUserId] = useState(""); const [account, setAccount] = useState<AdminUser | null>(null);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("userId") ?? ""; if (isUuid(id)) { setInput(id); setUserId(id); } }, []);
  return <div className="kg-page">
    <PageHeading title={c("Quản trị dữ liệu học", "Learning administration")} description={c("Chọn người học để kiểm tra trắc nghiệm, flashcard, phỏng vấn và tiến độ. Điểm và lịch sử học được giữ nguyên.", "Choose a learner to inspect quizzes, flashcards, interviews and progress. Scores and learning history are preserved.")} action={<Link className="kg-secondary" href="/admin/users">{c("Quản lý tài khoản", "Manage accounts")}</Link>} />
    {!userId && <details className="mb-6"><summary>{c("Tra cứu bằng ID (nâng cao)", "Look up by ID (advanced)")}</summary><form className="mt-4 grid max-w-2xl items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={e => { e.preventDefault(); if (isUuid(input.trim())) { setUserId(input.trim()); setAccount(null); } }}><AdminField label={c("ID tài khoản", "Account ID")}><input className="kg-field" value={input} onChange={e => setInput(e.target.value)} /></AdminField><button className="kg-secondary" disabled={!isUuid(input.trim())}>{c("Xem dữ liệu", "View records")}</button></form></details>}
    {userId ? <><div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-line py-4"><div><h2 className="text-lg">{account?.displayName ?? c("Tài khoản đang xem", "Selected account")}</h2><p className="mt-1 break-all text-sm text-subtle">{account?.email ?? userId}</p></div><button type="button" className="kg-secondary" onClick={() => { setUserId(""); setAccount(null); }}>{c("Chọn người học khác", "Choose another learner")}</button></div><LearningRecords key={userId} userId={userId} /></> : <AccountPicker onSelect={user => { setAccount(user); setUserId(user.id); }} />}
  </div>;
}
export default function AdminLearningPage() { return <RequireAdmin><LearningWorkspace /></RequireAdmin>; }
