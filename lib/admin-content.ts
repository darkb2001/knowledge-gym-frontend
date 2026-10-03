import { apiRequest } from "./api-client";
import type { Difficulty, Module, PageResponse, QuestionDetail, QuestionSummary, Topic } from "./types";

// Public capability switches, not authentication. Backend RBAC remains authoritative.
// Leave disabled until the separately maintained backend ships the documented contract.
export const catalogWriteEnabled = process.env.NEXT_PUBLIC_ADMIN_CATALOG_WRITE === "true";
export const questionV2Enabled = process.env.NEXT_PUBLIC_ADMIN_QUESTION_V2 === "true";
export const blogListEnabled = process.env.NEXT_PUBLIC_ADMIN_BLOG_LIST === "true";

export type AdminOption = { id?: string; content: string; isCorrect?: boolean; displayOrder: number };
export type ContentStatus = "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
export type AdminQuestion = Omit<QuestionDetail, "options" | "moduleSlug"> & { moduleSlug?: string; contentStatus?: ContentStatus; searchKeywords?: string[]; options: AdminOption[] };
export type QuestionInput = { moduleId: string; title: string; answerHtml: string; difficulty: Difficulty; tags: string[]; sortOrder?: number };
export type CatalogInput = { name: string; slug: string; description: string; displayOrder: number; topicId?: string };
export type ImportJob = { jobId: string; status: string; startedAt?: string | null; finishedAt?: string | null; result?: Record<string, number> | null; errorMessage?: string | null };
export type AdminPost = { id: string; title: string; slug: string; body: string; excerpt?: string | null; status: string; tags?: string[]; moduleId?: string | null; questionId?: string | null; createdAt?: string; publishedAt?: string | null };

export const splitTags = (value: string) => [...new Set(value.split(",").map(tag => tag.trim()).filter(Boolean))];
export const isUuid = (value: string) => /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
const idPath = (id: string) => encodeURIComponent(id);

export function adminQuestions(params: URLSearchParams, signal?: AbortSignal) {
  return apiRequest<PageResponse<QuestionSummary>>(`${questionV2Enabled ? "/admin/content/questions" : "/questions"}?${params}`, { signal });
}
export function adminQuestion(id: string, signal?: AbortSignal) {
  return apiRequest<AdminQuestion>(`${questionV2Enabled ? "/admin/content/questions" : "/questions"}/${idPath(id)}`, { signal });
}
export function saveQuestion(id: string | null, input: QuestionInput) {
  const body = !id || questionV2Enabled ? input : { title: input.title, answerHtml: input.answerHtml, difficulty: input.difficulty, tags: input.tags };
  return apiRequest<AdminQuestion>(`/admin/content/questions${id ? `/${idPath(id)}` : ""}`, { method: id ? "PATCH" : "POST", body });
}
export function changeQuestionStatus(id: string, status: ContentStatus, reason: string) {
  if (!questionV2Enabled) throw new Error("Backend chưa hỗ trợ vòng đời nội dung.");
  if (!isUuid(id) || !reason.trim() || reason.length > 500) throw new Error("ID/reason không hợp lệ.");
  return apiRequest<AdminQuestion>(`/admin/content/questions/${idPath(id)}/status`, { method: "PATCH", body: { status, reason: reason.trim() } });
}
export const deleteQuestion = (id: string) => apiRequest<void>(`/admin/content/questions/${idPath(id)}`, { method: "DELETE" });
export function saveOptions(id: string, options: AdminOption[]) {
  if (!questionV2Enabled) throw new Error("Backend chưa hỗ trợ biên tập lựa chọn thủ công.");
  return apiRequest<AdminOption[]>(`/admin/content/questions/${idPath(id)}/options`, { method: "PUT", body: { options } });
}
export function saveCatalog(kind: "topics" | "modules", id: string | null, body: CatalogInput) {
  if (!catalogWriteEnabled) throw new Error("Backend chưa hỗ trợ lưu chủ đề và module.");
  return apiRequest<Topic | Module>(`/admin/content/${kind}${id ? `/${idPath(id)}` : ""}`, { method: id ? "PATCH" : "POST", body });
}
export function deleteCatalog(kind: "topics" | "modules", id: string) {
  if (!catalogWriteEnabled) throw new Error("Backend chưa hỗ trợ lưu chủ đề và module.");
  return apiRequest<void>(`/admin/content/${kind}/${idPath(id)}`, { method: "DELETE" });
}
export const submitImport = () => apiRequest<ImportJob>("/admin/content/parse", { method: "POST" });
export const importJob = (id: string, signal?: AbortSignal) => apiRequest<ImportJob>(`/admin/content/jobs/${idPath(id)}`, { signal });
export const generateOptions = () => apiRequest<{ questions: number; eligible: number; options: number }>("/admin/content/questions/generate-options", { method: "POST" });
export const createPost = (body: { title: string; body: string; moduleId: string | null; questionId: string | null; tags: string[] }) => apiRequest<AdminPost>("/admin/blog/posts", { method: "POST", body });
export const collectPosts = () => apiRequest<Record<string, number>>("/admin/blog/collect", { method: "POST" });
