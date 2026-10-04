"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale";
import { MOTION_KEY, readMotion, validMotion, type MotionPreference } from "@/lib/motion";

/**
 * Điện thoại có bật "Giảm chuyển động" (iOS: Cài đặt → Trợ năng → Chuyển động) sẽ tắt mọi
 * animation của trang. Nút này cho người dùng tự chọn bật hiệu ứng cho thiết bị đang dùng.
 */
export default function MotionToggle() {
  const { t } = useLocale();
  const [preference, setPreference] = useState<MotionPreference>("auto");
  const [systemReduces, setSystemReduces] = useState(false);

  useEffect(() => {
    setPreference(readMotion(window.localStorage));
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduces(query.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemReduces(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function choose(next: MotionPreference) {
    const value = validMotion(next);
    setPreference(value);
    try {
      if (value === "on") {
        window.localStorage.setItem(MOTION_KEY, "on");
        document.documentElement.dataset.motion = "on";
      } else {
        window.localStorage.removeItem(MOTION_KEY);
        delete document.documentElement.dataset.motion;
      }
    } catch {
      // Trình duyệt chặn localStorage: vẫn đổi được cho phiên hiện tại.
      if (value === "on") document.documentElement.dataset.motion = "on";
      else delete document.documentElement.dataset.motion;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("Hiệu ứng động")}>
        {(["auto", "on"] as const).map((value) => {
          const active = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(value)}
              className={`min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors ${active ? "border-accent bg-accent-soft text-strong" : "border-line text-subtle hover:text-strong"}`}
            >
              {t(value === "auto" ? "Theo hệ thống" : "Luôn bật")}
            </button>
          );
        })}
      </div>
      {systemReduces && preference === "auto" && (
        <p className="text-sm text-warning">{t("Thiết bị này đang bật Giảm chuyển động nên hiệu ứng bị tắt. Chọn “Luôn bật” nếu bạn muốn xem hiệu ứng.")}</p>
      )}
      <p className="text-sm text-subtle">{t("Lựa chọn này chỉ áp dụng cho thiết bị đang dùng.")}</p>
    </div>
  );
}
