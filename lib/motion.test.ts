import { describe, expect, it } from "vitest";
import { MOTION_INIT_SCRIPT, MOTION_KEY, motionAllowed, readMotion, validMotion } from "@/lib/motion";

/**
 * Hiệu ứng động: mặc định theo hệ điều hành (tôn trọng Giảm chuyển động của iOS/Android),
 * chỉ khi người dùng chọn rõ ràng mới bật đè lên lựa chọn của hệ thống.
 */
describe("motion preference", () => {
  it("chỉ nhận giá trị hợp lệ", () => {
    expect(validMotion("on")).toBe("on");
    expect(validMotion("auto")).toBe("auto");
    expect(validMotion("whatever")).toBe("auto");
    expect(validMotion(undefined)).toBe("auto");
  });

  it("đọc từ storage và chịu được storage lỗi", () => {
    expect(readMotion({ getItem: () => "on" })).toBe("on");
    expect(readMotion({ getItem: () => null })).toBe("auto");
    expect(readMotion({ getItem: () => { throw new Error("blocked"); } })).toBe("auto");
  });

  it("hệ thống bật giảm chuyển động thì tắt hiệu ứng, trừ khi người dùng chọn Luôn bật", () => {
    expect(motionAllowed(true, "auto")).toBe(false);
    expect(motionAllowed(true, "on")).toBe(true);
    expect(motionAllowed(false, "auto")).toBe(true);
  });

  it("script khởi tạo chỉ đọc localStorage, không đọc cookie/token", () => {
    expect(MOTION_INIT_SCRIPT).toContain(MOTION_KEY);
    expect(MOTION_INIT_SCRIPT).not.toMatch(/cookie|token|auth|fetch/);
  });
});
