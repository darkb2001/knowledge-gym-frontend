"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RequireAuth, Field, PageHeading } from "@/components/ui";
import PasswordPanel from "@/components/PasswordPanel";
import SessionsPanel from "@/components/SessionsPanel";
import MotionToggle from "@/components/MotionToggle";
import { useLocale } from "@/components/locale";
import { apiRequest } from "@/lib/api-client";
import { uploadAvatar, validateAvatar } from "@/lib/storage";
import { readStoredUser, storeUser } from "@/lib/auth";
import { getProgress, getStats, type ProgressModule, type UserStats } from "@/lib/dashboard";

type Profile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  authProvider: string;
  /** `false` khi tài khoản chỉ đăng nhập bằng Google (chưa đặt mật khẩu). */
  hasPassword: boolean;
  stats: UserStats;
};

type ProgressState = "loading" | "ready" | "empty" | "hidden";

/**
 * Tiến độ học tập trên trang hồ sơ. Gọi `/users/me/progress` + `/users/me/stats`
 * (đã có ở backend nhưng trước đây chưa hiển thị). Nếu endpoint lỗi/404 thì ẩn
 * cả mục — không được làm hỏng phần còn lại của trang hồ sơ.
 */
function ProgressSection() {
  const { t, formatLocale } = useLocale();
  const [progress, setProgress] = useState<ProgressModule[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [state, setState] = useState<ProgressState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    Promise.all([getProgress(controller.signal), getStats(controller.signal)])
      .then(([nextProgress, nextStats]) => {
        if (controller.signal.aborted) return;
        const modules = Array.isArray(nextProgress) ? nextProgress : [];
        setProgress(modules);
        setStats(nextStats ?? null);
        setState(modules.length ? "ready" : "empty");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("hidden");
      });
    return () => controller.abort();
  }, []);

  if (state === "hidden") return null;

  const totalAnswered = progress.reduce((sum, item) => sum + (Number.isFinite(item.totalAttempts) ? item.totalAttempts : 0), 0);

  return <section className="kg-panel mt-6" aria-labelledby="learning-progress-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="learning-progress-heading" className="text-xl text-strong">{t("Tiến độ học tập")}</h2>
        <p className="mt-1 text-sm text-subtle">{t("Mức độ nắm vững")} · tổng số câu đã trả lời</p>
      </div>
      <Link href="/dashboard" className="kg-secondary min-h-11 px-4 text-sm">{t("Xem trên bảng điều khiển")}</Link>
    </div>
    {state === "loading" && <p role="status" className="mt-4 text-sm text-subtle">Đang tải tiến độ…</p>}
    {state === "empty" && <p className="mt-4 text-sm text-subtle">Chưa có dữ liệu tiến độ — làm vài câu để bắt đầu</p>}
    {state === "ready" && <>
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-line/70 py-3 text-sm text-subtle">
        <span>Tổng số câu đã trả lời: <strong className="tabular-nums text-strong">{totalAnswered.toLocaleString(formatLocale)}</strong></span>
        {stats ? <span>{t("Kinh nghiệm tích lũy")}: <strong className="tabular-nums text-strong">{stats.xp.toLocaleString(formatLocale)} XP</strong></span> : null}
        {stats?.level ? <span>Cấp {stats.level}</span> : null}
      </p>
      <ul className="mt-5 space-y-4">
        {progress.map(item => {
          const pct = Math.max(0, Math.min(100, Math.round(item.masteryPct)));
          return <li key={item.moduleId}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="break-all font-medium text-strong">{item.moduleId}</span>
              <span className="tabular-nums text-subtle">{pct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={item.moduleId}>
              <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </li>;
        })}
      </ul>
    </>}
  </section>;
}

function ProfilePage() {
  const { t, formatLocale } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    apiRequest<Profile>("/users/me", { signal: controller.signal })
      .then(next => {
        if (!controller.signal.aborted) { setProfile(next); setDisplayName(next.displayName); }
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được hồ sơ");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  // Both normal saves and uploads share persistence, not the busy guard.
  // Calling the guarded save while an upload is busy previously skipped PATCH entirely.
  async function persistProfile(avatarUrl: string | null) {
    const updated = await apiRequest<Profile>("/users/me", {
      method: "PATCH", body: { displayName: displayName.trim(), avatarUrl },
    });
    setProfile(updated); setDisplayName(updated.displayName); setMessage("Đã lưu hồ sơ.");
    const stored = readStoredUser();
    if (stored) {
      storeUser({ ...stored, displayName: updated.displayName });
      window.dispatchEvent(new Event("kg:user-changed"));
    }
  }

  async function saveProfile() {
    if (!profile || busy || !displayName.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try { await persistProfile(profile.avatarUrl ?? null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được hồ sơ"); }
    finally { setBusy(false); }
  }

  async function onPickAvatar(file: File | undefined) {
    if (!file || !profile || busy) return;
    const invalid = validateAvatar(file);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await uploadAvatar(file);
      setProfile(current => current ? { ...current, avatarUrl: updated.avatarUrl, displayName: updated.displayName } : current);
      setDisplayName(updated.displayName);
      const stored = readStoredUser();
      if (stored) { storeUser({ ...stored, displayName: updated.displayName }); window.dispatchEvent(new Event("kg:user-changed")); }
      setMessage("Đã cập nhật ảnh đại diện.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không tải ảnh đại diện"); }
    finally { setBusy(false); }
  }

  const providerLabel = profile && profile.authProvider.toUpperCase() === "GOOGLE" ? t("Google") : t("Email và mật khẩu");
  const roleLabel = profile && profile.role.toUpperCase().includes("ADMIN") ? t("Quản trị viên") : t("Người học");

  return <div className="max-w-3xl">
    <PageHeading title="Hồ sơ của bạn" description="Quản lý thông tin cá nhân và bảo mật tài khoản." />
    {error && <p role="alert" className="mb-6">{t(error)}{!profile && <button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-4 underline">{t("Thử lại")}</button>}</p>}
    {message && <p role="status" className="mb-6">{t(message)}</p>}
    {loading && <p role="status">{t("Đang tải hồ sơ…")}</p>}
    {profile && <section className="kg-panel space-y-7">
      <div className="flex flex-wrap items-center gap-5">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt={`${t("Ảnh đại diện")}: ${profile.displayName}`} className="h-20 w-20 rounded-full bg-sage object-cover" />
        ) : <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-sage text-3xl font-medium text-strong">{profile.displayName.slice(0, 1).toUpperCase()}</span>}
        <div className="min-w-0 flex-1"><p className="break-all font-medium text-strong">{profile.email}</p><p className="mt-1 text-xs text-subtle">{providerLabel}</p><button type="button" disabled={busy || loading} onClick={() => fileRef.current?.click()} className="kg-secondary mt-3">{t(busy ? "Đang tải…" : "Đổi ảnh đại diện")}</button><input ref={fileRef} aria-label={t("Ảnh đại diện")} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void onPickAvatar(file); }} /></div>
      </div>
      <form onSubmit={event => { event.preventDefault(); void saveProfile(); }}>
        <Field label="Tên hiển thị"><input required value={displayName} disabled={busy || loading} onChange={event => setDisplayName(event.target.value)} className="kg-field" maxLength={80} autoComplete="nickname" /></Field>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><p className="text-sm tabular-nums text-body">{t("Kinh nghiệm tích lũy")}: {profile.stats.xp.toLocaleString(formatLocale)} XP<span className="mx-2" aria-hidden>·</span>{t("Ngày liên tiếp")}: {profile.stats.currentStreak.toLocaleString(formatLocale)}</p><button type="submit" disabled={busy || loading || !displayName.trim() || displayName.trim() === profile.displayName} className="kg-button">{t(busy ? "Đang lưu…" : "Lưu hồ sơ")}</button></div>
      </form>
      <section className="border-t border-line pt-6" aria-labelledby="account-settings-heading">
        <h2 id="account-settings-heading" className="text-xl text-strong">{t("Thông tin tài khoản")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-subtle">{t("Email")}</dt><dd className="mt-1 break-all font-medium text-strong">{profile.email}</dd><p className="mt-1 text-xs text-subtle">{t("Email hiện chưa hỗ trợ chỉnh sửa trực tiếp để bảo vệ phiên đăng nhập.")}</p></div>
          <div><dt className="text-xs text-subtle">{t("Phương thức đăng nhập")}</dt><dd className="mt-1 font-medium text-strong">{providerLabel}</dd></div>
          <div><dt className="text-xs text-subtle">{t("Vai trò")}</dt><dd className="mt-1 font-medium text-strong">{roleLabel}</dd></div>
          <div><dt className="text-xs text-subtle">{t("Thành tích học tập")}</dt><dd className="mt-1 font-medium text-strong"><Link href="/dashboard" className="text-accent underline-offset-4 hover:underline">{t("Xem trên bảng điều khiển")}</Link></dd></div>
        </dl>
        <PasswordPanel hasPassword={profile.hasPassword} />
      </section>
    </section>}
      <section className="border-t border-line pt-6" aria-labelledby="display-preferences-heading">
        <h2 id="display-preferences-heading" className="text-lg font-semibold text-strong">{t("Hiển thị & hiệu ứng")}</h2>
        <p className="mt-1 text-sm text-subtle">{t("Một số điện thoại tắt hiệu ứng động của trang khi bật Giảm chuyển động.")}</p>
        <div className="mt-4"><MotionToggle /></div>
      </section>
    <SessionsPanel />
    <ProgressSection />
  </div>;
}

export default function ProfileRoute() { return <RequireAuth><ProfilePage /></RequireAuth>; }
