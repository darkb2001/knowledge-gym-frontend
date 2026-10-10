import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetApiClientForTests,
  apiRequest,
  ensureAccessToken,
  GATEWAY_UNAVAILABLE_MESSAGE,
  getAccessToken,
  RefreshUnreachableError,
  setAccessToken,
} from "./api-client";
import { applyOAuthHash } from "./auth";

describe("api-client refresh coalescing", () => {
  beforeEach(() => {
    __resetApiClientForTests();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("coalesces concurrent ensureAccessToken into one refresh POST", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ accessToken: "tok-a", expiresIn: 900 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const [a, b] = await Promise.all([ensureAccessToken(), ensureAccessToken()]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(getAccessToken()).toBe("tok-a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/auth/refresh");
  });

  it("retries original request exactly once after successful refresh", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "tok-b" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    setAccessToken("stale");
    const data = await apiRequest<{ ok: boolean }>("/questions");

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBe("tok-b");
  });

  it("throws RefreshUnreachableError on network blip without clearing session", async () => {
    setAccessToken("keep-me");
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiRequest("/questions")).rejects.toBeInstanceOf(RefreshUnreachableError);
    expect(getAccessToken()).toBe("keep-me");
  });

  it("returns false (session dead) on definitive 401 from refresh", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));

    await expect(ensureAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it("runs refresh inside the cross-tab Web Lock and serializes waiters", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ accessToken: "tok-locked" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const lockNames: string[] = [];
    let active = 0;
    let maxActive = 0;
    vi.stubGlobal("navigator", {
      locks: {
        async request<T>(name: string, callback: () => Promise<T>): Promise<T> {
          lockNames.push(name);
          active += 1;
          maxActive = Math.max(maxActive, active);
          try {
            return await callback();
          } finally {
            active -= 1;
          }
        },
      },
    });

    const [a, b] = await Promise.all([ensureAccessToken(), ensureAccessToken()]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(lockNames).toEqual(["kg-auth-refresh"]);
    expect(maxActive).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a direct refresh when Web Locks is unavailable", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ accessToken: "tok-nolock" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    // navigator tồn tại nhưng không có locks (Safari cũ / môi trường SSR).
    vi.stubGlobal("navigator", {});

    await expect(ensureAccessToken()).resolves.toBe(true);
    expect(getAccessToken()).toBe("tok-nolock");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("applyOAuthHash", () => {
  beforeEach(() => {
    __resetApiClientForTests();
  });

  it("parses valid hash and stores access token", () => {
    const parsed = applyOAuthHash(
      "#accessToken=abc.def&userId=11111111-1111-1111-1111-111111111111&role=USER",
    );
    expect(parsed).toEqual({
      accessToken: "abc.def",
      userId: "11111111-1111-1111-1111-111111111111",
      role: "USER",
    });
    expect(getAccessToken()).toBe("abc.def");
  });

  it("returns null when accessToken or userId missing", () => {
    expect(applyOAuthHash("#role=USER")).toBeNull();
    expect(applyOAuthHash("#accessToken=only")).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});

/**
 * Sự cố 04/10: app bị recreate lúc deploy, nginx trả 502 HTML cho `POST /auth/login`. Thông báo
 * "Bad Gateway" lọt ra UI không nói gì với người dùng nên họ tưởng mật khẩu sai. Lỗi hạ tầng phải
 * nói rõ là hạ tầng.
 */
describe("lỗi gateway khi app đang restart", () => {
  beforeEach(() => {
    __resetApiClientForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("đổi 502 HTML thành thông báo máy chủ đang khởi động lại", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html><head><title>502 Bad Gateway</title></head></html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    await expect(
      apiRequest("/auth/login", { method: "POST", body: { email: "a@b.c", password: "x" }, skipAuth: true }),
    ).rejects.toMatchObject({ status: 502, message: GATEWAY_UNAVAILABLE_MESSAGE });
  });

  it("giữ nguyên chi tiết khi máy chủ trả Problem Details JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ title: "conflict", detail: "Email đã được đăng ký" }), {
          status: 409,
          headers: { "content-type": "application/problem+json" },
        }),
      ),
    );

    await expect(
      apiRequest("/auth/register", { method: "POST", body: {}, skipAuth: true }),
    ).rejects.toMatchObject({ status: 409, message: "Email đã được đăng ký" });
  });
});
