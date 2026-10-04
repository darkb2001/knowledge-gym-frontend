import { apiRequest } from "./api-client";
import type { PageResponse } from "./types";

/**
 * Mock interview API — mô hình "submit toàn cục".
 *
 * Người dùng điền bao nhiêu ô tuỳ ý rồi bấm **một** nút *Kết thúc phỏng vấn*; FE gửi toàn bộ câu
 * trả lời trong một request (`POST /{id}/submit`) và BE trả trang kết quả đầy đủ mọi câu của phiên
 * — kể cả câu bỏ trống. Không còn endpoint lưu câu trả lời / xem đáp án theo từng câu, và KHÔNG
 * có điểm số: `answerHtml` chỉ là đáp án tham khảo.
 */
export type InterviewSession = {
  id: string;
  topicId: string;
  questionCount: number;
  mode: "TEXT";
  status: "ACTIVE" | "FINISHED";
  startedAt: string;
  finishedAt: string | null;
  questionIds: string[];
};

export type InterviewQuestion = { questionId: string; title: string };

export type Interview = { session: InterviewSession; questions: InterviewQuestion[] };

/** Một dòng của trang kết quả. `userAnswer` null = người dùng để trống câu này. */
export type InterviewResultItem = {
  questionId: string;
  title: string;
  userAnswer: string | null;
  answerHtml: string | null;
  answeredAt: string | null;
};

export type InterviewResult = {
  session: InterviewSession;
  items: InterviewResultItem[];
  answeredCount: number;
};

export type InterviewAnswerInput = { questionId: string; answer: string };

export const startInterview = (topicId: string, questionCount: number) =>
  apiRequest<Interview>("/mock-interview/start", {
    method: "POST",
    body: { topicId, questionCount, mode: "TEXT" },
  });

/** Nộp tất cả câu trả lời một lần; câu để trống gửi chuỗi rỗng vẫn hợp lệ. */
export const submitInterview = (id: string, answers: InterviewAnswerInput[]) =>
  apiRequest<InterviewResult>(`/mock-interview/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body: { answers },
  });

export const interviewResult = (id: string, signal?: AbortSignal) =>
  apiRequest<InterviewResult>(`/mock-interview/${encodeURIComponent(id)}/result`, { signal });

export const interviewHistory = (page = 1, size = 10, signal?: AbortSignal) =>
  apiRequest<PageResponse<InterviewSession>>(
    `/mock-interview/history?page=${page}&size=${size}`,
    { signal },
  );

/**
 * Nháp câu trả lời giữ trong `localStorage` để refresh/đóng tab không mất bài đang viết.
 * Mọi truy cập đều bọc `try/catch`: chế độ riêng tư của Safari chặn storage và ném lỗi.
 */
const draftKey = (sessionId: string) => `kg.interview.draft.${sessionId}`;

export function readDraft(sessionId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(draftKey(sessionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const draft: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") draft[key] = value;
    }
    return draft;
  } catch {
    return {};
  }
}

export function writeDraft(sessionId: string, answers: Record<string, string>): void {
  try {
    localStorage.setItem(draftKey(sessionId), JSON.stringify(answers));
  } catch {
    /* storage đầy hoặc bị chặn — nháp chỉ là tiện ích, không được làm hỏng luồng làm bài */
  }
}

/**
 * Phiên người dùng đã chủ động bỏ. Trang luyện phỏng vấn tự khôi phục phiên ACTIVE gần nhất khi mở
 * lại, nên nếu không ghi nhớ lựa chọn "bỏ" thì phiên cũ sẽ quay lại mỗi lần F5.
 */
const dismissedKey = "kg.interview.dismissed";

export function readDismissedSessions(): string[] {
  try {
    const raw = localStorage.getItem(dismissedKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function dismissSession(sessionId: string): void {
  try {
    const next = Array.from(new Set([...readDismissedSessions(), sessionId])).slice(-20);
    localStorage.setItem(dismissedKey, JSON.stringify(next));
  } catch {
    /* xem writeDraft */
  }
}

export function clearDraft(sessionId: string): void {
  try {
    localStorage.removeItem(draftKey(sessionId));
  } catch {
    /* xem writeDraft */
  }
}

/** Số ô đã có nội dung — dùng cho bộ đếm "đã trả lời x/y" và màn xác nhận kết thúc. */
export function countAnswered(answers: Record<string, string>): number {
  return Object.values(answers).filter(value => value.trim().length > 0).length;
}
