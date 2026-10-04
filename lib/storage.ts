import { apiUpload } from "./api-client";

/** Kết quả upload ảnh đại diện — BE trả luôn hồ sơ đã cập nhật (kèm `avatarUrl` mới). */
export type AvatarProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

/** Giới hạn trùng với `AvatarUseCase.MAX_BYTES` ở BE. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Upload ảnh đại diện qua API (`POST /users/me/avatar`, multipart).
 *
 * Trước đây FE xin presigned URL rồi PUT thẳng lên Garage: host S3 công khai của homelab
 * (`s3.darkb-tech.io.vn`) không có ingress nên request trả `522` và ảnh không bao giờ hiện. Đi qua
 * API thì ảnh nằm sau đúng domain đang chạy, `<img>` tải được, không cần mở bucket public.
 */
export function uploadAvatar(file: File): Promise<AvatarProfile> {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<AvatarProfile>("/users/me/avatar", formData);
}

/** Kiểm tra phía client để báo lỗi ngay, khỏi tốn một vòng request (BE vẫn kiểm tra lại). */
export function validateAvatar(file: File): string {
  if (!AVATAR_CONTENT_TYPES.includes(file.type)) {
    return "Chỉ nhận ảnh PNG, JPEG hoặc WebP.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Ảnh đại diện tối đa 2 MB.";
  }
  return "";
}
