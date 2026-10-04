"use client";
import { useLocale } from "@/components/locale";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell, Field, inputClass, primaryBtnClass } from "@/components/ui";

import { requestEmailVerification, verifyEmail } from "@/lib/auth";
import CodeStep from "@/components/auth/CodeStep";

type Step = 1 | 2;

/**
 * Recovery path for accounts created before verified registration existed
 * (`email_verified = false`): the emailed code plus a new password unlock the account.
 */
export default function VerifyEmailPage() {
  const { t } = useLocale();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onConfirmCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Mã phải đúng 6 chữ số");
      return;
    }
    setStep(2);
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setBusy(true);
    try {
      const msg = await verifyEmail(email.trim(), code.trim(), newPassword);
      setMessage(msg);
      setNewPassword("");
      setConfirmPassword("");
      setStep(1);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xác minh được email");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      setMessage(await requestEmailVerification(email.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được mã");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={t("Xác minh email")}
      subtitle={
        step === 1
          ? "Nhập mã 6 số đã gửi tới email của bạn."
          : "Nhập mã trong email và đặt mật khẩu mới."
      }
    >
      {message ? (
        <p className="mb-4 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-positive">
          {t(message)}{" "}
          <Link href="/login" className="underline">
            {t("về đăng nhập")}</Link>
        </p>
      ) : null}

      {step === 1 ? (
        <CodeStep
          email={email}
          code={code}
          onCodeChange={setCode}
          emailEditable
          onEmailChange={setEmail}
          error={error}
          busy={busy}
          submitLabel={t("Tiếp tục")}
          onSubmit={onConfirmCode}
          onResend={() => void resendCode()}
          resendBusy={busy}
          resendDisabled={!/^[^@\s]+@[^@\s]+$/.test(email.trim())}
        />
      ) : (
        <form onSubmit={onVerify} className="animate-fade-up-delay">
          <p className="mb-4 text-sm text-subtle">{t("Nhập mã trong email và đặt mật khẩu mới.")}</p>
          <Field label={t("Mật khẩu mới")}>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label={t("Nhập lại mật khẩu")}>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          {error ? (
            <p className="mb-4 text-sm text-warning" role="alert">
              {t(error)}
            </p>
          ) : null}
          <button type="submit" className={primaryBtnClass} disabled={busy}>
            {busy ? t("Đang lưu…") : t("Xác minh email")}
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-3 text-sm text-subtle">
        <Link href="/login" className="hover:text-warning">
          {t("← Quay lại đăng nhập")}</Link>
      </div>
    </AuthShell>
  );
}
