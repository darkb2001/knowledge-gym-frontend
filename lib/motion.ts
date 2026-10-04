export const MOTION_KEY = "kg.motion";
export type MotionPreference = "auto" | "on";

export function validMotion(value: unknown): MotionPreference {
  return value === "on" ? "on" : "auto";
}

export function readMotion(storage?: Pick<Storage, "getItem">): MotionPreference {
  try { return validMotion(storage?.getItem(MOTION_KEY)); } catch { return "auto"; }
}

/**
 * "auto" để hệ điều hành quyết định (tôn trọng Giảm chuyển động của iOS/Android),
 * "on" là lựa chọn rõ ràng của người dùng muốn thấy hiệu ứng dù máy đang bật giảm chuyển động.
 */
export function motionAllowed(systemReduceMotion: boolean, preference: MotionPreference): boolean {
  return preference === "on" || !systemReduceMotion;
}

/** Chạy trước khi vẽ; chỉ đọc localStorage, không đọc cookie/token/dữ liệu đăng nhập. */
export const MOTION_INIT_SCRIPT = `try{if(localStorage.getItem("${MOTION_KEY}")==="on"){document.documentElement.dataset.motion="on"}else{delete document.documentElement.dataset.motion}}catch{}`;
