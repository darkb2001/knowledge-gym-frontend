"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftIcon as ArrowLeft, CheckIcon as Check, CopyIcon as Copy, RssIcon as Rss } from "@phosphor-icons/react";
import { getApiBase } from "@/lib/api-client";
import { useLocale } from "@/components/locale";
import { PublicShell, PageHeading } from "@/components/ui";

type FeedPost = { id: string; title: string; slug: string; publishedAt: string };

const FALLBACK_ORIGIN = "https://app.darkb-tech.io.vn";

export default function BlogRssPage() {
  const { t, formatLocale } = useLocale();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`${getApiBase()}/blog/posts?page=1&size=20`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Không tải được bài viết");
      return response.json() as Promise<FeedPost[]>;
    }).then(value => { if (!controller.signal.aborted) setPosts(Array.isArray(value) ? value : []); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Lỗi tải blog"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const feedUrl = `${origin}/feed.xml`;
  const readerUrl = `https://feedly.com/i/subscription/feed/${encodeURIComponent(feedUrl)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  return <PublicShell>
    <PageHeading title="Nguồn RSS" description="Theo dõi bài viết mới bằng trình đọc tin bạn đang dùng." />
    <section className="kg-panel mt-6">
      <h2 className="text-lg font-semibold text-strong">{t("Liên kết nguồn tin")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-subtle">{t("Dán liên kết này vào Feedly, Inoreader, NetNewsWire hoặc bất kỳ trình đọc RSS nào. Tệp XML luôn hợp lệ kể cả khi chưa có bài viết.")}</p>
      <p className="mt-4 break-all rounded-xl border border-line bg-sand/50 px-4 py-3 font-mono text-[13px] text-body">{feedUrl}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={copy} className="kg-button"><Copy size={18} aria-hidden />{t("Sao chép liên kết")}</button>
        <a href="/feed.xml" target="_blank" rel="noreferrer" className="kg-secondary"><Rss size={18} aria-hidden />{t("Mở tệp XML")}</a>
        <a href={readerUrl} target="_blank" rel="noreferrer" className="kg-secondary">{t("Theo dõi bằng Feedly")}</a>
        <Link href="/blog" className="kg-secondary"><ArrowLeft size={18} aria-hidden />{t("Về trang bài viết")}</Link>
      </div>
      {copied && <p role="status" className="mt-4 inline-flex items-center gap-2 px-0 text-sm text-positive"><Check size={18} aria-hidden />{t("Đã sao chép liên kết nguồn tin.")}</p>}
    </section>
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-strong">{t("Bài viết gần đây")}</h2>
      {loading && <p role="status" className="kg-panel mt-4">{t("Đang tải bài viết…")}</p>}
      {error && <p role="alert" className="mt-4">{t(error)}</p>}
      {!loading && !error && posts.length === 0 && <p className="kg-panel mt-4 text-subtle">{t("Chưa có bài viết được xuất bản.")}</p>}
      <ul className="mt-4 divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/80 bg-surface">
        {posts.map(post => <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="block font-medium text-strong hover:text-accent">{post.title}</Link>
            <p className="mt-1 text-xs text-subtle">{new Date(post.publishedAt).toLocaleDateString(formatLocale)}</p>
          </div>
          <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="min-h-11 inline-flex items-center text-sm font-medium text-accent">{t("Đọc bài viết")}</Link>
        </li>)}
      </ul>
    </section>
  </PublicShell>;
}
