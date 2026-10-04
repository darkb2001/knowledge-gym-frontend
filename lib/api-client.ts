import type { ApiProblem } from "./types";
import { isJwtExpired } from "./jwt";
import { clearSessionMarker, markSessionAlive } from "./session-marker";

/**
 * Browser API client for Knowledge Gym backend.
 *
 * - Access JWT lives **in memory only** (module var) — never localStorage.
 * - Refresh token is httpOnly cookie on the API host; send with `credentials: "include"`.
 * - On 401: one refresh attempt, then retry the original request once.
 * - Transport / 5xx on refresh does **not** clear the session or bounce to /login
 *   (that was converting blips into hard logouts — m4b review MAJOR).
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:8080/api/v1";

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function getApiBase(): string {
  return API_BASE;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearSession(): void {
  accessToken = null;
  // Marker phiên (cookie first-party cho middleware) phải chết cùng token trong bộ nhớ.
  clearSessionMarker();
}

/**
 * `true` chỉ khi có access token **và** token còn hạn.
 *
 * "Có token trong bộ nhớ" không đồng nghĩa "đã đăng nhập": sau khi JWT hết hạn (mặc định 15 phút)
 * mà FE vẫn coi là hợp lệ thì người dùng vẫn thấy trang nội bộ cho tới khi có request 401.
 */
export function hasUsableAccessToken(): boolean {
  return Boolean(accessToken) && !isJwtExpired(accessToken);
}

/** Exposed for unit tests — reset module state between cases. */
export function __resetApiClientForTests(): void {
  accessToken = null;
  refreshInFlight = null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ApiProblem;

  constructor(status: number, problem: ApiProblem) {
    super(problem.detail || problem.title || problem.message || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

/** Refresh failed because the network/server was unreachable — session may still be valid. */
export class RefreshUnreachableError extends Error {
  constructor(message = "Không kết nối được máy chủ để làm mới phiên") {
    super(message);
    this.name = "RefreshUnreachableError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  /** Internal: set after one refresh+retry — do not pass from callers. */
  _retried?: boolean;
};

async function parseProblem(res: Response): Promise<ApiProblem> {
  // Gateways may replace Problem Details with HTML/plain text. Do not parse it as JSON.
  if (!res.headers.get("content-type")?.toLowerCase().includes("json")) {
    return { title: "error", detail: res.statusText, status: res.status };
  }
  try {
    const data = (await res.json()) as ApiProblem;
    return data;
  } catch {
    return { title: "error", detail: res.statusText, status: res.status };
  }
}

function bounceToLogin(): void {
  if (typeof window === "undefined") return;
  const pathName = window.location.pathname;
  if (
    pathName.startsWith("/login") ||
    pathName.startsWith("/register") ||
    pathName.startsWith("/forgot-password") ||
    pathName.startsWith("/auth/oauth2")
  ) {
    return;
  }
  window.location.assign("/login");
}

/**
 * @returns `true` if a new access token was stored.
 * @returns `false` if the refresh cookie is definitively invalid (401/403 or missing token).
 * @throws {RefreshUnreachableError} on network failure / abort.
 * @throws {ApiError} on other non-OK refresh responses (5xx, 429…) — session kept.
 */
async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      // Definitive auth failure only — cookie gone / revoked / expired.
      if (res.status === 401 || res.status === 403) {
        clearSession();
        return false;
      }
      if (!res.ok) {
        // 5xx / 429 / etc. — do not wipe the in-memory JWT; caller can retry later.
        throw new ApiError(res.status, await parseProblem(res));
      }
      const data = (await res.json()) as { accessToken?: string };
      if (!data.accessToken) {
        clearSession();
        return false;
      }
      setAccessToken(data.accessToken);
      // Refresh thành công ⇒ phiên còn sống: dựng lại marker cho middleware (tab reload làm mất state).
      markSessionAlive();
      return true;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // TypeError (failed to fetch), AbortError, DNS, CORS, etc.
      throw new RefreshUnreachableError(
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Single entry for cookie→access JWT. Coalesces concurrent callers (Strict Mode remount,
 * multi-tab, 401 retry) onto one `POST /auth/refresh` so refresh-token rotation cannot race.
 *
 * @throws {RefreshUnreachableError | ApiError} — callers that must not bounce to login
 *   on blips (e.g. RequireAuth) should catch these and show an error/retry UI.
 */
export async function ensureAccessToken(): Promise<boolean> {
  if (hasUsableAccessToken()) return true;
  // Token hết hạn trong bộ nhớ: bỏ luôn, không gửi JWT đã chết lên API.
  if (accessToken) accessToken = null;
  return tryRefresh();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, _retried, headers: extraHeaders, ...rest } = options;
  if (!skipAuth && accessToken && isJwtExpired(accessToken)) {
    // Đổi mới trước khi gọi: gửi JWT đã hết hạn là chắc chắn 401.
    await ensureAccessToken();
  }
  const headers = new Headers(extraHeaders);
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !skipAuth && !_retried) {
    try {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return apiRequest<T>(path, { ...options, _retried: true });
      }
      // Refresh cookie rejected — session is dead.
      bounceToLogin();
    } catch (err) {
      // Unreachable / 5xx: keep session, surface error to the caller.
      if (err instanceof RefreshUnreachableError || err instanceof ApiError) {
        throw err;
      }
      throw err;
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseProblem(res));
  }

  if (res.headers.get("content-type")?.includes("application/json")) {
    return (await res.json()) as T;
  }
  return undefined as T;
}

/**
 * Multipart upload (ảnh đại diện). Không dùng được `apiRequest` vì body phải là `FormData`:
 * để browser tự đặt `Content-Type` kèm `boundary`, và **không** `JSON.stringify` body.
 *
 * Vẫn giữ nguyên hành vi xác thực của `apiRequest`: gắn access token, gặp `401` thì refresh +
 * thử lại đúng một lần.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { _retried?: boolean } = {},
): Promise<T> {
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });

  if (res.status === 401 && !options._retried) {
    if (await tryRefresh()) return apiUpload<T>(path, formData, { _retried: true });
    bounceToLogin();
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) throw new ApiError(res.status, await parseProblem(res));

  if (res.headers.get("content-type")?.includes("application/json")) {
    return (await res.json()) as T;
  }
  return undefined as T;
}
