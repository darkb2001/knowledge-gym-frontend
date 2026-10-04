"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { RequireAdmin, PageHeading } from "@/components/ui";
import { Pagination } from "@/components/Pagination";
import { PostEditor } from "@/components/admin/PostEditor";
import { useAdminCatalog } from "@/components/admin/use-catalog";
import { AdminField, adminError, PendingBackend, useAdminCopy } from "@/components/admin/shared";
import { apiRequest } from "@/lib/api-client";
import { blogListEnabled, collectPosts, isUuid, type AdminPost } from "@/lib/admin-content";
import type { PageResponse } from "@/lib/types";

function BlogWorkspace() {
  const { c, locale } = useAdminCopy();
  const catalog = useAdminCatalog();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [selected, setSelected] = useState<AdminPost | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [tick, setTick] = useState(0);
  const selection = useRef<AbortController | null>(null);
  useEffect(() => () => selection.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    (async () => {
      if (blogListEnabled) {
        const params = new URLSearchParams({ page: String(page), size: "10" });
        if (search) params.set("q", search); if (status) params.set("status", status);
        return apiRequest<PageResponse<AdminPost>>(`/admin/blog/posts?${params}`, { signal: controller.signal });
      }
      const queue = await apiRequest<AdminPost[]>("/admin/blog/writer/review", { signal: controller.signal });
      const matching = queue.filter(post => post.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
      return { items: matching.slice((page - 1) * 10, page * 10), page, size: 10, totalElements: matching.length, totalPages: Math.ceil(matching.length / 10) };
    })().then(data => {
      if (controller.signal.aborted) return;
      if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
      setPosts(data.items); setPages(data.totalPages);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, search, status, tick]);
  const discard = () => !dirty || window.confirm(c("Bỏ bản nháp chưa lưu để mở bài khác?", "Discard the unsaved draft and open another article?"));
  async function open(postId: string) {
    if (!isUuid(postId) || !discard()) return;
    selection.current?.abort(); const controller = new AbortController(); selection.current = controller;
    setOpening(true); setError(null);
    try { const post = await apiRequest<AdminPost>(`/admin/blog/writer/posts/${encodeURIComponent(postId)}`, { signal: controller.signal }); if (!controller.signal.aborted) { setSelected(post); setEditorKey(value => value + 1); setDirty(false); } }
    catch (reason) { if (!controller.signal.aborted) setError(reason); }
    finally { if (!controller.signal.aborted) setOpening(false); }
  }
  async function collect() {
    if (collecting || !window.confirm(c("Thu thập nội dung từ các nguồn backend đã cấu hình? Thao tác sẽ cập nhật dữ liệu nguồn.", "Collect content from configured backend sources? This updates source data."))) return;
    setCollecting(true); setError(null); setMessage("");
    try { const result = await collectPosts(); setMessage(`${c("Đã thu thập nội dung", "Content collected")}: ${JSON.stringify(result)}`); setTick(value => value + 1); }
    catch (reason) { setError(reason); } finally { setCollecting(false); }
  }
  return <div className="kg-page">
    <PageHeading title={c("Biên tập bài viết", "Blog editor")} description={c("Viết nội dung của bạn, xem trước và xuất bản khi đã sẵn sàng.", "Write your own content, preview it and publish when ready.")} action={<Link href="/admin/writer" className="kg-secondary">{c("Writer & lịch sử phiên bản", "Writer & revision history")}</Link>} />
    {!blogListEnabled && <div className="mb-6"><PendingBackend>{c("Danh sách hiện là hàng đợi duyệt, không phải toàn bộ bài viết. Danh sách đầy đủ đang chờ API mới. Có thể mở bất kỳ bài viết nào bằng ID hoặc tạo bản nháp thủ công bên dưới.", "This list is the review queue, not all articles. The complete list awaits a new API. Open an existing article by ID or create a manual draft below.")}</PendingBackend></div>}
    {Boolean(error) && <p role="alert" className="mb-5">{adminError(error, locale === "en")} <button type="button" className="underline" onClick={() => setTick(value => value + 1)}>{c("Thử lại", "Retry")}</button></p>}
    {Boolean(catalog.error) && <p role="alert" className="mb-5">{adminError(catalog.error, locale === "en")} <button type="button" className="underline" onClick={catalog.reload}>{c("Tải lại module", "Retry modules")}</button></p>}
    {message && <p role="status" className="mb-5 break-words">{message}</p>}
    <div className="grid min-w-0 gap-7 xl:grid-cols-[280px_minmax(0,1fr)]">
      <section className="min-w-0 space-y-5" aria-label={c("Danh sách bài viết quản trị", "Admin article list")}>
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg">{blogListEnabled ? c("Bài viết", "Articles") : c("Hàng đợi duyệt", "Review queue")}</h2><button type="button" className="kg-button !px-3" onClick={() => { if (!discard()) return; selection.current?.abort(); setOpening(false); setSelected(null); setEditorKey(value => value + 1); setDirty(false); }}><PlusIcon size={17} aria-hidden />{c("Tạo mới", "New")}</button></div>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}><AdminField label={c("Tìm bài viết", "Search articles")}><input className="kg-field" value={query} onChange={event => setQuery(event.target.value)} /></AdminField>{blogListEnabled && <AdminField label={c("Trạng thái", "Status")}><select className="kg-field" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">{c("Tất cả", "All")}</option>{["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED", "HIDDEN", "DELETED"].map(value => <option key={value}>{value}</option>)}</select></AdminField>}<button className="kg-secondary w-full">{c("Tìm", "Search")}</button></form>
        {loading ? <p role="status">{c("Đang tải…", "Loading…")}</p> : !posts.length ? <p className="text-sm text-subtle">{c("Chưa có bài viết trong danh sách này.", "There are no articles in this list yet.")}</p> : <ul className="space-y-1">{posts.map(post => <li key={post.id}><button type="button" className={`w-full rounded-xl p-4 text-left hover:bg-muted ${selected?.id === post.id ? "bg-sage" : ""}`} disabled={opening} onClick={() => void open(post.id)} aria-pressed={selected?.id === post.id}><span className="mb-2 block text-xs text-subtle">{post.status}</span><span className="block break-words text-sm font-medium text-strong">{post.title}</span></button></li>)}</ul>}
        <form className="space-y-3 border-t border-line pt-5" onSubmit={event => { event.preventDefault(); void open(id.trim()); }}><AdminField label={c("Mở bài viết theo ID", "Open article by ID")}><input className="kg-field font-mono text-sm" value={id} onChange={event => setId(event.target.value)} /></AdminField><button className="kg-secondary w-full" disabled={opening || !isUuid(id.trim())}>{c("Mở bài viết", "Open article")}</button></form>
        <button type="button" className="kg-secondary w-full" disabled={collecting} onClick={() => void collect()}>{collecting ? c("Đang thu thập…", "Collecting…") : c("Thu thập nguồn bài viết", "Collect article sources")}</button>
      </section>
      <section className="kg-panel min-w-0" aria-label={c("Vùng biên tập bài viết", "Article editor")}>
        {opening ? <p role="status">{c("Đang mở bài viết…", "Opening article…")}</p> : <PostEditor key={`${selected?.id ?? "new"}-${editorKey}`} post={selected} modules={catalog.modules} onDirty={setDirty} onSaved={() => setTick(value => value + 1)} />}
      </section>
    </div>
    <Pagination page={page} totalPages={pages} onChange={setPage} disabled={loading} />
  </div>;
}
export default function AdminPostsPage() { return <RequireAdmin><BlogWorkspace /></RequireAdmin>; }
