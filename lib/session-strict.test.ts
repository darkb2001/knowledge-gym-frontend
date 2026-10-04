import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetApiClientForTests,
  apiRequest,
  ensureAccessToken,
  getAccessToken,
  hasUsableAccessToken,
  setAccessToken,
} from "./api-client";

function jwt(expOffsetSeconds: number): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "u1", exp: now + expOffsetSeconds })}.sig`;
}

function refreshResponse(accessToken: string) {
  return new Response(JSON.stringify({ accessToken }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("strict access-token checks", () => {
  beforeEach(() => {
    __resetApiClientForTests();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("token hết hạn trong bộ nhớ KHÔNG được tính là đã đăng nhập", () => {
    setAccessToken(jwt(-60));
    expect(hasUsableAccessToken()).toBe(false);
    setAccessToken(jwt(600));
    expect(hasUsableAccessToken()).toBe(true);
  });

  it("ensureAccessToken đổi mới ngay khi token cũ đã hết hạn", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(refreshResponse("tok-new"));

    setAccessToken(jwt(-120));
    await expect(ensureAccessToken()).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/auth/refresh");
    expect(getAccessToken()).toBe("tok-new");
  });

  it("apiRequest đổi mới trước khi gọi API và dùng token mới", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(refreshResponse("tok-fresh"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    setAccessToken(jwt(-30));
    await expect(apiRequest<{ ok: boolean }>("/questions")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toBe("Bearer tok-fresh");
  });

  it("không tốn thêm request khi token còn hạn", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    setAccessToken(jwt(600));
    await apiRequest("/questions");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).not.toBeNull();
  });
});
