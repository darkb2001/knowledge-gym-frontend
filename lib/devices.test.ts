import { describe, expect, it } from "vitest";
import { describeClient, formatSeenAt } from "@/lib/devices";

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

describe("formatSeenAt", () => {
  it("định dạng được mốc thời gian ISO", () => {
    expect(formatSeenAt("2026-10-04T17:12:00Z", "vi-VN")).toBeTruthy();
  });

  it("trả null khi mốc thời gian hỏng (không hiện Invalid Date)", () => {
    expect(formatSeenAt("not-a-date", "vi-VN")).toBeNull();
  });
});
