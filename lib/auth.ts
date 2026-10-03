import { apiRequest, clearSession, ensureAccessToken, getApiBase, setAccessToken } from "./api-client";
import type { TokenResponse, User } from "./types";

const USER_KEY = "kg.user";

export function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(USER_KEY);
  }
}

/**
 * After full page reload access JWT is gone — recover via refresh cookie.
 * Uses {@link ensureAccessToken} so concurrent Strict Mode / multi-tab callers
 * share one in-flight refresh (avoids rotation race → family revoke).
 */
export async function restoreSession(): Promise<boolean> {
  return ensureAccessToken();
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    skipAuth: true,
  });
  setAccessToken(data.accessToken);
  storeUser(data.user);
  return data;
}

/**
 * Registration is verified: the API rejects `POST /auth/register` unless the 6-digit
 * code emailed by {@link requestEmailVerification} is supplied together with a matching
 * `confirmPassword`.
 */
export async function register(
  email: string,
  password: string,
  displayName: string,
  confirmPassword: string,
  verificationCode: string,
): Promise<TokenResponse> {
  if (password !== confirmPassword) {
    throw new Error("Mật khẩu xác nhận không khớp.");
  }
  const data = await apiRequest<TokenResponse>("/auth/register", {
    method: "POST",
    body: { email, password, confirmPassword, displayName, verificationCode },
    skipAuth: true,
  });
  setAccessToken(data.accessToken);
  storeUser(data.user);
  return data;
}

/** Emails a 6-digit verification code (valid 10 minutes) for registration or a legacy unverified account. */
export async function requestEmailVerification(email: string): Promise<string> {
  const data = await apiRequest<{ message: string }>("/auth/email-verification/request", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
  return data.message;
}

/** Verifies a legacy (pre-verification) account: consumes the code and sets a new password. */
export async function verifyEmail(
  email: string,
  code: string,
  newPassword: string,
): Promise<string> {
  return verifyExistingEmail(email, code, newPassword, newPassword);
}

export async function verifyExistingEmail(
  email: string, code: string, newPassword: string, confirmPassword: string,
): Promise<string> {
  if (newPassword !== confirmPassword) throw new Error("Mật khẩu xác nhận không khớp.");
  const data = await apiRequest<{ message: string }>("/auth/verify-email", {
    method: "POST", body: { email, code, newPassword, confirmPassword }, skipAuth: true,
  });
  return data.message;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/auth/logout", { method: "POST" });
  } finally {
    clearSession();
    storeUser(null);
  }
}

export async function forgotPassword(email: string): Promise<string> {
  const data = await apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
  return data.message;
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<string> {
  const data = await apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: { email, code, newPassword },
    skipAuth: true,
  });
  return data.message;
}

/** Starts Google OAuth — full navigation to Spring Security authorization endpoint. */
export function startGoogleLogin(): void {
  window.location.href = `${getApiBase()}/oauth2/authorization/google`;
}

export function applyOAuthHash(hash: string): { accessToken: string; userId: string; role: string } | null {
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleaned);
  const accessToken = params.get("accessToken");
  const userId = params.get("userId");
  const role = params.get("role") || "USER";
  if (!accessToken || !userId) return null;
  setAccessToken(accessToken);
  return { accessToken, userId, role };
}
