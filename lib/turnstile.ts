/**
 * Cloudflare Turnstile — lớp chống bot cho các form "gửi mail / tạo tài khoản".
 *
 * Site key là **public** (nhúng vào HTML) nên để mặc định trong code cũng an toàn; vẫn cho phép
 * override bằng `NEXT_PUBLIC_TURNSTILE_SITE_KEY` khi build trên Vercel.
 * Secret key nằm ở BE (`TURNSTILE_SECRET` trong `/opt/kg/.env`) và không bao giờ xuống browser.
 */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFOW1ih-x8AI-rdu";

export const TURNSTILE_HEADER = "X-Turnstile-Token";

export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __kgTurnstileLoading?: Promise<void>;
  }
}

/** Bật widget khi có site key. Rỗng ⇒ tắt hẳn (dev/test, hoặc khi chưa cấu hình). */
export function turnstileEnabled(): boolean {
  return TURNSTILE_SITE_KEY.trim().length > 0;
}

/** Header gửi kèm request. Không có token ⇒ không gửi header (BE tự quyết định có bắt buộc hay không). */
export function turnstileHeaders(token?: string | null): Record<string, string> {
  return token && token.trim().length > 0 ? { [TURNSTILE_HEADER]: token } : {};
}

/**
 * Dạng spread cho options của `apiRequest`: có token mới thêm `headers`, không thì object rỗng —
 * nhờ vậy request không mang header thừa và không phải sửa mọi call site thành hai nhánh.
 */
export function turnstileOption(token?: string | null): { headers?: Record<string, string> } {
  const headers = turnstileHeaders(token);
  return Object.keys(headers).length > 0 ? { headers } : {};
}

/**
 * Nạp script Turnstile đúng một lần cho cả app (`render=explicit` nên không tự quét DOM).
 * Giữ promise trong `window` để nhiều component gọi song song không chèn nhiều thẻ script.
 */
export function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined" || !turnstileEnabled()) return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__kgTurnstileLoading) return window.__kgTurnstileLoading;
  const loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-kg-turnstile]`);
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.kgTurnstile = "true";
    }
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Không tải được Turnstile")));
    if (!existing) document.head.appendChild(script);
  });
  window.__kgTurnstileLoading = loading;
  return loading;
}
