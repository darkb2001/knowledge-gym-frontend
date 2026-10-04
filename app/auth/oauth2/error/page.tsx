"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell, primaryBtnClass } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { startGoogleLogin } from "@/lib/auth";

export default function OAuthErrorPage() {
  const { t } = useLocale();
  // `?reason=` do OAuth2FailureHandler gắn vào (thường là authorization_request_not_found khi
  // phiên state/PKCE đã hết hạn hoặc bị dùng lại). Đọc sau khi mount nên không cần Suspense.
  const [expired, setExpired] = useState(false);
  useEffect(() => setExpired(new URLSearchParams(window.location.search).has("reason")), []);
  const message = expired
    ? t("Phiên đăng nhập Google đã hết hạn hoặc đã được dùng. Hãy bắt đầu lại.")
    : t("Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.");
  return (
    <AuthShell title={t("Đăng nhập thất bại")} subtitle={message}>
      <button type="button" className={primaryBtnClass} onClick={() => startGoogleLogin()}>
        {t("Thử lại")}
      </button>
      <p className="mt-3 text-center text-sm">
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          {t("Đăng nhập")}
        </Link>
      </p>
    </AuthShell>
  );
}
