import { apiRequest } from "./api-client";
import { isUuid } from "./admin-content";

export type UserRole = "USER" | "PREMIUM" | "ADMIN";
export type AdminUser = { id: string; email: string; displayName: string; role: UserRole; blocked: boolean; emailVerified: boolean; authProvider: string; xp: number; createdAt: string; updatedAt: string };
export type CommentStatus = "VISIBLE" | "HIDDEN" | "DELETED";
export type AdminComment = { id: string; postId: string; postTitle: string; userId: string; displayName: string; parentId: string | null; content: string; status: CommentStatus; createdAt: string };
export type PostAction = "HIDE" | "ARCHIVE" | "DELETE" | "RESTORE";

function checked(id: string, reason: string) {
  if (!isUuid(id)) throw new Error("Invalid resource ID");
  const value = reason.trim();
  if (!value || reason.length > 500) throw new Error("A reason of 1–500 characters is required");
  return value;
}
export function changeUserRole(id: string, role: UserRole, reason: string) {
  return apiRequest<AdminUser>(`/admin/users/${id}/role`, { method: "PATCH", body: { role, reason: checked(id, reason) } });
}
export function changeUserStatus(id: string, blocked: boolean, reason: string) {
  return apiRequest<AdminUser>(`/admin/users/${id}/status`, { method: "PATCH", body: { blocked, reason: checked(id, reason) } });
}
export function revokeUserSessions(id: string, reason: string) {
  return apiRequest<void>(`/admin/users/${id}/revoke-sessions`, { method: "POST", body: { reason: checked(id, reason) } });
}
export function moderateComment(id: string, action: CommentStatus | "RESTORE", reason: string) {
  const value = checked(id, reason);
  if (action === "RESTORE") return apiRequest<AdminComment>(`/admin/blog/comments/${id}/restore`, { method: "POST", body: { reason: value } });
  if (action === "DELETED") return apiRequest<AdminComment>(`/admin/blog/comments/${id}`, { method: "DELETE", body: { reason: value } });
  return apiRequest<AdminComment>(`/admin/blog/comments/${id}/status`, { method: "PATCH", body: { status: action, reason: value } });
}
export function moderatePost(id: string, action: PostAction, reason: string) {
  return apiRequest<{ id: string; status: string }>(`/admin/blog/posts/${id}/status`, { method: "PATCH", body: { action, reason: checked(id, reason) } });
}
