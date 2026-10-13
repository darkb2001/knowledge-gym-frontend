import { describe, expect, it } from "vitest";
import { describeClient, deviceKey, formatSeenAt, groupSessions, type SessionInfo } from "@/lib/devices";

/**
 * Quản lý thiết bị: phần hiển thị phải suy ra đúng từ User-Agent của từng phiên, nếu không
 * người dùng sẽ thấy "Không xác định được thiết bị" cho máy của chính mình.
 */
describe("describeClient", () => {
  it("nhận ra iPhone/Safari", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
    expect(describeClient(ua)).toEqual({ device: "iPhone", browser: "Safari" });
  });

  it("nhận ra máy tính Windows/Chrome", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
    expect(describeClient(ua)).toEqual({ device: "Windows", browser: "Chrome" });
  });

  it("phân biệt Android điện thoại với Android tablet", () => {
    expect(describeClient("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari/537.36").device).toBe("Android");
    expect(describeClient("Mozilla/5.0 (Linux; Android 15; SM-X710) Safari/537.36").device).toBe("Android tablet");
  });

  it("Chrome trên iOS (CriOS) không bị nhận nhầm thành Safari", () => {
    expect(describeClient("Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) CriOS/141.0 Mobile/15E148 Safari/604.1").browser).toBe("Chrome");
  });

  it("trả về unknown khi thiếu User-Agent", () => {
    expect(describeClient(null)).toEqual({ device: "unknown", browser: "unknown" });
    expect(describeClient("")).toEqual({ device: "unknown", browser: "unknown" });
  });
});

describe("groupSessions", () => {
  const iPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
  const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

  const session = (
    familyId: string,
    userAgent: string | null,
    createdAt: string,
    over: Partial<SessionInfo> = {},
  ): SessionInfo => ({ familyId, userAgent, createdAt, lastSeenAt: createdAt, ipAddress: null, current: false, ...over });

  it("gom nhiều lần đăng nhập trên cùng một User-Agent thành một dòng", () => {
    const groups = groupSessions([
      session("a", iPhone, "2026-10-13T07:01:46Z", { lastSeenAt: "2026-10-13T07:01:46Z", ipAddress: "27.65.56.117" }),
      session("b", iPhone, "2026-10-13T07:03:14Z", { lastSeenAt: "2026-10-13T07:09:00Z", ipAddress: "27.65.56.118" }),
      session("c", iPhone, "2026-10-13T07:07:11Z", { current: true }),
      session("d", windows, "2026-10-12T10:00:00Z", { lastSeenAt: "2026-10-12T10:05:00Z" }),
    ]);

    expect(groups.map(group => group.sessions.length)).toEqual([3, 1]);
    expect(groups[0].device).toBe("iPhone");
    expect(groups[0].browser).toBe("Safari");
    expect(groups[0].current).toBe(true);
    // 2 phiên chưa từng rotate, phiên "b" đã dùng lại sau 4 phút nên không tính.
    expect(groups[0].unusedCount).toBe(2);
    expect(groups[0].firstSeenAt).toBe("2026-10-13T07:01:46Z");
    expect(groups[0].lastSeenAt).toBe("2026-10-13T07:09:00Z");
    expect(groups[0].ipAddress).toBe("27.65.56.118");
    expect(groups[0].sessions.map(item => item.familyId)).toEqual(["b", "c", "a"]);
    expect(groups[1].current).toBe(false);
  });

  it("sắp nhóm theo lần hoạt động gần nhất và giữ riêng thiết bị khác nhau", () => {
    const groups = groupSessions([
      session("old", windows, "2026-10-01T08:00:00Z"),
      session("new", iPhone, "2026-10-13T07:00:00Z"),
    ]);
    expect(groups.map(group => group.current)).toEqual([false, false]);
    expect(groups.map(group => group.sessions[0].familyId)).toEqual(["new", "old"]);
    expect(new Set(groups.map(group => group.key)).size).toBe(2);
  });

  it("gom phiên thiếu User-Agent vào một nhóm unknown duy nhất", () => {
    const groups = groupSessions([
      session("a", null, "2026-10-13T07:00:00Z"),
      session("b", "   ", "2026-10-13T07:01:00Z"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("unknown");
    expect(groups[0].device).toBe("unknown");
    expect(groups[0].sessions).toHaveLength(2);
    expect(deviceKey(null)).toBe("unknown");
  });

  it("không vỡ khi thiếu dữ liệu hoặc mốc thời gian hỏng", () => {
    expect(groupSessions(null)).toEqual([]);
    expect(groupSessions(undefined)).toEqual([]);
    const groups = groupSessions([session("a", iPhone, "not-a-date", { lastSeenAt: "also-bad" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].sessions).toHaveLength(1);
  });
});

describe("formatSeenAt", () => {
  it("định dạng được mốc thời gian ISO", () => {
    expect(formatSeenAt("2026-10-04T17:12:00Z", "vi-VN")).toBeTruthy();
  });

  it("trả null khi mốc thời gian hỏng (không hiện Invalid Date)", () => {
    expect(formatSeenAt("not-a-date", "vi-VN")).toBeNull();
  });
});
