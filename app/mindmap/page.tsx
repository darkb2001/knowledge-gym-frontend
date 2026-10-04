"use client";
import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth, PageHeading } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";

import { Pagination } from "@/components/Pagination";
import { MAP_PAGE_SIZE, filterMapNodes, type MindmapNode } from "@/lib/knowledge-map";
type MindmapData = {
  nodes: MindmapNode[];
  edges: { source: string; target: string; relation: string }[];
};

function Mindmap() {
  const { t, locale } = useLocale();
  const [data, setData] = useState<MindmapData | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const c = (vi: string, en: string) => locale === "en" ? en : vi;

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    apiRequest<MindmapData>("/mindmap", { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được mindmap");
      });
    return () => controller.abort();
  }, [tick]);

  if (error) return <div><PageHeading title="Sơ đồ kiến thức" /><div role="alert">{t(error)} <button className="underline" onClick={() => setTick(v => v + 1)}>{t("Thử lại")}</button></div></div>;
  if (!data) return <div><PageHeading title="Sơ đồ kiến thức" /><p role="status">{t("Đang tải sơ đồ kiến thức…")}</p></div>;
  if (data.nodes.length === 0) return <div><PageHeading title="Sơ đồ kiến thức" /><p className="kg-notice">{t("Chưa có module để hiển thị.")}</p><Link className="kg-secondary mt-4" href="/learn">{t("Chọn chủ đề")}</Link></div>;

  const filtered = filterMapNodes(data.nodes, query, level, sort);
  const pages = Math.ceil(filtered.length / MAP_PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, pages));
  const nodes = filtered.slice((currentPage - 1) * MAP_PAGE_SIZE, currentPage * MAP_PAGE_SIZE);
  const width = 960;
  const height = Math.max(240, Math.ceil(nodes.length / 4) * 175 + 55);
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const columns = Math.min(4, nodes.length);
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, nodes.length - row * columns);
    positions.set(node.id, {
      x: ((column + 1) * width) / (rowCount + 1),
      y: 85 + row * 175,
    });
  });

  return <div className="kg-page gap-5">
    <PageHeading title="Sơ đồ kiến thức" description={locale === "en" ? "Find modules to revisit and choose how to practise. Open the diagram to see connections." : "Tìm module cần ôn lại và chọn cách luyện. Mở sơ đồ để xem các kết nối kiến thức."} />
    <div className="grid items-end gap-4 sm:grid-cols-3"><label className="block text-sm"><span className="mb-2 block">{c("Tìm module", "Search modules")}</span><input type="search" className="kg-field" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></label><label className="block text-sm"><span className="mb-2 block">{c("Mức độ nắm vững", "Mastery level")}</span><select className="kg-field" value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}><option value="">{c("Tất cả", "All")}</option><option value="weak">{c("Cần ôn thêm · dưới 40%", "Needs practice · below 40%")}</option><option value="learning">{c("Đang củng cố · 40–74%", "Developing · 40–74%")}</option><option value="strong">{c("Nắm vững · từ 75%", "Strong · 75% or higher")}</option></select></label><label className="block text-sm"><span className="mb-2 block">{c("Sắp xếp", "Sort by")}</span><select className="kg-field" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="name">{c("Tên module", "Module name")}</option><option value="weak">{c("Cần ôn trước", "Lowest mastery first")}</option></select></label></div>
    <p className="text-sm tabular-nums text-subtle">{nodes.length} / {filtered.length} {c("module khớp · tối đa 12 trên mỗi trang", "matching modules · up to 12 per page")}</p>
    {!nodes.length && <p className="kg-notice">{c("Không có module khớp. Thử từ khóa khác hoặc bỏ bộ lọc mức độ nắm vững.", "No matching modules. Try another term or clear the mastery filter.")}</p>}
    <ul data-map-list className="divide-y divide-line rounded-xl border border-line bg-surface">{nodes.map(node => <li key={node.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><h2 className="break-words text-lg">{node.name}</h2><p className="mt-1 text-sm tabular-nums text-subtle">{node.questionCount} {t("câu hỏi")} · {t("Mức độ nắm vững")}: {Math.round(Math.max(0, Math.min(100, Number(node.masteryPct) || 0)))}%</p></div><div className="flex flex-wrap gap-2"><Link className="kg-secondary" href={`/questions?moduleId=${encodeURIComponent(node.id)}`}>{t("Đọc & khám phá")}</Link><Link className="kg-secondary" href={`/quiz/${encodeURIComponent(node.id)}`}>{t("Luyện trắc nghiệm")}</Link></div></li>)}</ul>
    {nodes.length > 0 && <details><summary>{locale === "en" ? "View module connections" : "Xem sơ đồ kết nối module"}</summary><p className="mt-3 text-sm text-subtle">{c("Sơ đồ chỉ hiển thị các module trên trang hiện tại. Lọc hoặc chuyển trang để xem nhóm khác.", "The diagram shows only modules on this page. Filter or change pages to view another group.")}</p><p className="my-3 text-sm text-subtle">{t("Kích thước nút biểu thị số câu hỏi; màu biểu thị mastery. Các đường nối thể hiện module cùng topic.")}</p>
    <div tabIndex={0} role="region" aria-label={t("Sơ đồ module kiến thức")} className="overflow-x-auto rounded-xl border border-line bg-surface/50 p-4">
      <svg role="group" aria-label={t("Sơ đồ module kiến thức")} viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full">
        <g aria-hidden="true">
          {data.edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#59636f" strokeWidth="2" strokeDasharray="5 5" />;
          })}
        </g>
        {nodes.map((node) => {
          const point = positions.get(node.id)!;
          const radius = Math.max(40, Math.min(60, 32 + Math.sqrt(node.questionCount) * 3));
          const mastery = Math.max(0, Math.min(100, Number(node.masteryPct) || 0));
          const fill = mastery >= 75 ? "#dce7d9" : mastery >= 40 ? "#e3edf0" : "#e8dfcd";
          return <g key={node.id} role="button" tabIndex={0} aria-label={`${node.name}, ${t("Mức độ nắm vững")} ${mastery}%, ${node.questionCount} ${t("câu hỏi")}`} onClick={() => router.push(`/quiz/${node.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/quiz/${node.id}`); } }} className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><title>{node.name}</title>
            <circle cx={point.x} cy={point.y} r={radius} fill={fill} stroke="#7d877f" strokeWidth="1" />
            <text x={point.x} y={point.y + 5} textAnchor="middle" fill="#273c4a" fontSize="18" fontWeight="600">{mastery.toFixed(0)}%</text>
            <text x={point.x} y={point.y + radius + 22} textAnchor="middle" fill="#273c4a" fontSize="13" fontWeight="600">{node.name.length > 22 ? `${node.name.slice(0, 20)}…` : node.name}</text>
            <text x={point.x} y={point.y + radius + 40} textAnchor="middle" fill="#43525a" fontSize="12">{node.questionCount} {t("câu hỏi")}</text>
          </g>;
        })}
      </svg>
    </div>
    <p className="mt-3 text-sm text-body">{t("Chọn một module để bắt đầu quiz.")}</p><p className="mt-2 text-xs text-subtle lg:hidden">{t("Trên màn hình nhỏ, vuốt ngang để xem các module.")}</p></details>}
    <Pagination page={currentPage} totalPages={pages} onChange={setPage} />
  </div>;
}

export default function MindmapPage() {
  return <RequireAuth><Mindmap /></RequireAuth>;
}
