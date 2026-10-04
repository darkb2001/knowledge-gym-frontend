"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell, primaryBtnClass } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { applyOAuthHash, startGoogleLogin, storeUser, verifySession } from "@/lib/auth";
import { acceptOAuthCallbackSession, ensureAccessToken } from "@/lib/api-client";

const FAILURE_MESSAGE = "Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.";

/**
 * OAuth2SuccessHandler redirects here with
 * `?oauth=google#accessToken=...&userId=...&role=...&provider=google`
 * Hash is never sent to the server — read client-side only.
 *
 * Hai đường nhận phiên:
 * 1. fragment `#accessToken=…` — nhanh, không cần round-trip;
 * 2. refresh cookie HttpOnly — BE đã ghi cookie trước khi redirect, nên khi fragment bị cắt
 *    trên đường đi (proxy/edge) thì login vẫn hoàn tất thay vì ngõ cụt "thiếu accessToken".
 */
export default function OAuthSuccessPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const arrivedWithOAuth = new URLSearchParams(window.location.search).has("oauth");
    const hash = window.location.hash;
    // Token không được nằm lại trong history/deep-link.
    if (hash || window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    // Backend hash only carries userId/role — email/displayName filled when /users/me exists.
    const enterApp = async () => {
      try {
        await verifySession();
      } catch {
        /* Header sẽ tự nạp lại; token đã hợp lệ nên vẫn cho vào app. */
      }
      if (!cancelled) router.replace("/learn");
    };

    const complete = async () => {
      const parsed = (() => {
        try {
          return applyOAuthHash(hash);
        } catch {
          return null;
        }
      })();
      if (parsed) {
        storeUser({ id: parsed.userId, email: "", displayName: "Google", role: parsed.role });
        await enterApp();
        return;
      }
      if (!arrivedWithOAuth) {
        if (!cancelled) setFailed(true);
        return;
      }
      // Fragment không tới được FE ⇒ đổi refresh cookie của phiên vừa tạo lấy access token.
      acceptOAuthCallbackSession();
      let tokenReady = false;
      try {
        tokenReady = await ensureAccessToken();
      } catch {
        tokenReady = false;
      }
      if (cancelled) return;
      if (!tokenReady) {
        setFailed(true);
        return;
      }
      await enterApp();
    };

    void complete();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AuthShell title={t("Google")} subtitle={failed ? t(FAILURE_MESSAGE) : t("Đang hoàn tất đăng nhập…")}>
      {failed ? (
        <div className="space-y-3">
          <button type="button" className={primaryBtnClass} onClick={() => startGoogleLogin()}>
            {t("Thử lại")}
          </button>
          <p className="text-center text-sm">
            <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
              {t("Đăng nhập")}
            </Link>
          </p>
        </div>
      ) : (
        <p className="animate-soft-pulse text-body">{t("Nhận token…")}</p>
      )}
    </AuthShell>
  );
}
