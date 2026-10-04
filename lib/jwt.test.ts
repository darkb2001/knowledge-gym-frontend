import { describe, expect, it } from "vitest";
import { decodeJwtPayload, isJwtExpired } from "./jwt";

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

const NOW = Math.floor(Date.now() / 1000);

describe("decodeJwtPayload", () => {
  it("đọc được payload chuẩn base64url", () => {
    const token = makeJwt({ sub: "u1", role: "USER", exp: NOW + 600 });
    expect(decodeJwtPayload(token)).toMatchObject({ sub: "u1", role: "USER" });
  });

  it("trả null với token rỗng/không phải JWT", () => {
    expect(decodeJwtPayload(null)).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
    expect(decodeJwtPayload("opaque-token")).toBeNull();
    expect(decodeJwtPayload("a.b")).toBeNull();
  });
});

describe("isJwtExpired", () => {
  it("token còn hạn → false", () => {
    expect(isJwtExpired(makeJwt({ exp: NOW + 900 }))).toBe(false);
  });

  it("token đã hết hạn → true", () => {
    expect(isJwtExpired(makeJwt({ exp: NOW - 10 }))).toBe(true);
  });

  it("sắp hết hạn trong ngưỡng skew → true (đổi mới sớm)", () => {
    expect(isJwtExpired(makeJwt({ exp: NOW + 5 }), 30)).toBe(true);
  });

  it("token không có exp hoặc opaque → không kết luận hết hạn", () => {
    expect(isJwtExpired(makeJwt({ sub: "u1" }))).toBe(false);
    expect(isJwtExpired("khong-phai-jwt")).toBe(false);
    expect(isJwtExpired(null)).toBe(false);
  });
});
