import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetApiClientForTests, acceptOAuthCallbackSession, ensureAccessToken, getAccessToken, setAccessToken } from "./api-client";
import { logout } from "./auth";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

describe("OAuth callback session", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    vi.stubGlobal("fetch", vi.fn());
    __resetApiClientForTests();
  });
  afterEach(() => {
    __resetApiClientForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("gỡ hàng rào logout-intent rồi đổi refresh cookie lấy access token", async () => {
    // Logout lỗi mạng ⇒ còn hàng rào: mọi đường refresh bị chặn (chống "hồi sinh" phiên cũ).
    setAccessToken("stale-access");
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(logout()).rejects.toThrow("offline");
    expect(localStorage.getItem("kg.logout-intent")).toBe("1");
    await expect(ensureAccessToken()).resolves.toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);

    // Callback OAuth = phiên mới do BE vừa tạo ⇒ được phép mở hàng rào và refresh một lần.
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "fresh-access" }));
    acceptOAuthCallbackSession();
    await expect(ensureAccessToken()).resolves.toBe(true);
    expect(getAccessToken()).toBe("fresh-access");
    expect(localStorage.getItem("kg.logout-intent")).toBeNull();
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("/auth/refresh");
  });
});
