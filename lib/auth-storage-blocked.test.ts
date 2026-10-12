import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetApiClientForTests, getAccessToken } from "./api-client";
import { login } from "./auth";

/**
 * Trình duyệt bị hạn chế (Safari chế độ riêng tư, WebView của app Facebook/Zalo/Messenger, máy hết
 * dung lượng) ném lỗi ngay khi *truy cập* sessionStorage — xem ghi chú ở
 * `components/english/useVocabularySession.ts`. `kg.user` chỉ là cache hiển thị, KHÔNG phải
 * credential: quyền truy cập vẫn do `GET /users/me` + API quyết định. Vì vậy một lỗi ghi cache
 * không được phép làm hỏng đăng nhập khi API đã trả 200.
 */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const STORAGE_ERROR = "SecurityError: The operation is insecure.";

describe("login khi sessionStorage bị chặn", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error(STORAGE_ERROR);
      },
      setItem: () => {
        throw new Error(STORAGE_ERROR);
      },
      removeItem: () => {
        throw new Error(STORAGE_ERROR);
      },
      clear: () => {
        throw new Error(STORAGE_ERROR);
      },
    });
    vi.stubGlobal("fetch", vi.fn());
    __resetApiClientForTests();
  });

  afterEach(() => {
    __resetApiClientForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("API trả 200 thì login vẫn phải thành công và giữ access token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({
        accessToken: "access-1",
        refreshToken: null,
        user: { id: "u1", email: "a@b.c", displayName: "A", role: "USER" },
      }),
    );

    await expect(login("a@b.c", "pw")).resolves.toMatchObject({ accessToken: "access-1" });
    expect(getAccessToken()).toBe("access-1");
  });
});
