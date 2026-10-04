"use client";
import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AuthShell,
  Field,
  ghostBtnClass,
  inputClass,
  primaryBtnClass,
} from "@/components/ui";
import { ApiError, ensureAccessToken, hasUsableAccessToken } from "@/lib/api-client";
import { login, startGoogleLogin, verifySession } from "@/lib/auth";

/**
 * `?next=` do middleware gắn khi chặn trang nội bộ. Chỉ nhận đường dẫn nội bộ
 * (bắt đầu bằng "/" và không phải "//host") để không thành open redirect.
 */
function safeNextPath(): string {
  if (typeof window === "undefined") return "/learn";
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/learn";
  return raw;
}

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Còn phiên hợp lệ (refresh cookie + marker) thì không bắt đăng nhập lại: vào thẳng trang đích.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshed = await ensureAccessToken();
        if (!refreshed || !hasUsableAccessToken()) return;
        await verifySession();
        if (!cancelled) router.replace(safeNextPath());
      } catch {
        // Chưa đăng nhập / mạng lỗi → ở lại form, không báo lỗi.
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(safeNextPath());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("Đăng nhập")} subtitle={t("Tiếp tục buổi tập với tài khoản của bạn.")}>
      <form onSubmit={onSubmit} className="animate-fade-up-delay">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? (
          <p className="mb-4 text-sm text-warning" role="alert">
            {t(error)}
          </p>
        ) : null}
        {error === "Email verification required" ? (
          <p className="mb-4 text-sm text-subtle">
            <Link href="/verify-email" className="text-positive underline underline-offset-4 hover:text-strong">
              {t("Xác minh email")}</Link>
          </p>
        ) : null}
        <button type="submit" className={primaryBtnClass} disabled={busy}>
          {busy ? t("Đang vào…") : t("Vào phòng tập")}
        </button>
      </form>

      <button type="button" className={`${ghostBtnClass} mt-3`} onClick={startGoogleLogin}>
        {t("Tiếp tục với Google")}</button>

      <div className="mt-6 flex flex-col gap-2 text-sm text-subtle">
        <Link href="/verify-email" className="hover:text-positive">
          {t("Xác minh email")}</Link>
        <Link href="/forgot-password" className="hover:text-warning">
          {t("Quên mật khẩu?")}</Link>
        <p>
          {t("Chưa có tài khoản?")}{" "}
          <Link href="/register" className="text-positive underline underline-offset-4 hover:text-strong">
            {t("Đăng ký")}</Link>
        </p>
      </div>
    </AuthShell>
  );
}
