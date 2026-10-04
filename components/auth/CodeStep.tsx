"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Field, inputClass, primaryBtnClass } from "@/components/ui";
import { useLocale } from "@/components/locale";

export type CodeStepProps = {
  /** Email the code was sent to. Rendered read-only, or as an editable field when `emailEditable`. */
  email: string;
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Cho phép nhập email trong cùng bước (luồng `/verify-email` chưa tách bước email). */
  emailEditable?: boolean;
  onEmailChange?: (email: string) => void;
  emailLabel?: string;
  /** Thông báo thành công (ví dụ kết quả gửi mã) hiển thị phía trên ô nhập mã. */
  message?: string | null;
  error?: string | null;
  busy?: boolean;
  submitLabel: string;
  submitBusyLabel?: string;
  onResend?: () => void;
  resendBusy?: boolean;
  /** Điều kiện phụ của trang (ví dụ email chưa hợp lệ) để chặn "Gửi lại mã". */
  resendDisabled?: boolean;
  /** Số giây đếm ngược trước khi cho phép gửi lại. Mặc định 45. */
  resendCooldownSeconds?: number;
  backLabel?: string;
  onBack?: () => void;
};

/**
 * Bước nhập mã xác minh 6 số dùng chung cho đăng ký / quên mật khẩu / xác minh email.
 * Chỉ trình bày + đếm ngược gửi lại; mọi hành vi (endpoint, điều hướng, thông báo)
 * do trang gọi qua props giữ nguyên.
 */
export default function CodeStep({
  email, code, onCodeChange, onSubmit,
  emailEditable = false, onEmailChange, emailLabel,
  message, error, busy = false,
  submitLabel, submitBusyLabel,
  onResend, resendBusy = false, resendDisabled = false,
  resendCooldownSeconds = 45,
  backLabel, onBack,
}: CodeStepProps) {
  const { t } = useLocale();
  const [remaining, setRemaining] = useState(resendCooldownSeconds);

  useEffect(() => {
    setRemaining(resendCooldownSeconds);
    if (resendCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => setRemaining(value => (value <= 1 ? 0 : value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  const resendBlocked = busy || resendBusy || resendDisabled || remaining > 0;
  const resendLabel = remaining > 0
    ? `Gửi lại mã sau ${remaining}s`
    : resendBusy ? t("Đang gửi…") : t("Gửi lại mã");

  function handleResend() {
    if (resendBlocked || !onResend) return;
    setRemaining(resendCooldownSeconds);
    onResend();
  }

  return <form onSubmit={onSubmit} className="animate-fade-up-delay">
    {message ? <p className="mb-4 text-sm text-subtle">{t(message)}</p> : null}
    {emailEditable ? (
      <Field label={emailLabel ?? "Email"}>
        <input
          className={inputClass}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={event => onEmailChange?.(event.target.value)}
        />
      </Field>
    ) : (
      <p className="mb-4 text-sm text-subtle">
        Mã đã gửi tới <span className="break-all font-medium text-strong">{email}</span>
      </p>
    )}
    <Field label={t("Mã 6 số")}>
      <input
        className={inputClass}
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        required
        autoComplete="one-time-code"
        value={code}
        onChange={event => onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      />
    </Field>
    {error ? (
      <p className="mb-4 text-sm text-warning" role="alert">
        {t(error)}
      </p>
    ) : null}
    <button type="submit" className={primaryBtnClass} disabled={busy}>
      {busy ? (submitBusyLabel ?? submitLabel) : submitLabel}
    </button>
    {(onResend || onBack) ? (
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        {onResend ? (
          <button
            type="button"
            className="text-positive underline underline-offset-4 hover:text-strong disabled:opacity-60"
            disabled={resendBlocked}
            onClick={handleResend}
          >
            {resendLabel}
          </button>
        ) : null}
        {onBack ? (
          <button
            type="button"
            className="text-subtle underline underline-offset-4 hover:text-strong"
            disabled={busy}
            onClick={onBack}
          >
            {backLabel ?? t("Đổi email")}
          </button>
        ) : null}
      </div>
    ) : null}
  </form>;
}
