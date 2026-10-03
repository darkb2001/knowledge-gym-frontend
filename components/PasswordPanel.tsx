"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { apiRequest, ApiError } from "@/lib/api-client";

/**
 * Đổi / đặt mật khẩu ngay trong trang hồ sơ — không đẩy người dùng sang luồng quên mật khẩu.
 *
 * - Tài khoản đã có mật khẩu (`hasPassword`): xác minh mật khẩu hiện tại rồi đổi.
 * - Tài khoản đăng nhập Google (`password_hash` NULL): gửi mã 6 số về email, xác minh rồi ĐẶT
 *   mật khẩu lần đầu — giống các dịch vụ OAuth lớn, để vẫn đăng nhập được bằng Google.
 *
 * Sau khi đổi mật khẩu, BE thu hồi mọi phiên khác nhưng giữ phiên hiện tại.
 */
export default function PasswordPanel({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function collapse() {
    setOpen(false);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setCode(""); setCodeSent(false);
  }

  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sameAsCurrent = hasPassword && newPassword.length > 0 && newPassword === currentPassword;
  const readyToSubmit = hasPassword
    ? Boolean(currentPassword) && newPassword.length >= 8 && !mismatch && !sameAsCurrent
    : codeSent && /^\d{6}$/.test(code) && newPassword.length >= 8 && !mismatch;

  function describe(reason: unknown, fallback: string) {
    if (reason instanceof ApiError) return reason.message;
    return reason instanceof Error ? reason.message : fallback;
  }

  async function sendCode() {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest<{ message: string }>("/auth/password-code/request", { method: "POST" });
      setCodeSent(true);
      setMessage("Đã gửi mã xác minh 6 số tới email của bạn. Mã có hiệu lực trong 15 phút.");
    } catch (reason) {
      setError(describe(reason, "Không gửi được mã xác minh"));
    } finally { setBusy(false); }
  }

  async function submit() {
    if (busy || !readyToSubmit) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (hasPassword) {
        await apiRequest<{ message: string }>("/auth/change-password", {
          method: "POST",
          body: { currentPassword, newPassword, confirmPassword },
        });
        setMessage("Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.");
      } else {
        await apiRequest<{ message: string }>("/auth/set-password", {
          method: "POST",
          body: { code, newPassword, confirmPassword },
        });
        setMessage("Đặt mật khẩu thành công. Từ giờ bạn có thể đăng nhập bằng email và mật khẩu này.");
      }
      collapse();
    } catch (reason) {
      setError(describe(reason, hasPassword ? "Không đổi được mật khẩu" : "Không đặt được mật khẩu"));
    } finally { setBusy(false); }
  }

  return <div className="mt-6 rounded-xl bg-muted/55 p-4">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="font-medium text-strong">{t(hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu")}</h3>
        <p className="mt-1 text-sm text-subtle">{t(hasPassword
          ? "Nhập mật khẩu hiện tại và mật khẩu mới. Các thiết bị khác sẽ bị đăng xuất."
          : "Bạn đang đăng nhập bằng Google nên chưa có mật khẩu. Xác minh mã gửi tới email rồi đặt mật khẩu để đăng nhập được bằng email và mật khẩu.")}</p>
      </div>
      <button type="button" onClick={() => (open ? collapse() : setOpen(true))} className="kg-secondary" aria-expanded={open}>
        {t(open ? "Đóng" : hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu")}
      </button>
    </div>

    {message && <p role="status" className="mt-4 text-sm text-body">{t(message)}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-warning">{t(error)}</p>}

    {open && <form className="mt-5 border-t border-line pt-5" onSubmit={event => { event.preventDefault(); void submit(); }}>
      {!hasPassword && <div className="mb-5 flex flex-wrap items-end gap-4">
        <Field label="Mã xác minh (6 số)"><input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={inputClass} disabled={busy} /></Field>
        <button type="button" onClick={() => void sendCode()} disabled={busy} className="kg-secondary mb-5">{t(codeSent ? "Gửi lại mã" : "Gửi mã xác minh")}</button>
      </div>}

      {hasPassword && <Field label="Mật khẩu hiện tại">
        <input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" className={inputClass} disabled={busy} required />
      </Field>}

      <Field label="Mật khẩu mới">
        <input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={72} className={inputClass} disabled={busy} required />
      </Field>
      <Field label="Xác nhận mật khẩu mới">
        <input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={72} className={inputClass} disabled={busy} required />
      </Field>

      {tooShort && <p role="alert" className="mb-5 text-sm text-warning">{t("Mật khẩu mới phải có ít nhất 8 ký tự.")}</p>}
      {mismatch && <p role="alert" className="mb-5 text-sm text-warning">{t("Hai mật khẩu không khớp.")}</p>}
      {sameAsCurrent && <p role="alert" className="mb-5 text-sm text-warning">{t("Mật khẩu mới phải khác mật khẩu hiện tại.")}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy || !readyToSubmit} className="kg-button">{t(busy ? "Đang lưu…" : hasPassword ? "Xác nhận đổi mật khẩu" : "Xác nhận đặt mật khẩu")}</button>
        <button type="button" onClick={collapse} disabled={busy} className="kg-secondary">{t("Huỷ")}</button>
      </div>
    </form>}
  </div>;
}
