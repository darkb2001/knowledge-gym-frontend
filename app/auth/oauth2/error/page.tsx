"use client";

import Link from "next/link";
import { AuthShell, primaryBtnClass } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { startGoogleLogin } from "@/lib/auth";

export default function OAuthErrorPage() {
  const { t } = useLocale();
  const message = t("Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.");
  return (
    <AuthShell title={t("Đăng nhập thất bại")} subtitle={message}>
      <p role="alert" className="mb-4 text-sm text-warning">
        {message}
      </p>
      <button type="button" className={primaryBtnClass} onClick={() => startGoogleLogin()}>
        {t("Thử lại")}
      </button>
      <p className="mt-3 text-center text-sm">
        <Link href="/login" className="text-muted underline">
          {t("Đăng nhập")}
        </Link>
      </p>
    </AuthShell>
  );
}
