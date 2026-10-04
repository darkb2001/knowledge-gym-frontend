/**
 * Hướng dẫn phục hồi cho trang lỗi OAuth (`/auth/oauth2/error?reason=…`).
 *
 * Mã `reason` do BE gắn vào:
 * - `OAuth2FailureHandler` → mã lỗi OAuth2 (`authorization_request_not_found`, `access_denied`…)
 * - `OAuth2SuccessHandler` → mã nghiệp vụ (`password_account`, `account_blocked`, …)
 *
 * Mỗi trường hợp cần hướng dẫn khác nhau. Retry Google mù chỉ đúng khi lần trước thất bại vì lý do
 * tạm thời; với `password_account` (chống chiếm tài khoản) retry sẽ lặp lại y nguyên nên FE phải
 * đổi hướng sang đăng nhập bằng mật khẩu.
 */
export type OAuthRecovery = {
  /** Khoá tiếng Việt truyền cho `t()`; bản tiếng Anh nằm trong `lib/i18n.ts` (messages). */
  message: string;
  retryGoogle: boolean;
};

export const OAUTH_ACCOUNT_MESSAGE = "Tài khoản đã bị khoá. Liên hệ quản trị viên để được mở lại.";

export function oauthRecovery(reason: string | null | undefined): OAuthRecovery {
  switch (reason) {
    case "password_account":
      return {
        message: "Email này đã có tài khoản mật khẩu. Hãy đăng nhập bằng mật khẩu — nếu quên, dùng “Quên mật khẩu?”.",
        retryGoogle: false,
      };
    case "account_blocked":
      return { message: OAUTH_ACCOUNT_MESSAGE, retryGoogle: false };
    case "oauth_identity_mismatch":
      return {
        message: "Tài khoản này đã liên kết với một Google khác. Hãy dùng đúng Google bạn đã đăng ký, hoặc đăng nhập bằng mật khẩu.",
        retryGoogle: false,
      };
    case "google_email_unverified":
      return {
        message: "Email Google của bạn chưa được xác minh. Xác minh email trong tài khoản Google rồi thử lại.",
        retryGoogle: true,
      };
    case "google_no_email":
      return {
        message: "Tài khoản Google không chia sẻ email. Hãy dùng tài khoản Google khác hoặc đăng nhập bằng email và mật khẩu.",
        retryGoogle: true,
      };
    case "access_denied":
      return { message: "Bạn đã huỷ đăng nhập Google. Có thể thử lại bất cứ lúc nào.", retryGoogle: true };
    case null:
    case undefined:
    case "":
      return { message: "Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.", retryGoogle: true };
    default:
      // authorization_request_not_found (state/PKCE hết hạn hoặc bị dùng lại) và mọi mã lạ.
      return { message: "Phiên đăng nhập Google đã hết hạn hoặc đã được dùng. Hãy bắt đầu lại.", retryGoogle: true };
  }
}
