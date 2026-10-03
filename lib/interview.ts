import { apiRequest } from "./api-client";
import type { PageResponse } from "./types";
/** Phiên luyện phỏng vấn — KHÔNG có điểm số: BE trả đáp án mẫu (`answerHtml`) ngay khi nộp câu trả lời. */
export type InterviewSession = { id: string; topicId: string; questionCount: number; mode: "TEXT"; status: "ACTIVE" | "FINISHED"; startedAt: string; finishedAt: string | null; questionIds: string[] };
export type Interview = { session: InterviewSession; questions: { questionId: string; title: string }[] };
export type InterviewAnswer = { questionId: string; userAnswer: string; answerHtml: string };
export const startInterview = (topicId: string, questionCount: number) => apiRequest<Interview>("/mock-interview/start", { method: "POST", body: { topicId, questionCount, mode: "TEXT" } });
export const answerInterview = (id: string, questionId: string, userAnswer: string) => apiRequest<InterviewAnswer>(`/mock-interview/${encodeURIComponent(id)}/answer`, { method: "POST", body: { questionId, userAnswer } });
export const finishInterview = (id: string) => apiRequest<InterviewSession>(`/mock-interview/${encodeURIComponent(id)}/finish`, { method: "POST" });
export const interviewHistory = (page = 1, signal?: AbortSignal) => apiRequest<PageResponse<InterviewSession>>(`/mock-interview/history?page=${page}&size=10`, { signal });
