import { getApiBase } from "@/lib/api-client";

/** Raw RSS document on the app domain, so the feed opens as XML instead of a blank page. */
export const dynamic = "force-dynamic";

const EMPTY_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Knowledge Gym</title>
    <link>https://app.darkb-tech.io.vn/blog</link>
    <description>Bài viết mới từ Knowledge Gym.</description>
    <language>vi-VN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>
`;

export async function GET() {
  const headers = { "content-type": "application/rss+xml; charset=utf-8" };
  try {
    const response = await fetch(`${getApiBase()}/blog/feed.rss`, {
      headers: { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8", "user-agent": "KnowledgeGym-Feed/1.0 (+https://app.darkb-tech.io.vn)" },
      next: { revalidate: 300 },
    });
    const body = await response.text();
    if (!response.ok || !body.includes("<rss")) throw new Error(`upstream ${response.status}`);
    return new Response(body, { headers: { ...headers, "cache-control": "public, max-age=300, s-maxage=300" } });
  } catch {
    return new Response(EMPTY_FEED, { status: 200, headers: { ...headers, "cache-control": "no-store" } });
  }
}
