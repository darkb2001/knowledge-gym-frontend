import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";
import { loadDashboard, topLeaderboard } from "./dashboard";
import { quizHistory } from "./quiz";
import { interviewHistory } from "./interview";
import { filterMapNodes, mastery, MAP_PAGE_SIZE, type MindmapNode } from "./knowledge-map";
vi.mock("./api-client", () => ({ apiRequest: vi.fn() }));
const request = vi.mocked(apiRequest);
beforeEach(() => { request.mockReset(); });

describe("bounded learning collections", () => {
  it("requests only the chosen quiz page and retains the existing default signature", async () => {
    await quizHistory(30, undefined, 5);
    expect(request).toHaveBeenLastCalledWith("/quiz/history?page=30&size=5", { signal: undefined });
    await quizHistory(2, undefined, 10000);
    expect(request).toHaveBeenLastCalledWith("/quiz/history?page=2&size=10", { signal: undefined });
    await quizHistory();
    expect(request).toHaveBeenLastCalledWith("/quiz/history?page=1&size=10", { signal: undefined });
  });
  it("uses actual server pagination for interview previews", async () => {
    const signal = new AbortController().signal;
    await interviewHistory(2, 5, signal);
    expect(request).toHaveBeenLastCalledWith("/mock-interview/history?page=2&size=5", { signal });
  });
  it("retains at most ten leaderboard entries in rank order without mutating input", () => {
    const users = Array.from({ length: 100 }, (_, i) => ({ rank: 100 - i, userId: String(i), displayName: "Learner", xp: i }));
    expect(topLeaderboard(users).map(user => user.rank)).toEqual([1,2,3,4,5,6,7,8,9,10]);
    expect(users[0].rank).toBe(100);
    expect(topLeaderboard([])).toEqual([]);
  });
  it("requests the supported leaderboard limit and truncates legacy top-100 responses", async () => {
    request.mockImplementation(async path => path.startsWith("/dashboard/radar") ? { modules: [] } : path.startsWith("/dashboard/leaderboard") ? Array.from({ length: 100 }, (_, i) => ({ rank: i + 1, userId: String(i), displayName: "Learner", xp: 100 - i })) : []);
    const result = await loadDashboard();
    expect(request).toHaveBeenCalledWith("/dashboard/leaderboard?limit=10", { signal: undefined });
    expect(result.leaderboard).toHaveLength(10);
  });
});

describe("large knowledge maps", () => {
  const nodes: MindmapNode[] = [0, 39, 40, 74, 75, 100].map((value, i) => ({ id: String(i), name: i === 0 ? "Đồng bộ luồng" : `Module ${i}`, slug: `module-${i}`, topicId: null, questionCount: 20, masteryPct: value }));
  it("finds accented Vietnamese names and slugs", () => {
    expect(filterMapNodes(nodes, "dong bo", "", "name").map(node => node.id)).toEqual(["0"]);
    expect(filterMapNodes(nodes, "module-4", "", "name").map(node => node.id)).toEqual(["4"]);
  });
  it("uses non-overlapping mastery boundaries", () => {
    expect(filterMapNodes(nodes, "", "weak", "name")).toHaveLength(2);
    expect(filterMapNodes(nodes, "", "learning", "name")).toHaveLength(2);
    expect(filterMapNodes(nodes, "", "strong", "name")).toHaveLength(2);
  });
  it("sorts lowest mastery first without mutating the response", () => {
    const reversed = [...nodes].reverse();
    expect(filterMapNodes(reversed, "", "", "weak").map(node => node.masteryPct)).toEqual([0,39,40,74,75,100]);
    expect(reversed[0].masteryPct).toBe(100);
    expect(MAP_PAGE_SIZE).toBe(12);
  });
  it("handles empty matches and clamps invalid mastery", () => {
    expect(filterMapNodes(nodes, "nonexistent", "", "name")).toEqual([]);
    expect([mastery(-5), mastery(150), mastery(NaN)]).toEqual([0,100,0]);
  });
});
