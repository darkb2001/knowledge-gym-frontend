/**
 * Quyết định route nào cần đăng nhập — dùng chung cho `middleware.ts` (chặn ở tầng server) và test.
 *
 * Tách khỏi middleware để test được logic đường dẫn mà không phải dựng môi trường Next.
 */

/** Route công khai: blog đọc tự do + toàn bộ luồng xác thực (đăng nhập/đăng ký/OAuth2). */
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
 * Lưu lại `pathname + search` vào `?next=` để sau khi đăng nhập quay về đúng chỗ. Trang chủ `/` không
 * cần `next` (nó vốn tự chuyển tới `/learn`), còn lại luôn là đường dẫn nội bộ do server sinh.
 */
export function loginRedirectTarget(pathname: string, search = ""): string {
  if (pathname === "/" || pathname === "") return "/login";
  return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
}
