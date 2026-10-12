/**
 * Quyết định route nào cần đăng nhập — dùng chung cho `middleware.ts` (chặn ở tầng server) và test.
 *
 * Tách khỏi middleware để test được logic đường dẫn mà không phải dựng môi trường Next.
 */

/** Prefix công khai: blog đọc tự do + luồng xác thực. Landing chỉ mở đúng đường dẫn `/`. */
export const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/auth",
  "/blog",
  "/feed.xml",
] as const;

/**
 * Phần mở rộng của tài sản tĩnh. Nhạc nền lofi nằm trong `public/lofi` nên phải đi qua cổng chặn
 * mà không bị chuyển hướng về `/login` — nếu không, trình phát nhận 307 và im lặng.
 */
const STATIC_EXTENSIONS = [
  "png", "jpg", "jpeg", "svg", "webp", "avif", "gif", "ico", "css", "js", "map",
  "txt", "xml", "json", "webmanifest", "woff", "woff2", "ttf",
  "mp3", "m4a", "ogg", "oga", "opus", "wav", "flac", "mp4", "webm",
] as const;

export function isStaticAssetPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  const slash = pathname.lastIndexOf("/");
  const dot = pathname.lastIndexOf(".");
  if (dot <= slash) return false;
  return (STATIC_EXTENSIONS as readonly string[]).includes(pathname.slice(dot + 1).toLowerCase());
}

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function requiresAuth(pathname: string): boolean {
  return !isPublicPath(pathname);
}

/**
 * Đích chuyển hướng khi thiếu phiên.
 *
 * Lưu lại `pathname + search` vào `?next=` để sau khi đăng nhập quay về đúng chỗ.
 * Landing `/` công khai không cần redirect; nhánh root được giữ cho các caller cũ.
 */
export function loginRedirectTarget(pathname: string, search = ""): string {
  if (pathname === "/" || pathname === "") return "/login";
  return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
}
