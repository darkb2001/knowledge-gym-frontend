import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("./api-client")>(),
  acceptAuthenticatedSession: vi.fn(),
  beginLogout: vi.fn(),
  getAccessToken: vi.fn(),
  getSessionVersion: vi.fn(),
  apiRequest: vi.fn(),
  clearSession: vi.fn(),
  ensureAccessToken: vi.fn(),
  getApiBase: vi.fn(),
  setAccessToken: vi.fn(),
}));

import { acceptAuthenticatedSession, apiRequest, getSessionVersion } from "./api-client";
import { register, requestEmailVerification, verifyExistingEmail } from "./auth";

describe("registration confirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionVersion).mockReturnValue(0);
    vi.mocked(apiRequest).mockResolvedValue({ message: "Verification complete" });
  });

  it("rejects mismatched confirmation before sending a request", async () => {
    await expect(register("user@example.com", "password123", "User", "different123", "123456"))
      .rejects.toThrow("Mật khẩu xác nhận không khớp.");
    expect(apiRequest).not.toHaveBeenCalled();
    expect(acceptAuthenticatedSession).not.toHaveBeenCalled();
  });

  it("requests email code without sending password or installing a session", async () => {
    await expect(requestEmailVerification("user@example.com")).resolves.toBe("Verification complete");
    expect(apiRequest).toHaveBeenCalledWith("/auth/email-verification/request", {
      method: "POST", body: { email: "user@example.com" }, skipAuth: true,
    });
    expect(acceptAuthenticatedSession).not.toHaveBeenCalled();
  });

  it("activates legacy account with a new password but does not log in", async () => {
    await expect(verifyExistingEmail("user@example.com", "123456", "newPassword123", "newPassword123"))
      .resolves.toBe("Verification complete");
    expect(apiRequest).toHaveBeenCalledWith("/auth/verify-email", {
      method: "POST", body: { email: "user@example.com", code: "123456",
        newPassword: "newPassword123", confirmPassword: "newPassword123" }, skipAuth: true,
    });
    expect(acceptAuthenticatedSession).not.toHaveBeenCalled();
  });

  it("sends confirmation together with the password", async () => {
    const response = { accessToken: "test-token", user: { id: "test-user", role: "USER" } };
    vi.mocked(apiRequest).mockResolvedValue(response);
    await register("user@example.com", "password123", "User", "password123", "123456");
    expect(apiRequest).toHaveBeenCalledWith("/auth/register", {
      method: "POST",
      body: {
        email: "user@example.com", password: "password123",
        confirmPassword: "password123", displayName: "User", verificationCode: "123456",
      },
      skipAuth: true,
    });
    expect(acceptAuthenticatedSession).toHaveBeenCalledWith("test-token", 0);
  });
});
