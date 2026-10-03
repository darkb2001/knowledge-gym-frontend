import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";
import { changeUserRole, changeUserStatus, revokeUserSessions, moderateComment, moderatePost } from "./admin-platform";
vi.mock("./api-client", () => ({ apiRequest: vi.fn().mockResolvedValue({}) }));
const request = vi.mocked(apiRequest);
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => request.mockClear());
describe("admin platform API contracts", () => {
  it("uses role/status endpoints with a required reason", async () => {
    await changeUserRole(id, "PREMIUM", " Subscription ");
    expect(request).toHaveBeenLastCalledWith(`/admin/users/${id}/role`, { method: "PATCH", body: { role: "PREMIUM", reason: "Subscription" } });
    await changeUserStatus(id, true, "Abuse");
    expect(request).toHaveBeenLastCalledWith(`/admin/users/${id}/status`, { method: "PATCH", body: { blocked: true, reason: "Abuse" } });
  });
  it("revokes sessions without sending user credentials", async () => {
    await revokeUserSessions(id, "Theft");
    expect(request).toHaveBeenCalledWith(`/admin/users/${id}/revoke-sessions`, { method: "POST", body: { reason: "Theft" } });
  });
  it("deletes comments through a reversible server action", async () => {
    await moderateComment(id, "DELETED", "Spam");
    expect(request).toHaveBeenCalledWith(`/admin/blog/comments/${id}`, { method: "DELETE", body: { reason: "Spam" } });
  });
  it("restores comments without making them visible directly", async () => {
    await moderateComment(id, "RESTORE", "Appeal");
    expect(request).toHaveBeenCalledWith(`/admin/blog/comments/${id}/restore`, { method: "POST", body: { reason: "Appeal" } });
  });
  it("uses lifecycle API rather than writer rejection", async () => {
    await moderatePost(id, "ARCHIVE", "Outdated");
    expect(request).toHaveBeenCalledWith(`/admin/blog/posts/${id}/status`, { method: "PATCH", body: { action: "ARCHIVE", reason: "Outdated" } });
  });
  it("rejects empty reasons and invalid identifiers before any request", () => {
    expect(() => changeUserRole(id, "ADMIN", " ")).toThrow();
    expect(() => moderatePost("../other", "DELETE", "Reason")).toThrow();
    expect(() => revokeUserSessions(id, "x".repeat(501))).toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
