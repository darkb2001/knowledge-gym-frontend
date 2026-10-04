"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRightIcon as ArrowRight, BookOpenIcon as BookOpen, CardsIcon as Cards, MagnifyingGlassIcon as MagnifyingGlass, ExamIcon as Exam, CompassIcon as Compass } from "@phosphor-icons/react";
import { RequireAuth, PageHeading, ContentLanguageNotice } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { ChoicePicker } from "@/components/ChoicePicker";
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
    <button type="button" aria-pressed={active} aria-expanded={active} aria-controls={`${panelId} practice-options`} onClick={onSelect} className="group flex h-56 w-full flex-col gap-2 rounded-2xl p-4 text-left transition-colors hover:bg-muted/50 sm:h-60 sm:p-5">
    <span className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-positive/10 text-positive" : "bg-muted text-accent"}`}><BookOpen size={21} weight={active ? "fill" : "regular"} aria-hidden /></span>
      <span className="min-w-0 truncate text-xs text-subtle" title={topicName}>{topicName}</span>
      <ArrowRight size={18} aria-hidden className={`ml-auto shrink-0 ${active ? "text-positive" : "text-subtle group-hover:text-accent"}`} />
    </span>
    <span className="block h-[3.125rem] shrink-0" title={module.name}><span className="line-clamp-2 break-words text-base font-semibold leading-snug tracking-[-0.01em] text-strong sm:text-lg">{module.name}</span></span>
    <span className="block h-12 shrink-0" title={module.description ?? undefined}><span className="line-clamp-2 text-sm leading-relaxed text-subtle">{module.description}</span></span>
    <span className="mt-auto block text-xs tabular-nums text-body">{count} {questionLabel}</span>
    </button>
    <div id={panelId} hidden={!active} role="group" aria-label={t("Bạn chọn cách học")} className="border-t border-positive/20 p-4 sm:p-5 xl:hidden"><h3 className="mb-3 text-sm font-semibold">{t("Bạn chọn cách học")}</h3><p className="mb-2 break-words font-medium text-strong">{module.name}</p>{module.description && <p className="mb-4 break-words text-sm leading-relaxed text-body">{module.description}</p>}<PracticeLinks modes={modes} /></div>
  </div>;
}

function TopicExplorer() {
  const { t, locale, formatLocale } = useLocale();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [trackSlug, setTrackSlug] = useState("");
  const [topicId, setTopicId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const [groupLimit, setGroupLimit] = useState(4);
  const [moduleLimit, setModuleLimit] = useState(6);
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

  const resetGrouping = () => { setExpanded({}); setGroupLimit(4); setModuleLimit(6); setSelectedId(""); };
  useEffect(() => { setExpanded({}); setGroupLimit(4); setModuleLimit(6); setSelectedId(""); }, [query]);

  return <div>
    <PageHeading title="Bạn muốn học gì hôm nay?" description="Chọn một chủ đề, tìm module phù hợp rồi bắt đầu theo cách bạn thích." />
    <div className="mb-6 max-w-2xl"><label htmlFor="topic-search" className="sr-only">{t("Tìm chủ đề hoặc module")}</label><div className="relative"><MagnifyingGlass size={21} aria-hidden className="pointer-events-none absolute left-4 top-3.5 text-subtle" /><input id="topic-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Ví dụ: Java, Spring, cơ sở dữ liệu…")} className="kg-field pl-12" /></div></div>
    {error ? <div role="alert" className="mb-6">{t(error)}<button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-4 font-medium underline">{t("Thử lại")}</button></div> : null}
    {loading ? <div role="status" className="kg-panel flex min-h-64 items-center justify-center text-subtle">{t("Đang tải chủ đề…")}</div> : !error && <>
      {tracks.length > 0 && <section className="mb-6 rounded-xl border border-line bg-muted/60 p-4 sm:p-5" aria-labelledby="learn-track-title"><h2 id="learn-track-title" className="text-base">{t("Loại nội dung")}</h2><p className="mb-4 mt-1 text-sm leading-relaxed text-subtle">{t("Chọn mảng kiến thức trước, rồi chọn chủ đề bên dưới.")}</p><ChoicePicker choices={tracks.map(track => ({ value: track.slug, label: track.name }))} value={trackSlug} onChange={value => { setTrackSlug(value); setTopicId(""); resetGrouping(); }} allLabel={t("Tất cả nội dung")} label={t("Loại nội dung")} tone="track" /></section>}
      <section className="mb-8 border-b border-line pb-6" aria-labelledby="learn-topic-title"><h2 id="learn-topic-title" className="text-base">{t("Chủ đề")}{trackSlug && <span className="font-normal text-subtle"> · {tracks.find(track => track.slug === trackSlug)?.name ?? trackSlug}</span>}</h2><p className="mb-4 mt-1 text-sm leading-relaxed text-subtle">{t("Chọn chủ đề để lọc module. Bấm một module để mở các cách học ngay tại đó.")}</p><ChoicePicker key={trackSlug} choices={scopedTopics.map(topic => ({ value: topic.id, label: topic.name }))} value={topicId} onChange={value => { setTopicId(value); resetGrouping(); }} allLabel={t("Tất cả chủ đề")} label={t("Chủ đề")} /></section>
      {topics.length === 0 && <p className="mb-6 text-subtle">{t("Chưa có chủ đề để hiển thị.")}</p>}
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0" aria-labelledby="module-directory-title">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3"><h2 id="module-directory-title" className="text-xl">{chosenTopic?.name ?? t("Các module")}</h2><span className="text-sm tabular-nums text-subtle">{number(visible.length)} {t("module")}</span></div>
          {chosenTopic && visible.length > moduleLimit ? <p className="mb-4 text-sm text-subtle">{locale === "en" ? `Showing ${number(moduleLimit)} of ${number(visible.length)} modules. Use Show more to continue.` : `Đang hiển thị ${number(moduleLimit)} / ${number(visible.length)} module. Bấm Xem thêm để tiếp tục.`}</p> : !chosenTopic && groups.length > groupLimit ? <p className="mb-4 text-sm text-subtle">{locale === "en" ? `Previewing ${number(groupLimit)} of ${number(groups.length)} topics. Select a topic above or show more below.` : `Đang xem trước ${number(groupLimit)} / ${number(groups.length)} chủ đề. Chọn chủ đề ở trên hoặc xem thêm ở dưới.`}</p> : null}
          {chosenTopic?.description && <p className="mb-5 max-w-2xl text-sm leading-relaxed text-subtle">{chosenTopic.description}</p>}
          {visible.length === 0 ? <div className="rounded-2xl border border-line/80 bg-surface p-8"><p className="text-subtle">{t(searching ? "Không có module khớp tìm kiếm." : "Chưa có module trong chủ đề này.")}</p>{searching && <button type="button" onClick={() => setQuery("")} className="kg-secondary mt-4">{t("Xóa tìm kiếm")}</button>}</div>
            : chosenTopic ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.slice(0, moduleLimit).map(module => <ModuleCard key={module.id} module={module} topicName={chosenTopic.name} active={selected?.id === module.id} onSelect={() => setSelectedId(current => current === module.id ? "" : module.id)} questionLabel={t("câu hỏi")} modes={modes} />)}</div>
              : <div className="space-y-9">{groups.slice(0, groupLimit).map(({ topic, modules: topicModules }) => {
                const limit = expanded[topic.id] ?? TOPIC_PREVIEW_LIMIT;
                const open = limit > TOPIC_PREVIEW_LIMIT;
                const overflow = Math.max(0, topicModules.length - limit);
                const shown = topicModules.slice(0, limit);
                return <div key={topic.id}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-base font-semibold text-strong">{topic.name}</h3><span className="text-xs tabular-nums text-subtle">{number(topicModules.length)} {t("module")}</span></div>
                  <div id={`group-${topic.id}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map(module => <ModuleCard key={module.id} module={module} topicName={topic.name} active={selected?.id === module.id} onSelect={() => setSelectedId(current => current === module.id ? "" : module.id)} questionLabel={t("câu hỏi")} modes={modes} />)}</div>
                  <div className="mt-4 flex flex-wrap gap-2">{overflow > 0 && <button type="button" aria-expanded={open} aria-controls={`group-${topic.id}`} onClick={() => setExpanded(state => ({ ...state, [topic.id]: limit + TOPIC_PREVIEW_LIMIT }))} className="kg-secondary">{t("Xem thêm")} {number(Math.min(overflow, TOPIC_PREVIEW_LIMIT))} {t("module")}</button>}{open && <button type="button" className="kg-secondary" onClick={() => { setExpanded(state => ({ ...state, [topic.id]: TOPIC_PREVIEW_LIMIT })); setSelectedId(""); }}>{t("Thu gọn")}</button>}</div>
                </div>;
              })}</div>}
          <div className="mt-5 flex flex-wrap gap-2">{chosenTopic && visible.length > moduleLimit && <button type="button" className="kg-secondary" onClick={() => setModuleLimit(limit => limit + 6)}>{t("Xem thêm")} {number(Math.min(6, visible.length - moduleLimit))} {t("module")}</button>}{!chosenTopic && groups.length > groupLimit && <button type="button" className="kg-secondary" onClick={() => setGroupLimit(limit => limit + 4)}>{t("Xem thêm chủ đề")}</button>}{(moduleLimit > 6 || groupLimit > 4) && <button type="button" className="kg-secondary" onClick={resetGrouping}>{t("Thu gọn")}</button>}</div>
          <ContentLanguageNotice />
        </section>
        <aside id="practice-options" aria-labelledby="practice-options-title" className={`rounded-2xl bg-sand/65 p-6 xl:sticky xl:top-8 hidden xl:block`}>
          {selected ? <><p className="mb-2 text-sm text-subtle">{t("Bạn chọn cách học")}</p><h2 id="practice-options-title" className="break-words text-2xl">{selected.name}</h2>{selected.description && <p className="mt-3 break-words text-sm leading-relaxed">{selected.description}</p>}<div className="mt-6"><PracticeLinks modes={modes} /></div></> : <><Compass size={36} weight="duotone" className="mb-5 text-accent" aria-hidden /><h2 id="practice-options-title" className="text-xl">{t("Bắt đầu từ đây")}</h2><p className="mt-3 text-sm leading-relaxed text-body">{t("Chọn module để xem các cách luyện tập.")}</p></>}
          <div className="mt-7 border-t border-line pt-5"><Link href="/questions" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline">{t("Khám phá câu hỏi")}<ArrowRight size={17} aria-hidden /></Link></div>
        </aside>
      </div>
    </>}
  </div>;
}

export default function LearnPage() { return <RequireAuth><TopicExplorer /></RequireAuth>; }
