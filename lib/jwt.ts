/**
 * Đọc hạn của access JWT ở phía client.
 *
 * KHÔNG verify chữ ký (secret chỉ nằm ở BE) — mục đích duy nhất là để FE biết token trong bộ nhớ
 * đã hết hạn hay chưa, thay vì coi "có token" = "đã đăng nhập". Server vẫn là nơi quyết định cuối cùng.
 */

export type JwtPayload = {
  sub?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return payload && typeof payload === "object" ? (payload as JwtPayload) : null;
  } catch {
    return null;
  }
}

/**
 * `true` khi token chắc chắn hết hạn (hoặc hết hạn trong `skewSeconds` tới — refresh sớm để tránh
 * request rơi đúng lúc hết hạn).
 *
 * Token rỗng/opaque/không có `exp` → `false`: không kết luận hết hạn, cứ để server trả 401.
 */
export function isJwtExpired(token: string | null | undefined, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
