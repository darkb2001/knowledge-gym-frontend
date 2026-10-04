import { describe, expect, it } from "vitest";
import { messages, translateText } from "./i18n";
import { OAUTH_ACCOUNT_MESSAGE, oauthRecovery } from "./oauth-error";

/**
 * Trang lỗi OAuth phải nói được ĐÚNG việc cần làm cho từng mã lý do BE gắn vào URL. Trước đây mọi
 * lỗi đều hiện "thử đăng nhập lại" nên người dùng bấm Google lặp vô hạn ở các nhánh không thể retry.
 */
describe("OAuth error recovery", () => {
  it("không mời thử lại Google khi retry chắc chắn lặp lại lỗi cũ", () => {
    for (const reason of ["password_account", "account_blocked", "oauth_identity_mismatch"]) {
      expect(oauthRecovery(reason).retryGoogle, reason).toBe(false);
    }
  });

  it("mời thử lại với các lỗi tạm thời của Google", () => {
    for (const reason of ["access_denied", "google_email_unverified", "google_no_email", "authorization_request_not_found"]) {
      expect(oauthRecovery(reason).retryGoogle, reason).toBe(true);
    }
  });

  it("phân biệt phiên hết hạn với lỗi chung và không có reason", () => {
    expect(oauthRecovery("authorization_request_not_found").message).toContain("hết hạn");
    expect(oauthRecovery(null).message).not.toContain("hết hạn");
    expect(oauthRecovery(undefined).message).toBe(oauthRecovery("").message);
    expect(oauthRecovery("mã-lạ-không-biết").message).toContain("hết hạn");
  });

  it("tài khoản bị khoá không bị hiển thị như lỗi mật khẩu", () => {
    expect(oauthRecovery("account_blocked").message).toBe(OAUTH_ACCOUNT_MESSAGE);
    expect(oauthRecovery("account_blocked").message).toContain("bị khoá");
  });

  it("mọi thông báo đều có bản tiếng Anh (không rơi về tiếng Việt khi đổi ngôn ngữ)", () => {
    const reasons = [
      "password_account",
      "account_blocked",
      "oauth_identity_mismatch",
      "google_email_unverified",
      "google_no_email",
      "access_denied",
      null,
      "authorization_request_not_found",
    ];
    for (const reason of reasons) {
      const message = oauthRecovery(reason).message;
      expect(messages[message], `thiếu bản EN cho: ${message}`).toBeTruthy();
      expect(translateText(message, "en"), message).not.toBe(message);
    }
  });
});
