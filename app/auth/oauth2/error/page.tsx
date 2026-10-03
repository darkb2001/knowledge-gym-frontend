"use client";

import Link from "next/link";
import { AuthShell, primaryBtnClass } from "@/components/ui";
import { useLocale } from "@/components/locale";

export default function OAuthErrorPage() {
  const { t } = useLocale();
  return (
    <AuthShell title={t("Đăng nhập thất bại")} subtitle={t("Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.")}>
      <p role="alert" className="mb-4 text-sm text-warning">
        {t("Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.")}
      </p>
      <Link href="/login" className={primaryBtnClass}>{t("Đăng nhập")}</Link>
    </AuthShell>
  );
}
