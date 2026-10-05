import { describe, expect, it } from "vitest";
import { TURNSTILE_HEADER, TURNSTILE_SITE_KEY, turnstileEnabled, turnstileHeaders, turnstileOption } from "./turnstile";

describe("turnstileHeaders", () => {
  it("gửi header khi có token", () => {
    expect(turnstileHeaders("abc")).toEqual({ [TURNSTILE_HEADER]: "abc" });
  });
  it("bỏ qua token rỗng/null", () => {
    expect(turnstileHeaders(null)).toEqual({});
    expect(turnstileHeaders(undefined)).toEqual({});
    expect(turnstileHeaders("   ")).toEqual({});
  });
});

describe("turnstileOption", () => {
  it("không thêm headers khi thiếu token", () => {
    expect(turnstileOption(null)).toEqual({});
    expect(turnstileOption(undefined)).toEqual({});
  });
  it("thêm headers khi có token", () => {
    expect(turnstileOption("tok")).toEqual({ headers: { [TURNSTILE_HEADER]: "tok" } });
  });
});

describe("turnstileEnabled", () => {
  it("bật khi có site key (mặc định là key public của Knowledge Gym)", () => {
    expect(TURNSTILE_SITE_KEY.length).toBeGreaterThan(0);
    expect(turnstileEnabled()).toBe(true);
  });
});
