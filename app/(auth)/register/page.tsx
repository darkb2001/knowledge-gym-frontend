"use client";
import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuthShell,
  Field,
  ghostBtnClass,
  inputClass,
  primaryBtnClass,
} from "@/components/ui";
import { ApiError } from "@/lib/api-client";
import { register, requestEmailVerification, startGoogleLogin } from "@/lib/auth";
import CodeStep from "@/components/auth/CodeStep";

type Step = 1 | 2;

export default function RegisterPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(): Promise<boolean> {
    setError(null);
    setMessage(null);
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return false;
    }
    setBusy(true);
    try {
      setMessage(await requestEmailVerification(email.trim()));
      setStep(2);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không gửi được mã");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onRequestCode(e: FormEvent) {
    e.preventDefault();
    void sendCode();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Mã phải đúng 6 chữ số");
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim(), confirmPassword, code.trim());
      router.replace("/learn");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng ký thất bại");
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    step === 1
      ? "Email + mật khẩu ít nhất 8 ký tự."
      : "Nhập mã 6 số đã gửi tới email của bạn.";

  return (
    <AuthShell title={t("Tạo tài khoản")} subtitle={t(subtitle)}>
      {step === 1 ? (
        <form onSubmit={onRequestCode} className="animate-fade-up-delay">
          <Field label={t("Tên hiển thị")}>
            <input
              className={inputClass}
              required
              maxLength={100}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label={t("Email")}>
            <input
              className={inputClass}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t("Mật khẩu")}>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {busy ? t("Đang gửi…") : t("Gửi mã xác minh")}
          </button>
        </form>
      ) : (
        <CodeStep
          email={email}
          code={code}
          onCodeChange={setCode}
          message={message}
          error={error}
          busy={busy}
          submitLabel={t("Đăng ký")}
          submitBusyLabel={t("Đang tạo…")}
          onSubmit={onSubmit}
          onResend={() => void sendCode()}
          resendBusy={busy}
          backLabel={t("Đổi email")}
          onBack={() => {
            setStep(1);
            setError(null);
          }}
        />
      )}

      <button type="button" className={`${ghostBtnClass} mt-3`} onClick={startGoogleLogin}>
        {t("Đăng ký với Google")}</button>

      <p className="mt-6 text-sm text-subtle">
        {t("Đã có tài khoản?")}{" "}
        <Link href="/login" className="text-positive underline underline-offset-4 hover:text-strong">
          {t("Đăng nhập")}</Link>
      </p>
      <p className="mt-2 text-sm text-subtle">
        {t("Đã có tài khoản chưa xác minh?")}{" "}
        <Link href="/verify-email" className="text-positive underline underline-offset-4 hover:text-strong">
          {t("Xác minh email")}</Link>
      </p>
    </AuthShell>
  );
}
