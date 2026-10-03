import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";

vi.mock("./api-client", () => ({ apiRequest: vi.fn().mockResolvedValue({}) }));
const request = vi.mocked(apiRequest);
const input = { moduleId: "module", title: "Question", answerHtml: "<p>Answer</p>", difficulty: "MID" as const, tags: ["java"], sortOrder: 3 };
beforeEach(() => {
  vi.resetModules(); request.mockClear();
  vi.stubEnv("NEXT_PUBLIC_ADMIN_CATALOG_WRITE", "false");
  vi.stubEnv("NEXT_PUBLIC_ADMIN_QUESTION_V2", "false");
  vi.stubEnv("NEXT_PUBLIC_ADMIN_BLOG_LIST", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("admin API adapters", () => {
  it("reuses existing question reads in legacy mode", async () => {
    const api = await import("./admin-content");
    await api.adminQuestions(new URLSearchParams({ page: "50", size: "10" }));
    expect(request).toHaveBeenCalledWith("/questions?page=50&size=10", { signal: undefined });
  });
  it("does not send unsupported move/order fields on legacy updates", async () => {
    const api = await import("./admin-content"); await api.saveQuestion("question", input);
    expect(request).toHaveBeenCalledWith("/admin/content/questions/question", { method: "PATCH", body: { title: input.title, answerHtml: input.answerHtml, difficulty: input.difficulty, tags: input.tags } });
  });
  it("uses the existing create contract", async () => {
    const api = await import("./admin-content"); await api.saveQuestion(null, input);
    expect(request).toHaveBeenCalledWith("/admin/content/questions", { method: "POST", body: input });
  });
  it("blocks missing catalog/options mutations without sending requests", async () => {
    const api = await import("./admin-content");
    expect(() => api.saveCatalog("topics", null, { name: "Topic", slug: "topic", description: "", displayOrder: 1 })).toThrow();
    expect(() => api.deleteCatalog("modules", "id")).toThrow();
    expect(() => api.saveOptions("question", [])).toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("enables planned contracts explicitly after backend rollout", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_CATALOG_WRITE", "true");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_QUESTION_V2", "true");
    const api = await import("./admin-content");
    await api.adminQuestion("question");
    expect(request).toHaveBeenLastCalledWith("/admin/content/questions/question", { signal: undefined });
    await api.saveQuestion("question", input);
    expect(request).toHaveBeenLastCalledWith("/admin/content/questions/question", { method: "PATCH", body: input });
    const options = [{ content: "Answer", isCorrect: true, displayOrder: 1 }];
    await api.saveOptions("question", options);
    expect(request).toHaveBeenLastCalledWith("/admin/content/questions/question/options", { method: "PUT", body: { options } });
  });
  it("requires rollout, a valid ID and a reason for visibility changes", async () => {
    const legacy = await import("./admin-content");
    expect(() => legacy.changeQuestionStatus("11111111-1111-4111-8111-111111111111", "HIDDEN", "Review")).toThrow();
    vi.stubEnv("NEXT_PUBLIC_ADMIN_QUESTION_V2", "true"); vi.resetModules();
    const api = await import("./admin-content");
    expect(() => api.changeQuestionStatus("../bad", "HIDDEN", "Review")).toThrow();
    expect(() => api.changeQuestionStatus("11111111-1111-4111-8111-111111111111", "PUBLISHED", " ")).toThrow();
    expect(request).not.toHaveBeenCalled();
    await api.changeQuestionStatus("11111111-1111-4111-8111-111111111111", "HIDDEN", " Checked ");
    expect(request).toHaveBeenLastCalledWith("/admin/content/questions/11111111-1111-4111-8111-111111111111/status", { method: "PATCH", body: { status: "HIDDEN", reason: "Checked" } });
  });
  it("normalizes tags and rejects malformed recovery IDs", async () => {
    const api = await import("./admin-content");
    expect(api.splitTags("java, jvm, java, , ")).toEqual(["java", "jvm"]);
    expect(api.isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(api.isUuid("../other/path")).toBe(false);
  });
});
