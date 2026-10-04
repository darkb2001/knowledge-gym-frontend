"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon as ArrowRight, FireIcon as Fire, MedalIcon as Medal } from "@phosphor-icons/react";
import { RequireAuth, PageHeading } from "@/components/ui";
import { useLocale } from "@/components/locale";
import KnowledgeRadar from "@/components/KnowledgeRadar";
import HeatmapCalendar from "@/components/HeatmapCalendar";
import Leaderboard from "@/components/Leaderboard";
import { loadDashboard, type DashboardData } from "@/lib/dashboard";

function Dashboard() {
  const { t, locale, formatLocale } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal).then(value => { if (!controller.signal.aborted) { setData(value); setError(""); } }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được dashboard"); });
    return () => controller.abort();
  }, [reload]);
  return <div>
    <PageHeading title="Tiến độ học tập" description="Nhìn lại những gì bạn đã học và chọn điều muốn luyện tiếp." action={<Link href="/learn" className="kg-secondary">{t("Tiếp tục khám phá")}<ArrowRight size={18} aria-hidden /></Link>} />
    {error && <div role="alert">{t(error)}<button type="button" onClick={() => setReload(value => value + 1)} className="ml-4 underline">{t("Thử lại")}</button></div>}
    {!data && !error && <p role="status" className="kg-panel text-subtle">{t("Đang tải tiến độ…")}</p>}
    {data && <>
      <div className="mb-8 flex flex-wrap gap-x-9 gap-y-4 border-y border-line/70 py-5 text-sm">
        <div className="flex items-center gap-3"><Fire size={22} className="text-warning" aria-hidden /><span className="text-subtle">{t("Ngày liên tiếp")}</span><strong className="tabular-nums text-strong">{data.stats.currentStreak.toLocaleString(formatLocale)}</strong></div>
        <div className="flex items-center gap-3"><Medal size={22} className="text-accent" aria-hidden /><span className="text-subtle">{t("Kinh nghiệm tích lũy")}</span><strong className="tabular-nums text-strong">{data.stats.xp.toLocaleString(formatLocale)} XP</strong></div>
      </div>
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
  </div>;
}
export default function DashboardPage() { return <RequireAuth><Dashboard /></RequireAuth>; }
