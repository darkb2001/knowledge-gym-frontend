import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath, loginRedirectTarget } from "./lib/route-guard";
import { SESSION_MARKER } from "./lib/session-marker";

/**
 * Cổng chặn tầng server cho các trang nội bộ.
 *
 * Vì sao cần: `RequireAuth` chỉ chạy sau khi bundle đã tải ⇒ người chưa đăng nhập vẫn thấy khung app
 * (rồi bị đá đi). Middleware chạy trước khi render nên chặn sớm hơn.
 *
 * Căn cứ để cho qua là cookie marker first-party `kg_session` (FE ghi sau mỗi lần xác thực thành
 * công — xem `lib/session-marker.ts`). Cookie này KHÔNG cấp quyền: dữ liệu vẫn do API quyết định
 * bằng access token; thiếu marker ⇒ chuyển hướng `/login?next=…`. Vì vậy một cookie giả chỉ mở được
 * khung trang rỗng, không mở được dữ liệu.
 */

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  if (request.cookies.get(SESSION_MARKER)?.value === "1") return NextResponse.next();

  return NextResponse.redirect(
    new URL(loginRedirectTarget(pathname, search), request.nextUrl.origin),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|txt|xml|json|woff|woff2)$).*)",
  ],
};
