import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetApiClientForTests, acceptAuthenticatedSession, apiRequest, apiUpload, beginLogout, ensureAccessToken, getAccessToken, setAccessToken } from "./api-client";
import { login, logout, restoreSession } from "./auth";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("logout fence", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
    vi.stubGlobal("fetch", vi.fn());
    __resetApiClientForTests();
  });
  afterEach(() => { __resetApiClientForTests(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("network-failed logout blocks restore after reload without refreshing or leaking tokens into storage", async () => {
    setAccessToken("old-access");
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(logout()).rejects.toThrow("offline");
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("kg.logout-intent")).toBe("1");
    __resetApiClientForTests(); // Reload resets module memory, but not the persisted non-secret intent.
    await expect(restoreSession()).resolves.toBe(false);
    await expect(apiRequest("/users/me")).rejects.toMatchObject({ status: 401 });
    await expect(apiUpload("/storage", new FormData())).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer old-access");
  });

  it("successful logout also requires explicit login; failed login cannot remove the fence", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logout();
    await expect(ensureAccessToken()).resolves.toBe(false);
    vi.mocked(fetch).mockResolvedValueOnce(json({ detail: "Wrong password" }, 401));
    await expect(login("user@example.com", "wrong")).rejects.toMatchObject({ status: 401 });
    await expect(ensureAccessToken()).resolves.toBe(false);
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "new-access", user: { id: "user", role: "USER" } }));
    await login("user@example.com", "correct");
    expect(getAccessToken()).toBe("new-access");
    expect(localStorage.getItem("kg.logout-intent")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("late refresh cannot resurrect logout or overwrite a new explicit login", async () => {
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(response.promise);
    const refresh = ensureAccessToken();
    beginLogout();
    acceptAuthenticatedSession("explicit-login");
    response.resolve(json({ accessToken: "late-refresh" }));
    await expect(refresh).resolves.toBe(false);
    expect(getAccessToken()).toBe("explicit-login");
  });

  it("late refresh after logout alone is discarded", async () => {
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(response.promise);
    const refresh = ensureAccessToken();
    beginLogout();
    response.resolve(json({ accessToken: "late-refresh" }));
    await expect(refresh).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
    await expect(ensureAccessToken()).resolves.toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stale bearer rejection retries only cookie logout, never refresh", async () => {
    setAccessToken("stale-access");
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logout();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url).endsWith("/auth/logout"))).toBe(true);
    expect(new Headers(vi.mocked(fetch).mock.calls[1][1]?.headers).has("Authorization")).toBe(false);
    await expect(ensureAccessToken()).resolves.toBe(false);
  });

  it("another tab's persisted logout blocks this tab's in-memory token", async () => {
    setAccessToken("other-tab-access");
    localStorage.setItem("kg.logout-intent", "1");
    await expect(ensureAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses a first-party cookie fence when localStorage is unavailable, including after reload", async () => {
    const cookies = new Map<string, string>();
    const documentStub = Object.defineProperty({}, "cookie", {
      get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      set: (value: string) => {
        const [pair] = value.split(";");
        const [key, content] = pair.split("=");
        if (value.includes("Max-Age=0")) cookies.delete(key); else cookies.set(key, content);
      },
    });
    vi.stubGlobal("document", documentStub);
    vi.stubGlobal("window", { location: { protocol: "https:" } });
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("storage blocked"); },
      setItem: () => { throw new Error("storage blocked"); },
      removeItem: () => { throw new Error("storage blocked"); },
    });
    beginLogout();
    expect(cookies.get("kg_logout")).toBe("1");
    __resetApiClientForTests();
    await expect(ensureAccessToken()).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    acceptAuthenticatedSession("explicit-login");
    expect(cookies.has("kg_logout")).toBe(false);
    expect(getAccessToken()).toBe("explicit-login");
  });

  it("an old login request and old protected responses cannot revive a logged-out session", async () => {
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(response.promise);
    const pendingLogin = login("user@example.com", "password");
    beginLogout();
    response.resolve(json({ accessToken: "late-login", user: { id: "user" } }));
    await expect(pendingLogin).rejects.toThrow("Đăng nhập đã bị hủy");
    expect(getAccessToken()).toBeNull();

    acceptAuthenticatedSession("new-login");
    const profile = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(profile.promise);
    const pendingProfile = apiRequest("/users/me");
    beginLogout();
    profile.resolve(json({ id: "old-user" }));
    await expect(pendingProfile).rejects.toMatchObject({ status: 401 });
  });
});
