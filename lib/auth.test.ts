import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api-client", () => ({
  apiRequest: vi.fn(),
  clearSession: vi.fn(),
  ensureAccessToken: vi.fn(),
  getApiBase: vi.fn(),
  setAccessToken: vi.fn(),
}));

import { apiRequest, setAccessToken } from "./api-client";
import { register, requestEmailVerification, verifyExistingEmail } from "./auth";

describe("registration confirmation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects mismatched confirmation before sending a request", async () => {
    await expect(register("user@example.com", "password123", "User", "different123", "123456"))
      .rejects.toThrow("Mật khẩu xác nhận không khớp.");
    expect(apiRequest).not.toHaveBeenCalled();
    expect(setAccessToken).not.toHaveBeenCalled();
  });

  it("requests email code without sending password or installing a session", async () => {
    await requestEmailVerification("user@example.com");
    expect(apiRequest).toHaveBeenCalledWith("/auth/email-verification/request", {
      method: "POST", body: { email: "user@example.com" }, skipAuth: true,
    });
    expect(setAccessToken).not.toHaveBeenCalled();
  });

  it("activates legacy account with a new password but does not log in", async () => {
    await verifyExistingEmail("user@example.com", "123456", "newPassword123", "newPassword123");
    expect(apiRequest).toHaveBeenCalledWith("/auth/verify-email", {
      method: "POST", body: { email: "user@example.com", code: "123456",
        newPassword: "newPassword123", confirmPassword: "newPassword123" }, skipAuth: true,
    });
    expect(setAccessToken).not.toHaveBeenCalled();
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
    expect(setAccessToken).toHaveBeenCalledWith("test-token");
  });
});
