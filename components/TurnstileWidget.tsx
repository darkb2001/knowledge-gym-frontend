"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/components/locale";
import { TURNSTILE_SITE_KEY, loadTurnstileScript, turnstileEnabled, type TurnstileApi } from "@/lib/turnstile";

export interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  /** Đổi giá trị ⇒ xoá widget cũ và render lại (token Turnstile chỉ dùng được một lần). */
  resetSignal?: number;
  action?: string;
  className?: string;
}

/**
 * Widget Turnstile render ở chế độ `explicit`.
 *
 * `onToken` giữ trong ref: component cha thường truyền arrow function mới mỗi render, đưa vào deps
 * sẽ remove/render lại widget liên tục ⇒ token bị xoá giữa lúc người dùng đang bấm gửi.
 */
export function TurnstileWidget({ onToken, resetSignal = 0, action, className }: TurnstileWidgetProps) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const callbackRef = useRef(onToken);
  callbackRef.current = onToken;

  useEffect(() => {
    if (!turnstileEnabled()) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        const api: TurnstileApi | undefined = window.turnstile;
        if (cancelled || !api || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: "auto",
          callback: (token: string) => callbackRef.current(token),
          "expired-callback": () => {
            setFailed(false);
            callbackRef.current(null);
          },
          // Trình chặn quảng cáo/mạng chặn challenges.cloudflare.com ⇒ nút gửi bị disable mà
          // không rõ lý do. Hiện thông báo để người dùng biết phải làm gì.
          "error-callback": () => {
            setFailed(true);
            callbackRef.current(null);
          },
        });
        setFailed(false);
      })
      .catch(() => {
        setFailed(true);
        callbackRef.current(null);
      });
    return () => {
      cancelled = true;
      const api: TurnstileApi | undefined = window.turnstile;
      if (api && widgetIdRef.current) {
        try {
          api.remove(widgetIdRef.current);
        } catch {
          /* widget đã bị gỡ cùng DOM */
        }
      }
      widgetIdRef.current = null;
    };
  }, [action, resetSignal]);

  if (!turnstileEnabled()) return null;
  return (
    <div className="mb-4">
      <div ref={containerRef} className={className} data-testid="turnstile-widget" />
      {failed ? (
        <p className="mt-2 text-sm text-warning" role="alert">
          {t("Không tải được phần xác minh chống bot. Hãy tắt trình chặn quảng cáo cho trang này rồi tải lại.")}
        </p>
      ) : null}
    </div>
  );
}

export interface UseTurnstileResult {
  /** Widget đang bật (có site key) ⇒ form nên chặn gửi khi chưa có token. */
  enabled: boolean;
  token: string | null;
  /** Gọi sau mỗi lần gửi thất bại: token cũ đã bị Cloudflare tiêu thụ. */
  reset: () => void;
  widget: ReactNode;
}

/** Gói state token + widget để các form chỉ cần một dòng. */
export function useTurnstile(action?: string): UseTurnstileResult {
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const reset = useCallback(() => {
    setToken(null);
    setResetSignal((n) => n + 1);
  }, []);
  const widget = <TurnstileWidget onToken={setToken} resetSignal={resetSignal} action={action} />;
  return { enabled: turnstileEnabled(), token, reset, widget };
}
