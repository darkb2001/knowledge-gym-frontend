"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon as ArrowRight, RssIcon as Rss } from "@phosphor-icons/react";
import { getApiBase } from "@/lib/api-client";
import { useLocale } from "@/components/locale";
import { PublicShell, PageHeading, ContentLanguageNotice } from "@/components/ui";

type BlogPost = { id: string; title: string; slug: string; excerpt: string | null; publishedAt: string; likeCount: number; viewCount: number; tags: string[] };

const PAGE_SIZE = 9;

export default function BlogPage() {
  const { t, formatLocale } = useLocale();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const first = page === 1;
    if (first) { setLoading(true); setError(""); } else { setLoadingMore(true); }
    fetch(`${getApiBase()}/blog/posts?page=${page}&size=${PAGE_SIZE}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Không tải được bài viết");
      return response.json() as Promise<BlogPost[]>;
    }).then(value => {
      if (controller.signal.aborted) return;
      setPosts(old => first ? value : [...old, ...value]);
      setHasMore(value.length >= PAGE_SIZE);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Không tải được bài viết");
    }).finally(() => {
      if (!controller.signal.aborted) { setLoading(false); setLoadingMore(false); }
    });
    return () => controller.abort();
  }, [page, reload]);

  return <PublicShell>
    <PageHeading title="Bài viết" description="Đọc một chút. Hiểu thêm một chút." action={<Link href="/blog/rss" className="kg-secondary"><Rss size={19} aria-hidden />RSS</Link>} />
    {loading && <p role="status" className="kg-panel">{t("Đang tải bài viết…")}</p>}
    {error && <p role="alert" className="kg-panel">{t(error)}<button type="button" onClick={() => { setPage(1); setReload(value => value + 1); }} className="ml-4 inline-flex min-h-11 items-center underline">{t("Thử lại")}</button></p>}
    {!loading && !error && posts.length === 0 && <p className="kg-panel text-subtle">{t("Chưa có bài viết được xuất bản.")}</p>}
    <div className="grid gap-6 xl:grid-cols-2">{posts.map(post => <article key={post.id} className="kg-panel flex flex-col">
      <div className="mb-4 flex flex-wrap gap-2">{post.tags.map(tag => <span key={tag} className="rounded-md bg-sage/60 px-2.5 py-1 text-xs text-positive">{tag}</span>)}</div>
      <h2 className="text-2xl"><Link className="hover:text-accent" href={`/blog/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h2>
      {post.excerpt && <p className="mt-4 text-sm leading-relaxed text-body">{post.excerpt}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6"><p className="text-xs text-subtle">{new Date(post.publishedAt).toLocaleDateString(formatLocale)}<span className="mx-2">·</span>{post.viewCount} {t("lượt xem")}</p><Link href={`/blog/${encodeURIComponent(post.slug)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent">{t("Đọc bài viết")}<ArrowRight size={17} aria-hidden /></Link></div>
    </article>)}</div>
    {hasMore && <div className="mt-6 flex justify-center">
      <button type="button" onClick={() => setPage(value => value + 1)} disabled={loadingMore} className="kg-secondary min-h-11 px-5 text-sm disabled:opacity-60">
        {loadingMore ? t("Đang tải…") : t("Tải thêm bài viết")}
      </button>
    </div>}
    <ContentLanguageNotice />
  </PublicShell>;
}
