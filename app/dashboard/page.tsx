"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon as ArrowRight, FireIcon as Fire, MedalIcon as Medal } from "@phosphor-icons/react";
import { RequireAuth, PageHeading } from "@/components/ui";
import { useLocale } from "@/components/locale";
import KnowledgeRadar from "@/components/KnowledgeRadar";
import HeatmapCalendar from "@/components/HeatmapCalendar";
import Leaderboard from "@/components/Leaderboard";
import { KnowledgeMapPanel } from "@/components/KnowledgeMapPanel";
import { loadDashboard, type DashboardData } from "@/lib/dashboard";
import { listDue } from "@/lib/srs";

type DashTab = "overview" | "map";

function DashboardTabs({ tab, onChange }: { tab: DashTab; onChange: (tab: DashTab) => void }) {
  const { locale } = useLocale();
  const c = (vi: string, en: string) => (locale === "en" ? en : vi);
  const items: { id: DashTab; label: string }[] = [
    { id: "overview", label: c("Tổng quan", "Overview") },
    { id: "map", label: c("Bản đồ kiến thức", "Knowledge map") },
  ];
  return (
    <div role="tablist" aria-label={c("Khu vực bảng điều khiển", "Dashboard sections")} className="mb-7 flex flex-wrap gap-1 border-b border-line">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`dashboard-tab-${item.id}`}
          aria-selected={tab === item.id}
          aria-controls={`dashboard-panel-${item.id}`}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            const index = items.findIndex((i) => i.id === tab);
            const next = event.key === "ArrowRight" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
            onChange(items[next].id);
          }}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === item.id ? "border-accent text-strong" : "border-transparent text-subtle hover:text-strong"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * CTA "Ôn tập hôm nay": số thẻ đến hạn tải riêng (lazy) nên dashboard không chờ nó.
 * Không lấy được số thì ẩn badge, vẫn giữ link sang `/review`.
 */
function ReviewCta() {
  const { t, locale } = useLocale();
  const c = (vi: string, en: string) => (locale === "en" ? en : vi);
  const [due, setDue] = useState<number | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    listDue({ limit: 100 }, ac.signal)
      .then((cards) => { if (!ac.signal.aborted) setDue(cards.length); })
      .catch(() => { if (!ac.signal.aborted) setDue(null); });
    return () => ac.abort();
  }, []);
  return (
    <section className="kg-panel mb-8 flex flex-wrap items-center justify-between gap-4" aria-labelledby="review-cta-heading">
      <div className="min-w-0">
        <h2 id="review-cta-heading" className="flex items-center gap-3 text-xl">
          {t("Ôn tập hôm nay")}
          {due !== null && due > 0 ? (
            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold tabular-nums text-on-accent">{due}</span>
          ) : null}
        </h2>
        <p className="mt-1 text-sm text-subtle">
          {due !== null
            ? `${due} ${c("thẻ đến hạn hôm nay", "cards due today")}`
            : c("Các thẻ đến hạn hôm nay đang chờ bạn.", "Cards due today are waiting for you.")}
        </p>
      </div>
      <Link href="/review" className="kg-button">{c("Bắt đầu ôn", "Start review")}<ArrowRight size={18} aria-hidden /></Link>
    </section>
  );
}

function Dashboard() {
  const { t, locale, formatLocale } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab: DashTab = searchParams.get("tab") === "map" ? "map" : "overview";
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal).then(value => { if (!controller.signal.aborted) { setData(value); setError(""); } }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được dashboard"); });
    return () => controller.abort();
  }, [reload]);

  // Tab nằm ở query `?tab=map` để deep-link được và sống sót qua F5; mặc định là Tổng quan.
  const changeTab = (next: DashTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "map") params.set("tab", "map"); else params.delete("tab");
    const query = params.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
  };

  return <div>
    <PageHeading title="Tiến độ học tập" description="Nhìn lại những gì bạn đã học và chọn điều muốn luyện tiếp." action={<Link href="/learn" className="kg-secondary">{t("Tiếp tục khám phá")}<ArrowRight size={18} aria-hidden /></Link>} />
    <DashboardTabs tab={tab} onChange={changeTab} />
    {tab === "map" ? (
      <div role="tabpanel" id="dashboard-panel-map" aria-labelledby="dashboard-tab-map">
        <KnowledgeMapPanel />
      </div>
    ) : (
      <div role="tabpanel" id="dashboard-panel-overview" aria-labelledby="dashboard-tab-overview">
        {error && <div role="alert">{t(error)}<button type="button" onClick={() => setReload(value => value + 1)} className="ml-4 underline">{t("Thử lại")}</button></div>}
        {!data && !error && <p role="status" className="kg-panel text-subtle">{t("Đang tải tiến độ…")}</p>}
        {data && <>
          <div className="mb-8 flex flex-wrap gap-x-9 gap-y-4 border-y border-line/70 py-5 text-sm">
            <div className="flex items-center gap-3"><Fire size={22} className="text-warning" aria-hidden /><span className="text-subtle">{t("Ngày liên tiếp")}</span><strong className="tabular-nums text-strong">{data.stats.currentStreak.toLocaleString(formatLocale)}</strong></div>
            <div className="flex items-center gap-3"><Medal size={22} className="text-accent" aria-hidden /><span className="text-subtle">{t("Kinh nghiệm tích lũy")}</span><strong className="tabular-nums text-strong">{data.stats.xp.toLocaleString(formatLocale)} XP</strong></div>
          </div>
          <ReviewCta />
          <section className="mb-8" aria-labelledby="next-practice-heading">
            <h2 id="next-practice-heading" className="text-xl">{locale === "en" ? "What to practise next" : "Bạn nên luyện gì tiếp?"}</h2>
            <p className="mt-2 text-sm text-subtle">{locale === "en" ? "Modules with the lowest recorded mastery. Choose one to review or test yourself." : "Các module có mức độ nắm vững thấp nhất theo dữ liệu đã ghi nhận. Chọn để ôn lại hoặc tự kiểm tra."}</p>
            {!data.radar.length ? <div className="mt-4 kg-notice"><p>{locale === "en" ? "No mastery data yet. Start with a topic you want to understand." : "Chưa có dữ liệu nắm vững. Bắt đầu từ chủ đề bạn muốn hiểu."}</p><Link className="kg-button mt-4" href="/learn">{t("Chọn chủ đề")}</Link></div> : <ul className="mt-4 divide-y divide-line border-y border-line">{[...data.radar].sort((a, b) => a.masteryPct - b.masteryPct).slice(0, 3).map(module => <li key={module.moduleId} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><h3 className="break-words text-base">{module.name}</h3><p className="mt-1 text-sm tabular-nums text-subtle">{locale === "en" ? "Recorded mastery" : "Mức độ nắm vững"}: {Math.round(Math.max(0, Math.min(100, module.masteryPct)))}%</p></div><div className="flex flex-wrap gap-2"><Link className="kg-secondary" href={`/flashcard/${encodeURIComponent(module.moduleId)}`}>{t("Ôn flashcard")}</Link><Link className="kg-secondary" href={`/quiz/${encodeURIComponent(module.moduleId)}`}>{t("Luyện trắc nghiệm")}</Link></div></li>)}</ul>}
          </section>
          <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
            <section className="kg-panel min-w-0"><h2 className="text-xl">{t("Mastery theo module")}</h2><KnowledgeRadar modules={data.radar} /></section>
            <div className="min-w-0 space-y-6"><section className="kg-panel"><h2 className="mb-6 text-xl">{t("Hoạt động · 90 ngày")}</h2><HeatmapCalendar days={data.heatmap} /></section><section className="kg-panel"><h2 className="text-xl">{t("Bảng xếp hạng")}</h2><p className="mb-5 mt-1 text-sm text-subtle">{t("Top người học theo XP")}</p><Leaderboard users={data.leaderboard} /></section></div>
          </div>
        </>}
      </div>
    )}
  </div>;
}

export default function DashboardPage() {
  const { t } = useLocale();
  // `useSearchParams` đưa route vào chế độ client-render — Next cần Suspense để shell vẫn prerender được.
  return <RequireAuth>
    <Suspense fallback={<p className="kg-panel text-subtle">{t("Đang tải tiến độ…")}</p>}>
      <Dashboard />
    </Suspense>
  </RequireAuth>;
}
