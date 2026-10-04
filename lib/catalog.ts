import type { Module, Topic } from "./types";

/** Số module hiển thị trong một hàng ngang trước khi cần nút "Xem thêm". */
export const TOPIC_PREVIEW_LIMIT = 3;

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

export function filterModules(modules: Module[], topics: Topic[], topicId: string, query: string): Module[] {
  const term = normalizeSearch(query);
  const topicNames = new Map(topics.map(topic => [topic.id, topic.name]));
  return modules.filter(module => (!topicId || module.topicId === topicId) && (!term || normalizeSearch([module.name, module.slug, module.description, topicNames.get(module.topicId)].filter(Boolean).join(" ")).includes(term))).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

/**
 * Fetch-time helper: module nào thuộc track nào là suy ra từ topic cha, nên lọc theo track
 * trước rồi mới tới topic/từ khoá. `trackSlug` rỗng = mọi track (tương thích API cũ chưa có track).
 */
export function filterModulesByTrack(modules: Module[], topics: Topic[], trackSlug: string, query: string): Module[] {
  const topicById = new Map(topics.map(topic => [topic.id, topic]));
  const scoped = trackSlug ? modules.filter(module => topicById.get(module.topicId)?.track === trackSlug) : modules;
  return filterModules(scoped, topics, "", query);
}

export type ModuleGroup = { topic: Topic; modules: Module[] };

/**
 * Gom module theo category (topic) và sắp theo `displayOrder` của topic, module giữ nguyên thứ tự
 * đã lọc. Topic không còn module nào thì bỏ, tránh hiện nhóm rỗng khi đang tìm kiếm.
 */
export function groupModulesByTopic(modules: Module[], topics: Topic[], trackSlug = ""): ModuleGroup[] {
  const scoped = trackSlug ? topics.filter(topic => topic.track === trackSlug) : topics;
  const groups = new Map<string, Module[]>(scoped.map(topic => [topic.id, []]));
  for (const item of modules) {
    const bucket = groups.get(item.topicId);
    if (bucket) bucket.push(item);
  }
  return [...scoped]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    .map(topic => ({ topic, modules: groups.get(topic.id) ?? [] }))
    .filter(group => group.modules.length > 0);
}
