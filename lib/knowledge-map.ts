import { normalizeSearch } from "./catalog";

export type MindmapNode = { id: string; name: string; slug: string; topicId: string | null; questionCount: number; masteryPct: number };
export const MAP_PAGE_SIZE = 12;
export function mastery(value: number): number { return Math.max(0, Math.min(100, Number(value) || 0)); }
export function filterMapNodes(nodes: MindmapNode[], query: string, level: string, sort: string): MindmapNode[] {
  const term = normalizeSearch(query);
  return nodes.filter(node => {
    if (term && !normalizeSearch(`${node.name} ${node.slug}`).includes(term)) return false;
    const value = mastery(node.masteryPct);
    switch (level) {
      case "weak": return value < 40;
      case "learning": return value >= 40 && value < 75;
      case "strong": return value >= 75;
      default: return true;
    }
  }).sort((a, b) => {
    if (sort === "weak") return mastery(a.masteryPct) - mastery(b.masteryPct) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}
