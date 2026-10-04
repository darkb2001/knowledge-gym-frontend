"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon as MagnifyingGlass } from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api-client";
import { PageHeading, RequireAuth, inputClass } from "@/components/ui";

type HitType = "question" | "module" | "post";
type Hit = { type: HitType; id: string; title: string; excerpt: string; href: string };

const MIN_QUERY = 2;
const GROUPS: { type: HitType; label: string; empty: string }[] = [
  { type: "question", label: "Câu hỏi", empty: "Không có câu hỏi nào khớp." },
  { type: "module", label: "Chủ đề & module", empty: "Không có chủ đề nào khớp." },
  { type: "post", label: "Bài viết", empty: "Không có bài viết nào khớp." },
];

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const asArray = (value: unknown) => (Array.isArray(value) ? (value.filter(item => item && typeof item === "object") as Record<string, unknown>[]) : []);
const asPlain = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
const firstText = (item: Record<string, unknown>, keys: string[]) => keys.map(key => asText(item[key])).find(value => value.length > 0) ?? "";

function toHit(type: HitType, item: Record<string, unknown>): Hit | null {
  const id = firstText(item, ["id", "questionId", "moduleId", "slug"]);
  if (!id) return null;
  const title = firstText(item, ["title", "name", "content", "question"]);
  const rawBody = firstText(item, ["excerpt", "snippet", "answerHtml", "description", "summary"]);
  const href = type === "question"
    ? `/questions/${encodeURIComponent(id)}`
    : type === "module"
      ? `/learn?module=${encodeURIComponent(id)}`
      : `/blog/${encodeURIComponent(asText(item.slug) || id)}`;
  return {
    type,
    id,
    title: asPlain(title).slice(0, 140) || "Không có tiêu đề",
    excerpt: asPlain(rawBody).slice(0, 220),
    href,
  };
}

/** Backend may answer with a grouped object ({questions, modules, posts}) or a flat hit list. */
function normalize(raw: unknown): Hit[] {
  if (Array.isArray(raw)) {
    return asArray(raw).map(item => toHit((asText(item.type) as HitType) || "question", item)).filter((hit): hit is Hit => hit !== null);
  }
  if (!raw || typeof raw !== "object") return [];
  const grouped = raw as Record<string, unknown>;
  const ordered: [HitType, unknown][] = [["question", grouped.questions ?? grouped.hits], ["module", grouped.modules], ["post", grouped.posts ?? grouped.blogPosts]];
  return ordered.flatMap(([type, bucket]) => asArray(bucket).map(item => toHit(type, item)).filter((hit): hit is Hit => hit !== null));
}

function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [hits, setHits] = useState<Hit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<HitType[]>([]);

  const term = query.trim();

  useEffect(() => {
    if (term.length < MIN_QUERY) { setHits([]); setStatus("idle"); setError(""); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus("loading");
      apiRequest<unknown>(`/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(next => { setHits(normalize(next)); setStatus("done"); setError(""); })
        .catch((reason: unknown) => {
          if ((reason as { name?: string })?.name === "AbortError") return;
          setError(reason instanceof Error ? reason.message : "Không tìm kiếm được, vui lòng thử lại.");
          setStatus("error");
        });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term]);

  // Giữ ?q= trên URL để chia sẻ được, nhưng không thêm một entry lịch sử mỗi lần gõ.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (term === current) return;
    const timer = setTimeout(() => {
      router.replace(term.length >= MIN_QUERY ? `/search?q=${encodeURIComponent(term)}` : "/search", { scroll: false });
    }, 500);
    return () => clearTimeout(timer);
  }, [term, params, router]);

  const toggle = (type: HitType) => setHidden(current => (current.includes(type) ? current.filter(item => item !== type) : [...current, type]));
  const visible = hits.filter(hit => !hidden.includes(hit.type));
  const countOf = (type: HitType) => hits.filter(hit => hit.type === type).length;

  return <>
    <PageHeading title="Tìm kiếm" description="Tìm trong câu hỏi, chủ đề và bài viết của Knowledge Gym." />
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
      <MagnifyingGlass size={19} className="shrink-0 text-subtle" aria-hidden />
      <input
        autoFocus
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Nhập từ khoá (tối thiểu 2 ký tự)…"
        aria-label="Từ khoá tìm kiếm"
        className={`${inputClass} border-0 bg-transparent px-0 py-0 focus:ring-0`}
      />
      {query.length > 0 && <button type="button" onClick={() => setQuery("")} className="min-h-11 shrink-0 rounded-lg px-2 text-[13px] text-body hover:text-strong">Xoá</button>}
    </div>

    {hits.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2">
      {GROUPS.map(group => {
        const on = !hidden.includes(group.type);
        return <button
          key={group.type}
          type="button"
          onClick={() => toggle(group.type)}
          aria-pressed={on}
          className={`min-h-9 rounded-full border px-3 text-[12px] font-medium transition-colors ${on ? "border-accent bg-sage text-strong" : "border-line text-subtle hover:text-strong"}`}
        >{group.label} ({countOf(group.type)})</button>;
      })}
    </div>}

    {status === "idle" && <div className="rounded-xl border border-line bg-surface p-5 text-[13px] text-body">
      <p className="mb-2 font-medium text-strong">Bắt đầu tìm kiếm</p>
      <p>Nhập ít nhất {MIN_QUERY} ký tự. Bạn cũng có thể <Link href="/learn" className="text-accent underline">chọn chủ đề</Link> hoặc <Link href="/questions" className="text-accent underline">mở thư viện câu hỏi</Link>.</p>
    </div>}

    {status === "loading" && <p className="text-[13px] text-subtle">Đang tìm…</p>}

    {status === "error" && <div className="rounded-xl border border-line bg-surface p-5 text-[13px] text-body">
      <p className="mb-1 font-medium text-strong">Không tìm kiếm được</p>
      <p className="mb-3">{error}</p>
      <button type="button" onClick={() => setQuery(value => value)} className="min-h-11 rounded-lg border border-line px-3.5 font-medium text-strong">Thử lại</button>
    </div>}

    {status === "done" && hits.length === 0 && <div className="rounded-xl border border-line bg-surface p-5 text-[13px] text-body">
      <p className="mb-2 font-medium text-strong">Không tìm thấy kết quả cho “{term}”</p>
      <p>Thử từ khoá ngắn hơn, hoặc xem <Link href="/questions" className="text-accent underline">thư viện câu hỏi</Link>.</p>
    </div>}

    {status === "done" && hits.length > 0 && visible.length === 0 && <p className="text-[13px] text-subtle">Bạn đang ẩn tất cả nhóm kết quả — bật lại một nhóm ở trên để xem.</p>}

    {GROUPS.map(group => {
      const items = visible.filter(hit => hit.type === group.type);
      if (hidden.includes(group.type) || items.length === 0) return null;
      return <section key={group.type} className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-subtle">{group.label} ({items.length})</h2>
        <ul className="space-y-2">
          {items.map(hit => <li key={`${hit.type}-${hit.id}`}>
            <Link href={hit.href} className="block rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-accent">
              <p className="text-[14px] font-medium text-strong">{hit.title}</p>
              {hit.excerpt && <p className="mt-1 text-[13px] leading-relaxed text-body">{hit.excerpt}</p>}
            </Link>
          </li>)}
        </ul>
      </section>;
    })}
  </>;
}

export default function SearchPage() {
  return <RequireAuth><Suspense fallback={<p className="text-[13px] text-subtle">Đang tải…</p>}><SearchScreen /></Suspense></RequireAuth>;
}
