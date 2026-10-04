"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell, primaryBtnClass } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { startGoogleLogin } from "@/lib/auth";
import { oauthRecovery } from "@/lib/oauth-error";

export default function OAuthErrorPage() {
  const { t } = useLocale();
  // `?reason=` do BE gắn vào (OAuth2FailureHandler hoặc OAuth2SuccessHandler). Đọc sau khi mount
  // nên không cần Suspense.
  const [reason, setReason] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setReason(new URLSearchParams(window.location.search).get("reason"));
    setLoaded(true);
  }, []);
  const recovery = oauthRecovery(reason);
  const message = t(recovery.message);
  return (
    <AuthShell title={t("Đăng nhập thất bại")} subtitle={loaded ? message : ""}>
      {loaded && recovery.retryGoogle ? (
        <button type="button" className={primaryBtnClass} onClick={() => startGoogleLogin()}>
          {t("Thử lại")}
        </button>
      ) : null}
      {loaded && !recovery.retryGoogle ? (
        <Link href="/login" className={primaryBtnClass}>
          {t("Đăng nhập bằng email và mật khẩu")}
        </Link>
      ) : null}
      <p className="mt-3 text-center text-sm">
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          {t("Đăng nhập")}
        </Link>
      </p>
    </AuthShell>
  );
}
