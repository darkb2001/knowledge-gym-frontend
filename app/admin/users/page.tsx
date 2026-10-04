"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeading, RequireAdmin } from "@/components/ui";
import { Pagination } from "@/components/Pagination";
import { AdminField, adminError, useAdminCopy } from "@/components/admin/shared";
import { useAdminDirectory } from "@/components/admin/use-directory";
import { changeUserRole, changeUserStatus, revokeUserSessions, type AdminUser, type UserRole } from "@/lib/admin-platform";

function UsersWorkspace() {
  const { c, locale } = useAdminCopy();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [blocked, setBlocked] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>("USER");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (search) params.set("q", search); if (role) params.set("role", role); if (blocked) params.set("blocked", blocked);
  const directory = useAdminDirectory<AdminUser>(`/admin/users?${params}`);
  async function act(action: "role" | "status" | "sessions") {
    if (!selected || busy || !reason.trim()) return;
    if (!window.confirm(c(`Thực hiện thao tác trên tài khoản ${selected.email}? Các phiên đăng nhập hiện tại sẽ bị thu hồi.`, `Apply this action to ${selected.email}? Current sessions will be revoked.`))) return;
    setBusy(true); setError(null); setMessage("");
    try {
      if (action === "role") setSelected(await changeUserRole(selected.id, nextRole, reason));
      else if (action === "status") setSelected(await changeUserStatus(selected.id, !selected.blocked, reason));
      else await revokeUserSessions(selected.id, reason);
      setReason(""); setMessage(c("Đã cập nhật và ghi nhật ký quản trị.", "Updated and recorded in the audit log.")); directory.reload();
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <div className="kg-page">
    <PageHeading title={c("Quản lý tài khoản", "Account management")} description={c("Tìm người dùng, quản lý quyền và bảo vệ phiên đăng nhập. Mọi thay đổi cần lý do.", "Find users, manage roles and secure sessions. Every change requires a reason.")} />
    <form className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}>
      <AdminField label={c("Email hoặc tên", "Email or name")}><input className="kg-field" value={query} maxLength={200} onChange={event => setQuery(event.target.value)} /></AdminField>
      <AdminField label={c("Quyền", "Role")}><select className="kg-field" value={role} onChange={event => { setPage(1); setRole(event.target.value); }}><option value="">{c("Tất cả", "All")}</option>{["USER", "PREMIUM", "ADMIN"].map(value => <option key={value}>{value}</option>)}</select></AdminField>
      <AdminField label={c("Trạng thái", "Status")}><select className="kg-field" value={blocked} onChange={event => { setPage(1); setBlocked(event.target.value); }}><option value="">{c("Tất cả", "All")}</option><option value="false">{c("Hoạt động", "Active")}</option><option value="true">{c("Đã khóa", "Blocked")}</option></select></AdminField>
      <button className="kg-secondary self-end" disabled={directory.loading}>{c("Tìm tài khoản", "Search accounts")}</button>
    </form>
    {Boolean(directory.error || error) && <p role="alert" className="mb-5 text-danger">{adminError(directory.error || error, locale === "en")} <button className="underline" onClick={directory.reload}>{c("Thử lại", "Retry")}</button></p>}
    {message && <p role="status" className="mb-5">{message}</p>}
    <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label={c("Danh sách tài khoản", "Account directory")}>
        {directory.loading ? <p role="status">{c("Đang tải…", "Loading…")}</p> : directory.data && !directory.data.items.length ? <p>{c("Không tìm thấy tài khoản phù hợp.", "No matching accounts.")}</p> : <ul className="divide-y divide-line">{directory.data?.items.map(user => <li key={user.id}><button className={`w-full min-w-0 p-4 text-left hover:bg-muted ${selected?.id === user.id ? "bg-sage" : ""}`} disabled={busy} aria-pressed={selected?.id === user.id} onClick={() => { setSelected(user); setNextRole(user.role); setReason(""); setError(null); setMessage(""); }}><span className="block font-semibold text-strong">{user.displayName}</span><span className="block break-all text-sm">{user.email}</span><span className="mt-2 block text-sm text-subtle">{user.role} · {user.blocked ? c("Đã khóa", "Blocked") : c("Hoạt động", "Active")} · {user.emailVerified ? c("Email đã xác minh", "Verified email") : c("Email chưa xác minh", "Unverified email")}</span></button></li>)}</ul>}
      </section>
      <section className="min-w-0 border-t border-line pt-5 xl:border-t-0 xl:pt-0" aria-label={c("Chi tiết tài khoản", "Account details")}>
        {!selected ? <p className="text-subtle">{c("Chọn tài khoản để quản lý.", "Select an account to manage.")}</p> : <div className="space-y-5"><h2 className="text-xl">{selected.displayName}</h2><p className="break-all text-sm">{selected.email}</p><dl className="grid grid-cols-2 gap-3 text-sm"><dt>{c("Đăng nhập bằng", "Login provider")}</dt><dd>{selected.authProvider}</dd><dt>XP</dt><dd className="tabular-nums">{selected.xp}</dd><dt>{c("Trạng thái", "Status")}</dt><dd>{selected.blocked ? c("Đã khóa", "Blocked") : c("Hoạt động", "Active")}</dd></dl>
          <Link className="kg-secondary" href={`/admin/learning?userId=${selected.id}`}>{c("Xem dữ liệu học", "View learning data")}</Link>
          <AdminField label={c("Lý do thay đổi", "Reason for change")} hint={c("Bắt buộc; được lưu trong nhật ký quản trị.", "Required; recorded in the audit log.")}><textarea className="kg-field min-h-24" maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></AdminField>
          <AdminField label={c("Quyền mới", "New role")}><select className="kg-field" disabled={busy} value={nextRole} onChange={event => setNextRole(event.target.value as UserRole)}>{["USER", "PREMIUM", "ADMIN"].map(value => <option key={value}>{value}</option>)}</select></AdminField>
          <div className="flex flex-wrap gap-2"><button className="kg-secondary" disabled={busy || !reason.trim() || nextRole === selected.role} onClick={() => void act("role")}>{c("Đổi quyền", "Change role")}</button><button className="kg-secondary" disabled={busy || !reason.trim()} onClick={() => void act("status")}>{selected.blocked ? c("Mở khóa", "Unblock") : c("Khóa tài khoản", "Block account")}</button><button className="kg-secondary" disabled={busy || !reason.trim()} onClick={() => void act("sessions")}>{c("Thu hồi phiên", "Revoke sessions")}</button></div>
          <p className="text-sm text-subtle">{c("Không thể tự khóa/hạ quyền hoặc loại bỏ admin cuối cùng.", "You cannot block/demote yourself or remove the last active admin.")}</p>
        </div>}
      </section>
    </div>
    <Pagination page={page} totalPages={directory.data?.totalPages ?? 0} onChange={setPage} disabled={directory.loading || busy} />
  </div>;
}
export default function AdminUsersPage() { return <RequireAdmin><UsersWorkspace /></RequireAdmin>; }
