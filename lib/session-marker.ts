/**
 * Marker phiên first-party cho middleware.
 *
 * Refresh token là cookie HttpOnly gắn host API (api.darkb-tech.io.vn) nên KHÔNG đọc được từ
 * app.darkb-tech.io.vn ⇒ middleware không thể tự kiểm tra phiên. Vì vậy FE ghi thêm một cookie
 * cờ (không chứa gì bí mật) sau mỗi lần xác thực thành công:
 * - thiếu cờ ⇒ middleware chặn ở tầng server, không render trang nội bộ;
 * - có cờ ⇒ vào app, quyền truy cập dữ liệu vẫn do API quyết định (401/403).
 */

export const SESSION_MARKER = "kg_session";

/** Khớp TTL refresh token (7 ngày). */
const MAX_AGE_SECONDS = 7 * 24 * 3600;

function write(value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_MARKER}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function markSessionAlive(): void {
  write("1", MAX_AGE_SECONDS);
}

export function clearSessionMarker(): void {
  write("", 0);
}

export function hasSessionMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${SESSION_MARKER}=1`);
}
