"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRightIcon as ArrowRight, BookOpenIcon as BookOpen, CardsIcon as Cards, MagnifyingGlassIcon as MagnifyingGlass, ExamIcon as Exam, CompassIcon as Compass } from "@phosphor-icons/react";
import { RequireAuth, PageHeading, ContentLanguageNotice } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { listModules, listTopics, listTracks } from "@/lib/questions";
import { TOPIC_PREVIEW_LIMIT, filterModules, filterModulesByTrack, groupModulesByTopic } from "@/lib/catalog";
import type { Module, Topic, Track } from "@/lib/types";

type PracticeMode = { icon: typeof BookOpen; label: string; description: string; href: string };

function PracticeLinks({ modes }: { modes: PracticeMode[] }) {
  const { t } = useLocale();
  return <div className="space-y-4">{modes.map(({ icon: Icon, label, description, href }) => <div key={href}><Link href={href} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline"><Icon size={20} aria-hidden />{t(label)}<ArrowRight size={16} aria-hidden className="ml-auto" /></Link><p className="mt-1 text-xs leading-relaxed text-body">{t(description)}</p></div>)}</div>;
}

function ModuleCard({ module, topicName, active, onSelect, questionLabel, modes }: { module: Module; topicName: string; active: boolean; onSelect: () => void; questionLabel: string; modes: PracticeMode[] }) {
  const { t, formatLocale } = useLocale();
  const panelId = useId();
  const count = module.questionCount.toLocaleString(formatLocale);
  return <div data-module-card={module.id} className={`min-w-0 self-start rounded-2xl border ${active ? "border-positive/40 bg-sage/70" : "border-line/80 bg-surface"}`}>
    <button type="button" aria-pressed={active} aria-expanded={active} aria-controls={`${panelId} practice-options`} onClick={onSelect} className="group flex min-h-32 w-full flex-col gap-2 rounded-2xl p-4 text-left transition-colors hover:bg-muted/50 sm:p-5">
    <span className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-positive/10 text-positive" : "bg-muted text-accent"}`}><BookOpen size={21} weight={active ? "fill" : "regular"} aria-hidden /></span>
      <span className="min-w-0 text-xs text-subtle">{topicName}</span>
      <ArrowRight size={18} aria-hidden className={`ml-auto shrink-0 ${active ? "text-positive" : "text-subtle group-hover:text-accent"}`} />
    </span>
    <span className="block break-words text-base font-semibold leading-snug tracking-[-0.01em] text-strong sm:text-lg">{module.name}</span>
    {module.description ? <span className="line-clamp-2 block text-sm leading-relaxed text-subtle">{module.description}</span> : null}
    <span className="mt-auto block text-xs tabular-nums text-body">{count} {questionLabel}</span>
    </button>
    <div id={panelId} hidden={!active} role="group" aria-label={t("Bạn chọn cách học")} className="border-t border-positive/20 p-4 sm:p-5 xl:hidden"><h3 className="mb-3 text-sm font-semibold">{t("Bạn chọn cách học")}</h3><PracticeLinks modes={modes} /></div>
  </div>;
}

function TopicExplorer() {
  const { t, formatLocale } = useLocale();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [trackSlug, setTrackSlug] = useState("");
  const [topicId, setTopicId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([
      listTopics(controller.signal),
      listModules(undefined, controller.signal),
      // `/tracks` là tính năng mới: BE cũ chưa có endpoint thì bỏ qua, không chặn trang.
      listTracks(controller.signal).catch(() => [] as Track[]),
    ])
      .then(([nextTopics, nextModules, nextTracks]) => {
        if (controller.signal.aborted) return;
        setTopics([...nextTopics].sort((a, b) => a.displayOrder - b.displayOrder));
        setModules(nextModules);
        setTracks([...nextTracks].sort((a, b) => a.displayOrder - b.displayOrder));
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được chủ đề"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const scopedTopics = useMemo(() => (trackSlug ? topics.filter(topic => topic.track === trackSlug) : topics), [topics, trackSlug]);
  const visible = useMemo(() => (topicId ? filterModules(modules, topics, topicId, query) : filterModulesByTrack(modules, topics, trackSlug, query)), [modules, topics, topicId, trackSlug, query]);
  const groups = useMemo(() => (topicId ? [] : groupModulesByTopic(visible, topics, trackSlug)), [topicId, visible, topics, trackSlug]);
  const selected = visible.find(module => module.id === selectedId);
  const chosenTopic = topics.find(topic => topic.id === topicId);
  const number = (value: number) => value.toLocaleString(formatLocale);
  const searching = query.trim().length > 0;
  const modes = selected ? [
    { icon: BookOpen, label: "Đọc & khám phá", description: "Đọc câu hỏi, tìm hiểu đáp án và kết nối kiến thức.", href: `/questions?moduleId=${encodeURIComponent(selected.id)}` },
    { icon: Cards, label: "Ôn flashcard", description: "Tự kiểm tra trí nhớ với lịch ôn cách quãng.", href: `/flashcard/${encodeURIComponent(selected.id)}` },
    { icon: Exam, label: "Luyện trắc nghiệm", description: "Kiểm tra kiến thức và xem lại những câu chưa đúng.", href: `/quiz/${encodeURIComponent(selected.id)}` },
  ] : [];

  const resetGrouping = () => { setExpanded({}); setSelectedId(""); };

  return <div>
    <PageHeading title="Bạn muốn học gì hôm nay?" description="Chọn một chủ đề, tìm module phù hợp rồi bắt đầu theo cách bạn thích." />
    <div className="mb-6 max-w-2xl"><label htmlFor="topic-search" className="sr-only">{t("Tìm chủ đề hoặc module")}</label><div className="relative"><MagnifyingGlass size={21} aria-hidden className="pointer-events-none absolute left-4 top-3.5 text-subtle" /><input id="topic-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Ví dụ: Java, Spring, cơ sở dữ liệu…")} className="kg-field pl-12" /></div></div>
    {error ? <div role="alert" className="mb-6">{t(error)}<button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-4 font-medium underline">{t("Thử lại")}</button></div> : null}
    {loading ? <div role="status" className="kg-panel flex min-h-64 items-center justify-center text-subtle">{t("Đang tải chủ đề…")}</div> : !error && <>
      {tracks.length > 0 && <section className="mb-6 rounded-xl border border-line bg-muted/60 p-4 sm:p-5" aria-labelledby="learn-track-title"><h2 id="learn-track-title" className="text-base">{t("Loại nội dung")}</h2><p className="mb-4 mt-1 text-sm leading-relaxed text-subtle">{t("Chọn mảng kiến thức trước, rồi chọn chủ đề bên dưới.")}</p><div className="flex flex-wrap gap-2" role="group" aria-labelledby="learn-track-title">
        <button type="button" aria-pressed={!trackSlug} onClick={() => { setTrackSlug(""); setTopicId(""); resetGrouping(); }} className={`min-h-11 rounded-lg border px-5 text-sm font-semibold transition-colors ${!trackSlug ? "border-strong bg-strong text-on-accent" : "border-line bg-surface text-body hover:bg-muted"}`}>{t("Tất cả nội dung")}</button>
        {tracks.map(track => <button key={track.slug} type="button" aria-pressed={track.slug === trackSlug} onClick={() => { setTrackSlug(track.slug); setTopicId(""); resetGrouping(); }} className={`min-h-11 rounded-lg border px-5 text-sm font-semibold transition-colors ${track.slug === trackSlug ? "border-strong bg-strong text-on-accent" : "border-line bg-surface text-body hover:bg-muted"}`}>{track.name}</button>)}
      </div></section>}
      <section className="mb-8 border-b border-line pb-6" aria-labelledby="learn-topic-title"><h2 id="learn-topic-title" className="text-base">{t("Chủ đề")}{trackSlug && <span className="font-normal text-subtle"> · {tracks.find(track => track.slug === trackSlug)?.name ?? trackSlug}</span>}</h2><p className="mb-4 mt-1 text-sm leading-relaxed text-subtle">{t("Chọn chủ đề để lọc module. Bấm một module để mở các cách học ngay tại đó.")}</p><div className="flex flex-wrap gap-2" role="group" aria-labelledby="learn-topic-title">
        <button type="button" aria-pressed={!topicId} onClick={() => { setTopicId(""); resetGrouping(); }} className={`min-h-11 rounded-full border px-5 text-sm font-medium ${!topicId ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-body hover:bg-muted"}`}>{t("Tất cả chủ đề")}</button>
        {scopedTopics.map(topic => <button key={topic.id} type="button" aria-pressed={topic.id === topicId} onClick={() => { setTopicId(topic.id); resetGrouping(); }} className={`min-h-11 rounded-full border px-5 text-sm font-medium transition-colors ${topic.id === topicId ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-body hover:bg-muted"}`}>{topic.name}</button>)}
      </div></section>
      {topics.length === 0 && <p className="mb-6 text-subtle">{t("Chưa có chủ đề để hiển thị.")}</p>}
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0" aria-labelledby="module-directory-title">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3"><h2 id="module-directory-title" className="text-xl">{chosenTopic?.name ?? t("Các module")}</h2><span className="text-sm tabular-nums text-subtle">{number(visible.length)} {t("module")}</span></div>
          {chosenTopic?.description && <p className="mb-5 max-w-2xl text-sm leading-relaxed text-subtle">{chosenTopic.description}</p>}
          {visible.length === 0 ? <div className="rounded-2xl border border-line/80 bg-surface p-8"><p className="text-subtle">{t(searching ? "Không có module khớp tìm kiếm." : "Chưa có module trong chủ đề này.")}</p>{searching && <button type="button" onClick={() => setQuery("")} className="kg-secondary mt-4">{t("Xóa tìm kiếm")}</button>}</div>
            : chosenTopic ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(module => <ModuleCard key={module.id} module={module} topicName={chosenTopic.name} active={selected?.id === module.id} onSelect={() => setSelectedId(current => current === module.id ? "" : module.id)} questionLabel={t("câu hỏi")} modes={modes} />)}</div>
              : <div className="space-y-9">{groups.map(({ topic, modules: topicModules }) => {
                const open = searching || Boolean(expanded[topic.id]);
                const overflow = topicModules.length - TOPIC_PREVIEW_LIMIT;
                const shown = open ? topicModules : topicModules.slice(0, TOPIC_PREVIEW_LIMIT);
                return <div key={topic.id}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-base font-semibold text-strong">{topic.name}</h3><span className="text-xs tabular-nums text-subtle">{number(topicModules.length)} {t("module")}</span></div>
                  <div id={`group-${topic.id}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map(module => <ModuleCard key={module.id} module={module} topicName={topic.name} active={selected?.id === module.id} onSelect={() => setSelectedId(current => current === module.id ? "" : module.id)} questionLabel={t("câu hỏi")} modes={modes} />)}</div>
                  {overflow > 0 && <button type="button" aria-expanded={open} aria-controls={`group-${topic.id}`} onClick={() => setExpanded(state => ({ ...state, [topic.id]: !state[topic.id] }))} className="kg-secondary mt-4">{open ? t("Thu gọn") : `${t("Xem thêm")} ${number(overflow)} ${t("module")}`}</button>}
                </div>;
              })}</div>}
          <ContentLanguageNotice />
        </section>
        <aside id="practice-options" aria-labelledby="practice-options-title" className={`rounded-2xl bg-sand/65 p-6 xl:sticky xl:top-8 hidden xl:block`}>
          {selected ? <><p className="mb-2 text-sm text-subtle">{t("Bạn chọn cách học")}</p><h2 id="practice-options-title" className="break-words text-2xl">{selected.name}</h2><div className="mt-6"><PracticeLinks modes={modes} /></div></> : <><Compass size={36} weight="duotone" className="mb-5 text-accent" aria-hidden /><h2 id="practice-options-title" className="text-xl">{t("Bắt đầu từ đây")}</h2><p className="mt-3 text-sm leading-relaxed text-body">{t("Chọn module để xem các cách luyện tập.")}</p></>}
          <div className="mt-7 border-t border-line pt-5"><Link href="/questions" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline">{t("Khám phá câu hỏi")}<ArrowRight size={17} aria-hidden /></Link></div>
        </aside>
      </div>
    </>}
  </div>;
}

export default function LearnPage() { return <RequireAuth><TopicExplorer /></RequireAuth>; }
