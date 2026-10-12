"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRightIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { getApiBase } from "@/lib/api-client";
import { landingPosts, type LandingPost } from "@/lib/landing";
import { useLocale } from "@/components/locale";

export function PublishedArticles() {
  const { locale, formatLocale } = useLocale();
  const en = locale === "en";
  const [posts, setPosts] = useState<LandingPost[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    // Public transport deliberately omits credentials and never invokes session restoration.
    void fetch(`${getApiBase()}/blog/posts?page=0&size=3`, { signal: controller.signal, credentials: "omit" }).then(async response => {
      if (!response.ok) throw new Error("Public blog unavailable");
      return landingPosts(await response.json());
    }).then(items => { if (!controller.signal.aborted) { setPosts(items); setState("ready"); } }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [reload]);
  return <section className="landing-articles landing-section" id="articles" aria-labelledby="landing-articles-title">
    <div className="landing-section-heading"><h2 id="landing-articles-title">{en ? "A good read.\nA new perspective." : "Đọc một chút.\nMở thêm góc nhìn."}</h2><Link href="/blog" className="landing-text-link">{en ? "All articles" : "Tất cả bài viết"}<ArrowUpRightIcon size={20} aria-hidden /></Link></div>
    <div className="landing-article-list" aria-busy={state === "loading"}>
      {state === "loading" && <><p role="status">{en ? "Loading published articles…" : "Đang tải bài viết đã xuất bản…"}</p><div className="landing-article-skeleton" aria-hidden="true"><span /><span /><span /></div></>}
      {state === "error" && <div className="landing-article-state"><p role="alert">{en ? "Articles couldn’t load. You can retry or visit the blog." : "Chưa tải được bài viết. Bạn có thể thử lại hoặc mở trang bài viết."}</p><button type="button" className="landing-text-link" onClick={() => setReload(value => value + 1)}><ArrowClockwiseIcon size={18} aria-hidden />{en ? "Try again" : "Thử lại"}</button></div>}
      {state === "ready" && posts.length === 0 && <div className="landing-article-state"><p>{en ? "No articles have been published yet." : "Chưa có bài viết được xuất bản."}</p><p>{en ? "Come back for fresh perspectives. The diagram above is ready to explore now." : "Ghé lại để đọc những góc nhìn mới. Bạn vẫn có thể khám phá diagram ở phía trên."}</p></div>}
      {state === "ready" && posts.map(post => <article key={post.id} className="landing-article"><div className="landing-article-meta"><time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString(formatLocale, { day: "numeric", month: "short", year: "numeric" })}</time><span>{post.tags.join(" · ")}</span></div><div><h3><Link href={`/blog/${encodeURIComponent(post.slug)}`}>{post.title}<ArrowUpRightIcon size={23} aria-hidden /></Link></h3>{post.excerpt && <p>{post.excerpt}</p>}</div></article>)}
    </div>
    <p className="landing-content-note">{en ? "Articles stay in their original language. Only published content appears here." : "Bài viết giữ ngôn ngữ gốc. Chỉ nội dung đã xuất bản xuất hiện tại đây."}</p>
  </section>;
}
