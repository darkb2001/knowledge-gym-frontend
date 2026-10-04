import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSessionMarker, hasSessionMarker, markSessionAlive, SESSION_MARKER } from "./session-marker";

/** Cookie jar tối thiểu: đủ để kiểm tra FE ghi/xoá marker và cờ Secure. */
function stubCookieJar() {
  const jar = new Map<string, string>();
  const writes: string[] = [];
  const documentStub = {
    get cookie() {
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(raw: string) {
      writes.push(raw);
      const [pair, ...attrs] = raw.split(";").map((part) => part.trim());
      const [name, ...rest] = pair.split("=");
      const value = rest.join("=");
      const maxAge = attrs.find((attr) => attr.toLowerCase().startsWith("max-age="));
      const expired = maxAge ? Number(maxAge.split("=")[1]) <= 0 : false;
      if (expired) jar.delete(name);
      else jar.set(name, value);
    },
  };
  vi.stubGlobal("document", documentStub);
  return { jar, writes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("session marker cookie", () => {
  it("đặt marker sau khi xác thực thành công", () => {
    const { writes } = stubCookieJar();
    markSessionAlive();
    expect(hasSessionMarker()).toBe(true);
    expect(writes[0]).toContain(`${SESSION_MARKER}=1`);
    expect(writes[0]).toContain("Path=/");
    expect(writes[0]).toContain("SameSite=Lax");
    expect(writes[0]).not.toContain("Secure");
  });

  it("thêm Secure khi chạy trên https", () => {
    const { writes } = stubCookieJar();
    vi.stubGlobal("window", { location: { protocol: "https:" } });
    markSessionAlive();
    expect(writes[0]).toContain("Secure");
  });

  it("xoá marker khi phiên kết thúc", () => {
    stubCookieJar();
    markSessionAlive();
    clearSessionMarker();
    expect(hasSessionMarker()).toBe(false);
  });

  it("không ném lỗi khi không có DOM (SSR/test node)", () => {
    expect(() => markSessionAlive()).not.toThrow();
    expect(() => clearSessionMarker()).not.toThrow();
    expect(hasSessionMarker()).toBe(false);
  });
});
