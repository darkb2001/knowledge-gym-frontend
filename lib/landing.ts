export const LANDING_DIAGRAM_URL = "/blog/demos/cache-aside.html";

export type LandingPost = { id: string; title: string; slug: string; excerpt: string | null; publishedAt: string; tags: string[] };

/** Public blog DTOs only. Never render HTML or fall back to an admin endpoint. */
export function landingPosts(value: unknown): LandingPost[] {
  const items = Array.isArray(value) ? value : value && typeof value === "object" && "items" in value ? value.items : undefined;
  if (!Array.isArray(items)) throw new Error("Invalid public blog response");
  const seen = new Set<string>();
  const result: LandingPost[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== "string" || !p.id || typeof p.title !== "string" || !p.title.trim() || typeof p.slug !== "string" || !p.slug.trim()) continue;
    if (typeof p.publishedAt !== "string" || !Number.isFinite(Date.parse(p.publishedAt))) continue;
    if (p.status !== undefined && p.status !== "PUBLISHED") continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    result.push({ id: p.id, title: p.title, slug: p.slug, excerpt: typeof p.excerpt === "string" ? p.excerpt : null, publishedAt: p.publishedAt, tags: Array.isArray(p.tags) ? p.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 3) : [] });
    if (result.length === 3) break;
  }
  return result;
}

export type CacheMode = "miss" | "hit";
export const CACHE_STEPS = [
  { label: ["Gửi request", "Send a request"], miss: ["Client yêu cầu một dữ liệu. API nhận request và bắt đầu tìm kiếm.", "The client requests an item. The API receives the request and starts the lookup."], hit: ["Client yêu cầu một dữ liệu. API nhận request và bắt đầu tìm kiếm.", "The client requests an item. The API receives the request and starts the lookup."] },
  { label: ["Kiểm tra cache", "Check the cache"], miss: ["Cache chưa có bản sao. API cần đọc từ nguồn dữ liệu gốc.", "There is no cached copy. The API needs to read the source of truth."], hit: ["Cache đã có bản sao. Không cần đi qua nhánh đọc database.", "A cached copy exists. The database-read branch is not needed."] },
  { label: ["Lấy dữ liệu", "Get the item"], miss: ["Database trả dữ liệu cho API. API lưu một bản sao vào cache kèm TTL.", "The database returns the item. The API stores a copy in the cache with a TTL."], hit: ["Cache trả bản sao cho API. Database không được truy vấn trong nhánh này.", "The cache returns its copy. The database is not queried in this branch."] },
  { label: ["Trả kết quả", "Return the result"], miss: ["API trả kết quả cho client. Hết lượt minh họa; TTL và invalidation là bài học tiếp theo.", "The API responds to the client. End of this illustration; TTL and invalidation are a separate lesson."], hit: ["API trả kết quả cho client từ bản sao đã có trong cache.", "The API responds to the client using the existing cached copy."] },
] as const;
