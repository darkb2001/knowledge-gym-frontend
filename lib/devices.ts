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

/**
 * Nhiều phiên cùng một thiết bị (cùng User-Agent) gom thành một dòng, để người dùng không phải nhìn
 * hàng loạt nút "Đăng xuất" giống nhau: mỗi lần đăng nhập lại trên cùng trình duyệt = thêm một phiên.
 */
export type SessionGroup = {
  /** User-Agent đã chuẩn hoá — khoá gom nhóm (rỗng ⇒ "unknown"). */
  key: string;
  device: string;
  browser: string;
  /** Các phiên trong nhóm, mới nhất trước. */
  sessions: SessionInfo[];
  /** Lần đăng nhập đầu tiên của nhóm. */
  firstSeenAt: string;
  /** Lần hoạt động gần nhất của nhóm. */
  lastSeenAt: string;
  /** IP gần nhất ghi nhận được (null nếu mọi phiên đều thiếu). */
  ipAddress: string | null;
  /** Nhóm có chứa phiên đang mở trang này. */
  current: boolean;
  /** Số phiên chưa từng được dùng để lấy access token mới (mốc tạo ≈ mốc hoạt động). */
  unusedCount: number;
};

/** Khoá gom nhóm của một phiên; thiếu User-Agent thì gom chung vào một nhóm "unknown". */
export function deviceKey(userAgent: string | null | undefined): string {
  const ua = (userAgent ?? "").trim();
  return ua === "" ? "unknown" : ua;
}

function ms(iso: string | null | undefined): number {
  const value = Date.parse(iso ?? "");
  return Number.isFinite(value) ? value : 0;
}

/** Phiên chưa từng rotate: mốc tạo và mốc hoạt động coi như trùng nhau. */
function looksUnused(session: SessionInfo): boolean {
  return Math.abs(ms(session.lastSeenAt) - ms(session.createdAt)) < 60_000;
}

/**
 * Gom phiên theo thiết bị (User-Agent): nhóm sắp theo lần hoạt động gần nhất, phiên trong nhóm cũng
 * vậy. Một bản trình duyệt cập nhật sẽ đổi User-Agent và tách thành nhóm mới — chấp nhận được, vì hệ
 * quả chỉ là thêm một dòng chứ không mất hay lộ phiên nào.
 */
export function groupSessions(sessions: SessionInfo[] | null | undefined): SessionGroup[] {
  const buckets = new Map<string, SessionInfo[]>();
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const key = deviceKey(session.userAgent);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(session);
    else buckets.set(key, [session]);
  }

  return [...buckets.entries()]
    .map(([key, members]) => {
      const ordered = [...members].sort((a, b) => ms(b.lastSeenAt) - ms(a.lastSeenAt));
      const first = [...members].sort((a, b) => ms(a.createdAt) - ms(b.createdAt))[0];
      const latest = ordered[0];
      const client = describeClient(latest.userAgent);
      const group: SessionGroup = {
        key,
        device: client.device,
        browser: client.browser,
        sessions: ordered,
        firstSeenAt: first.createdAt,
        lastSeenAt: latest.lastSeenAt,
        ipAddress: ordered.find(session => session.ipAddress)?.ipAddress ?? null,
        current: members.some(session => session.current),
        unusedCount: members.filter(looksUnused).length,
      };
      return group;
    })
    .sort((a, b) => ms(b.lastSeenAt) - ms(a.lastSeenAt));
}

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
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) return null;
  return new Date(value).toLocaleString(localeTagName, { dateStyle: "short", timeStyle: "short" });
}
