"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAdmin, PageHeading } from "@/components/ui";
import { AdminField, adminError, useAdminCopy } from "@/components/admin/shared";
import { useAdminDirectory } from "@/components/admin/use-directory";
import { Pagination } from "@/components/Pagination";
import { apiRequest } from "@/lib/api-client";
import { isUuid } from "@/lib/admin-content";

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
  return <section className="space-y-5">
    <AdminField label={c("Loại dữ liệu", "Record type")}><select className="kg-field max-w-sm" value={kind} disabled={busy} onChange={event => { setKind(event.target.value); setPage(1); setSelected(null); setReason(""); setMessage(""); }}>{["QUIZ", "SRS", "INTERVIEW", "PROGRESS"].map(value => <option key={value}>{value}</option>)}</select></AdminField>
    {Boolean(error || directory.error) && <p role="alert" className="text-danger">{adminError(error || directory.error, locale === "en")} <button className="underline" onClick={directory.reload}>{c("Thử lại", "Retry")}</button></p>}
    {message && <p role="status">{message}</p>}
    {directory.loading ? <p role="status">{c("Đang tải…", "Loading…")}</p> : directory.data && !directory.data.items.length ? <p>{c("Chưa có dữ liệu học thuộc nhóm này.", "No learning records in this group.")}</p> : <ul className="divide-y divide-line">{directory.data?.items.map(entry => <li key={entry.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="break-words text-lg">{entry.label}</h2><p className="mt-2 text-sm text-subtle">{entry.status}{entry.score != null && ` · ${c("Điểm", "Score")}: ${entry.score}`}{entry.total != null && ` · ${kind === "SRS" ? c("Số lần ôn", "Repetitions") : c("Tổng", "Total")}: ${entry.total}`}</p>{entry.nextReview && <p className="mt-2 text-sm">{c("Ôn tiếp", "Next review")}: {entry.nextReview}</p>}{entry.occurredAt && <p className="mt-2 text-sm text-subtle">{new Date(entry.occurredAt).toLocaleString(locale === "en" ? "en-US" : "vi-VN")}</p>}</div>{kind === "SRS" && <button className="kg-secondary" disabled={busy} onClick={() => { setSelected(entry); setReason(""); setMessage(""); }}>{c("Đặt lại lịch ôn", "Reset schedule")}</button>}</div>{selected?.id === entry.id && kind === "SRS" && <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); void reset(); }}><AdminField label={c("Lý do đặt lại", "Reset reason")}><textarea className="kg-field min-h-24" required maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></AdminField><div className="flex gap-2"><button className="kg-secondary" disabled={busy || !reason.trim()}>{c("Xác nhận đặt lại lịch", "Confirm schedule reset")}</button><button type="button" className="kg-secondary" disabled={busy} onClick={() => setSelected(null)}>{c("Hủy", "Cancel")}</button></div></form>}</li>)}</ul>}
    <Pagination page={page} totalPages={directory.data?.totalPages ?? 0} onChange={setPage} disabled={busy || directory.loading} />
  </section>;
}
function LearningWorkspace() {
  const { c } = useAdminCopy(); const [input, setInput] = useState(""); const [userId, setUserId] = useState("");
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("userId") ?? ""; if (isUuid(id)) { setInput(id); setUserId(id); } }, []);
  return <div><PageHeading title={c("Quản trị dữ liệu học", "Learning administration")} description={c("Kiểm tra quiz, thẻ SRS, phỏng vấn và tiến độ theo từng tài khoản. Không chỉnh sửa điểm hoặc xóa lịch sử tại đây.", "Inspect quizzes, SRS cards, interviews and progress per account. This workspace does not alter scores or delete history.")} action={<Link className="kg-secondary" href="/admin/users">{c("Chọn tài khoản", "Choose account")}</Link>} /><form className="mb-7 flex flex-wrap items-end gap-4" onSubmit={event => { event.preventDefault(); if (isUuid(input.trim())) setUserId(input.trim()); }}><AdminField label={c("ID tài khoản", "Account ID")}><input className="kg-field" value={input} onChange={event => setInput(event.target.value)} /></AdminField><button className="kg-secondary" disabled={!isUuid(input.trim())}>{c("Xem dữ liệu", "View records")}</button></form>{userId && <LearningRecords key={userId} userId={userId} />}</div>;
}
export default function AdminLearningPage() { return <RequireAdmin><LearningWorkspace /></RequireAdmin>; }
