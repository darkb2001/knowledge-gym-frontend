import { apiRequest } from "@/lib/api-client";

/** Một phiên đăng nhập = một refresh-token family = một thiết bị/trình duyệt (backend `/auth/sessions`). */
export type SessionInfo = {
  familyId: string;
  createdAt: string;
  lastSeenAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  /** true cho phiên đang mở trang này. */
  current: boolean;
};

export function listSessions(signal?: AbortSignal): Promise<SessionInfo[]> {
  return apiRequest<SessionInfo[]>("/auth/sessions", { signal });
}

/** Đăng xuất một thiết bị. `current: true` nghĩa là vừa đăng xuất chính thiết bị đang dùng. */
export function revokeSession(familyId: string): Promise<{ message: string; current: boolean }> {
  return apiRequest<{ message: string; current: boolean }>(
    `/auth/sessions/${encodeURIComponent(familyId)}`,
    { method: "DELETE" },
  );
}

/** Đăng xuất mọi thiết bị khác, giữ phiên đang dùng. */
export function revokeOtherSessions(): Promise<{ revoked: number; message: string }> {
  return apiRequest<{ revoked: number; message: string }>("/auth/sessions", { method: "DELETE" });
}

/** Tên thiết bị/trình duyệt từ User-Agent. Chỉ trả mã ASCII, câu chữ hiển thị do tầng UI dịch. */
export function describeClient(userAgent: string | null | undefined): { device: string; browser: string } {
  const ua = (userAgent ?? "").trim();
  if (!ua) return { device: "unknown", browser: "unknown" };
  const device =
    /iphone/i.test(ua) ? "iPhone"
      : /ipad/i.test(ua) ? "iPad"
        : /android/i.test(ua) ? (/mobile/i.test(ua) ? "Android" : "Android tablet")
          : /windows/i.test(ua) ? "Windows"
            : /macintosh|mac os x/i.test(ua) ? "macOS"
              : /linux/i.test(ua) ? "Linux"
                : "unknown";
  const browser =
    /edg\//i.test(ua) ? "Edge"
      : /opr\//i.test(ua) ? "Opera"
        : /chrome|crios/i.test(ua) ? "Chrome"
          : /firefox|fxios/i.test(ua) ? "Firefox"
            : /safari/i.test(ua) ? "Safari"
              : "unknown";
  return { device, browser };
}

/** Thời điểm dùng gần nhất ở dạng đọc được; trả null nếu mốc thời gian không hợp lệ. */
export function formatSeenAt(iso: string, localeTagName: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleString(localeTagName, { dateStyle: "short", timeStyle: "short" });
}
