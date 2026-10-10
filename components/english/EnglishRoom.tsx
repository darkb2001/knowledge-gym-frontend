"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, CheckCircleIcon, ClockIcon, HeadphonesIcon, MicrophoneIcon, PauseIcon, PencilLineIcon, PlayIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import { ApiError } from "@/lib/api-client";
import { ENGLISH_SKILLS, countEnglishWords, formatPracticeTime, getEnglishAttempt, listEnglishExercises, listEnglishHistory, saveEnglishAttempt, startEnglishPractice, type EnglishAttempt, type EnglishExercise, type EnglishHistory, type EnglishSkill } from "@/lib/english";
import { SpeakingRecorder } from "./SpeakingRecorder";
import { ReferenceResponse } from "./ReferenceResponse";
import { ListeningPlayer } from "./ListeningPlayer";
import { ListeningTranscript } from "./ListeningTranscript";
import { VocabularyStudio } from "./VocabularyStudio";
import { useVocabularySession } from "./useVocabularySession";
import { ExamPreparationGuide } from "./ExamPreparationGuide";
import { englishPracticeHref, HCMUS_TRANSFER_IDS, matchesEnglishTrack, readEnglishTrack, trackForEnglishExercise, type EnglishTrack } from "@/lib/english-preparation";

const SKILLS = {
  LISTENING: { vi: "Nghe", en: "Listening", icon: HeadphonesIcon, viNote: "Bắt ý chính. Nghe chi tiết.", enNote: "Catch the meaning. Notice the detail.", exam: "≈ 40 min · 3 parts · 35 questions" },
  SPEAKING: { vi: "Nói", en: "Speaking", icon: MicrophoneIcon, viNote: "Có ý tưởng. Có tiếng nói.", enNote: "Find your ideas. Find your voice.", exam: "12 min · 3 parts" },
  READING: { vi: "Đọc", en: "Reading", icon: BookOpenIcon, viNote: "Đọc sâu hơn từng dòng chữ.", enNote: "Read between the lines.", exam: "60 min · 4 passages · 40 questions" },
  WRITING: { vi: "Viết", en: "Writing", icon: PencilLineIcon, viNote: "Biến suy nghĩ thành lời.", enNote: "Turn your thinking into words.", exam: "60 min · 2 tasks · 120 / 250 words" },
};

export function EnglishRoom() {
  const { locale } = useLocale();
  const c = useCallback((vi: string, en: string) => locale === "vi" ? vi : en, [locale]);
  const [exercises, setExercises] = useState<EnglishExercise[]>([]);
  const [history, setHistory] = useState<EnglishHistory | null>(null);
  const [skill, setSkill] = useState<EnglishSkill>("LISTENING");
  const [active, setActive] = useState<EnglishAttempt | null>(null);
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const [library, setLibrary] = useState(false);
  const [track, setTrack] = useState<EnglishTrack>("VSTEP");
  const vocabulary = useVocabularySession();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const gate = useRef(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const requestedTrack = readEnglishTrack(window.location.search);
    setLoading(true); setError(""); setTrack(requestedTrack);
    void (async () => {
      try {
        const [catalog, attempts] = await Promise.all([listEnglishExercises(), listEnglishHistory()]);
        const id = new URLSearchParams(window.location.search).get("attempt");
        const resumed = id ? await getEnglishAttempt(id) : null;
        if (cancelled) return;
        setExercises(catalog); setHistory(attempts);
        if (resumed) { setActive(resumed); const exercise = catalog.find(e => e.id === resumed.exerciseId); if (exercise) { setSkill(exercise.skill); const nextTrack = trackForEnglishExercise(exercise, requestedTrack); setTrack(nextTrack); window.history.replaceState(null, "", englishPracticeHref(nextTrack, resumed.id)); } }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load English practice"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [reload]);
  const canLeave = () => !workspaceBusy && (!dirty || window.confirm(c("Bạn có thay đổi chưa lưu hoặc bản ghi chưa tải. Rời bài sẽ bỏ phần chưa lưu. Tiếp tục?", "You have unsaved work or an undownloaded recording. Leaving discards it. Continue?")));
  function close() {
    if (!canLeave()) return;
    setActive(null); setDirty(false); window.history.replaceState(null, "", englishPracticeHref(track));
  }
  async function open(exerciseId: string, attemptId?: string) {
    if (gate.current || !canLeave()) return;
    gate.current = true; setBusy(true); setError("");
    try {
      const attempt = attemptId ? await getEnglishAttempt(attemptId) : await startEnglishPractice(exerciseId);
      setActive(attempt); setWorkspaceKey(n => n + 1); setDirty(false);
      const exercise = exercises.find(e => e.id === attempt.exerciseId);
      const nextTrack = exercise ? trackForEnglishExercise(exercise, track) : track;
      if (exercise) setSkill(exercise.skill);
      setTrack(nextTrack); window.history.replaceState(null, "", englishPracticeHref(nextTrack, attempt.id));
      await refreshHistory(1);
    } catch (e) { setError(e instanceof Error ? e.message : c("Không mở được bài. Thử lại.", "Could not open practice. Retry.")); }
    finally { gate.current = false; setBusy(false); }
  }
  async function refreshHistory(page: number) {
    try { setHistory(await listEnglishHistory(page)); }
    catch { setError(c("Không tải được lịch sử. Bài đã lưu không bị mất; hãy thử lại.", "History could not load. Saved work is retained; please retry.")); }
  }
  async function paginate(page: number) {
    if (gate.current) return;
    gate.current = true; setBusy(true); setError("");
    try { await refreshHistory(page); } finally { gate.current = false; setBusy(false); }
  }
  const exercise = exercises.find(e => e.id === active?.exerciseId);
  const selected = SKILLS[skill];
  const visibleExercises = exercises.filter(e => e.skill === skill && matchesEnglishTrack(e, track));
  return <div className="space-y-5 sm:space-y-8">
    <header className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-semibold leading-tight tracking-tight text-strong sm:text-4xl">English Studio<span className="text-accent">.</span></h1>
      <p className={`max-w-2xl text-lg leading-relaxed text-body ${library ? "hidden sm:block" : ""}`}>{c("Nghe rõ hơn. Nhớ theo ngữ cảnh. Tự tin dùng tiếng Anh từng ngày.", "Listen clearly. Remember in context. Make English part of your day.")}</p>
    </header>
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line" role="group" aria-label={c("Không gian luyện tiếng Anh", "English practice space")}>
      {[{ value: false, vi: "Bài luyện 4 kỹ năng", en: "Four-skill practice" }, { value: true, vi: "Từ vựng theo chủ đề", en: "Topic vocabulary" }].map(item => <button type="button" key={String(item.value)} disabled={busy || workspaceBusy} aria-pressed={library === item.value} onClick={() => { if (library === item.value || !canLeave()) return; setActive(null); setDirty(false); setLibrary(item.value); window.history.replaceState(null, "", englishPracticeHref(track)); }} className={`min-h-12 border-b-2 pb-3 text-base font-semibold transition-colors disabled:opacity-50 ${library === item.value ? "border-accent text-accent" : "border-transparent text-subtle hover:text-strong"}`}>{locale === "vi" ? item.vi : item.en}</button>)}
    </div>
    {library ? <VocabularyStudio key={vocabulary.owner ?? "memory"} session={vocabulary.session} onSession={vocabulary.update} storageAvailable={vocabulary.storageAvailable} onDirty={setDirty} /> : <>
    <ExamPreparationGuide track={track} disabled={busy || workspaceBusy} onChange={next => { if (next !== track && canLeave()) { setActive(null); setDirty(false); setTrack(next); window.history.replaceState(null, "", englishPracticeHref(next)); } }} />
    {track === "VSTEP" && <details className="rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-subtle"><summary className="cursor-pointer font-medium text-body">{c("Luyện theo cấu trúc VSTEP, không phải đề thi chính thức", "VSTEP-format practice, not official examination papers")}</summary><p className="mt-3">{c("Kho bài tự biên soạn gồm khởi động ngắn, luyện từng nhiệm vụ và bộ Nghe/Đọc đủ số phần, số câu theo định dạng. Không phải đề chính thức, bài đánh giá đã hiệu chuẩn hoặc một kỳ thi thử 4 kỹ năng đầy đủ. Chế độ học cho phép nghe lại. Nghe/Đọc hiển thị số câu đúng; Nói/Viết có mẫu sau nộp để tự đối chiếu, không quy đổi điểm chứng chỉ.", "Original material includes short warm-ups, individual tasks and Listening/Reading sets with the format’s full section and question counts. Not official papers, a calibrated assessment or a complete four-skill mock examination. Learning mode permits replay. Listening/Reading show raw correct counts; Speaking/Writing reveal models after submission for self-review, not certificate scores.")}</p><a href="https://vstep.vnu.edu.vn/test-format/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-medium text-accent underline underline-offset-4">{c("Xem cấu trúc VSTEP", "View the VSTEP format")}<ArrowRightIcon size={18} aria-hidden /></a></details>}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={c("Chọn kỹ năng", "Choose a skill")}>
      {ENGLISH_SKILLS.map(key => { const info = SKILLS[key]; const Icon = info.icon; return <button type="button" key={key} aria-pressed={skill === key} disabled={busy || workspaceBusy} onClick={() => { if (skill === key || !canLeave()) return; setActive(null); setDirty(false); setSkill(key); window.history.replaceState(null, "", englishPracticeHref(track)); }} className={`flex min-h-14 items-center justify-center gap-3 rounded-lg border px-3 py-3 font-medium transition-colors disabled:opacity-50 ${skill === key ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-body hover:border-control"}`}><Icon size={23} aria-hidden />{track === "HCMUS_PREPARATION" && key === "WRITING" ? c("Ngữ pháp & Viết", "Grammar & Writing") : locale === "vi" ? info.vi : info.en}</button>; })}
    </div>
    {error && <div role="alert" className="space-y-3 rounded-xl border border-danger bg-surface p-4 text-danger"><p>{error}</p><button type="button" className="kg-secondary" disabled={busy || workspaceBusy} onClick={() => { if (canLeave()) { setActive(null); setDirty(false); window.history.replaceState(null, "", englishPracticeHref(track)); setReload(n => n + 1); } }}>{c("Thử tải lại", "Retry loading")}</button></div>}
    {loading ? <div role="status" className="min-h-48 rounded-2xl border border-line bg-surface p-8 text-subtle">{c("Đang mở phòng tiếng Anh…", "Opening English Studio…")}</div> : active && exercise ? <Workspace key={`${active.id}:${workspaceKey}`} initial={active} exercise={exercise} opening={busy} onClose={close} onDirty={setDirty} onBusy={setWorkspaceBusy} onSaved={() => void refreshHistory(1)} /> : <section className="grid gap-7 rounded-2xl border border-line bg-surface p-5 sm:p-8 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="flex flex-col justify-between gap-8"><div><h2 className="max-w-sm text-2xl font-semibold leading-snug tracking-tight text-strong">{track === "HCMUS_PREPARATION" && skill === "WRITING" ? c("Chọn đúng cấu trúc. Giữ đúng ý.", "Choose the structure. Keep the meaning.") : locale === "vi" ? selected.viNote : selected.enNote}</h2><p className="mt-4 max-w-sm text-sm leading-relaxed text-subtle">{c("Bắt đầu bằng một bài nhỏ. Lưu để quay lại, nộp để nhìn rõ điều cần cải thiện.", "Start with a small exercise. Save to return, submit to see what to improve.")}</p></div><div className="border-t border-line pt-5"><p className="text-sm font-medium text-strong">{track === "VSTEP" ? c("Trong bài thi VSTEP.3–5", "In the VSTEP.3–5 exam") : c("Hướng ôn KHTN–ĐHQG-HCM", "HCMUS preparation track")}</p><p className="mt-2 text-sm text-subtle">{track === "VSTEP" ? selected.exam : c("Bài tự biên soạn theo dạng nhiệm vụ; xem cấu trúc chính thức ở trên. Không quy đổi điểm thi.", "Original task practice; see the official format above. No examination score conversion.")}</p>{track === "VSTEP" && skill === "WRITING" && <p className="mt-2 text-sm text-subtle">{c("Task 1: 1/3 · Task 2: 2/3 điểm kỹ năng Viết.", "Task 1: 1/3 · Task 2: 2/3 of the writing score.")}</p>}</div></div>
      <div className="divide-y divide-line">{!visibleExercises.length && <p role="status" className="py-5 text-sm text-subtle">{c("Chưa có bài cho hướng ôn này trong phiên bản máy chủ hiện tại. Thử tải lại hoặc chọn hướng ôn khác.", "No exercises for this track in the current server version. Reload or choose another track.")}</p>}{visibleExercises.sort((a, b) => (track === "HCMUS_PREPARATION" ? Number(b.curriculum === "HCMUS_PREPARATION") - Number(a.curriculum === "HCMUS_PREPARATION") : 0) || Number(b.scope === "COMPLETE_SKILL") - Number(a.scope === "COMPLETE_SKILL")).map(e => <article key={e.id} className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"><div className="min-w-0"><p className="text-sm text-subtle">{track === "HCMUS_PREPARATION" && HCMUS_TRANSFER_IDS.has(e.id) ? c("Luyện kỹ năng dùng chung · Không phải đề KHTN", "Transfer practice · Not an HCMUS paper") : e.focus}</p><h3 className="mt-2 text-lg font-semibold text-strong">{e.title}</h3><p className="mt-2 flex items-center gap-2 text-sm text-subtle"><ClockIcon size={17} aria-hidden />{e.minutes} {c("phút luyện", "practice min")}{e.items.length > 0 && ` · ${e.items.length} ${c("câu", "questions")}`}{e.minimumWords > 0 && ` · ≥ ${e.minimumWords} ${c("từ", "words")}`}</p></div><button type="button" disabled={busy} onClick={() => void open(e.id)} className="kg-secondary shrink-0" aria-label={`${c("Mở bài", "Open")} ${e.title}`}><ArrowRightIcon size={20} aria-hidden /></button></article>)}</div>
    </section>}
    {!loading && <section className="space-y-4" aria-labelledby="english-history-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="english-history-heading" className="text-xl font-semibold text-strong">{c("Dấu vết luyện tập", "Your practice trail")}</h2><button type="button" disabled={busy} onClick={() => void paginate(history?.page ?? 1)} className="kg-secondary">{c("Làm mới lịch sử", "Refresh history")}</button></div>
      {!history?.items.length ? <p className="rounded-xl border border-dashed border-control p-6 text-sm text-subtle">{c("Chưa có bài luyện. Chọn một kỹ năng để bắt đầu; bài nháp và bài đã nộp sẽ xuất hiện ở đây.", "No practice yet. Choose a skill to begin; drafts and submitted work will appear here.")}</p> : <><div className="divide-y divide-line rounded-xl border border-line bg-surface px-4 sm:px-6">{history.items.map(a => <button type="button" key={a.id} disabled={busy || workspaceBusy} onClick={() => void open(a.exerciseId, a.id)} className="flex min-h-20 w-full flex-wrap items-center justify-between gap-3 py-4 text-left disabled:opacity-50"><span><span className="block font-medium text-strong">{exercises.find(e => e.id === a.exerciseId)?.title ?? a.exerciseId}</span><span className="mt-1 block text-sm text-subtle">{new Date(a.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</span></span><span className="flex items-center gap-3 text-sm font-medium text-accent">{a.status === "DRAFT" ? c("Tiếp tục bài nháp", "Resume draft") : a.feedback?.correct != null ? `${a.feedback.correct}/${a.feedback.total} ${c("câu đúng", "correct")}` : c("Đã nộp · Tự đánh giá", "Submitted · Self-review")}<ArrowRightIcon size={18} aria-hidden /></span></button>)}</div><div className="flex items-center justify-between gap-3"><button type="button" disabled={busy || history.page <= 1} className="kg-secondary" onClick={() => void paginate(history.page - 1)}>{c("Trang trước", "Previous")}</button><p className="text-sm text-subtle">{c("Trang", "Page")} {history.page} / {Math.max(1, Math.ceil(history.totalElements / history.size))}</p><button type="button" disabled={busy || history.page * history.size >= history.totalElements} className="kg-secondary" onClick={() => void paginate(history.page + 1)}>{c("Trang sau", "Next")}</button></div></>}
    </section>}
    </>}
  </div>;
}

function Workspace({ initial, exercise, opening, onClose, onDirty, onBusy, onSaved }: {
  initial: EnglishAttempt; exercise: EnglishExercise; opening: boolean; onClose: () => void; onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void; onSaved: () => void;
}) {
  const { locale } = useLocale();
  const c = (vi: string, en: string) => locale === "vi" ? vi : en;
  const [attempt, setAttempt] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [partIndex, setPartIndex] = useState(0);
  const part = exercise.parts?.[partIndex];
  const visibleItems = part ? exercise.items.filter(item => part.itemIds.includes(item.id)) : exercise.items;
  const audioPath = part?.audioPath ?? exercise.audioPath;
  const passage = part?.passage ?? exercise.passage;
  const [response, setResponse] = useState(initial.response);
  const [elapsed, setElapsed] = useState(initial.elapsedSeconds);
  const [running, setRunning] = useState(false);
  const [saving, setBusy] = useState(false);
  const busy = saving || opening;
  const [recording, setRecording] = useState(false);
  const [localFile, setLocalFile] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const submitted = attempt.status === "SUBMITTED";
  const changed = response !== attempt.response || JSON.stringify(answers) !== JSON.stringify(attempt.answers);
  const words = countEnglishWords(response);
  const filled = exercise.items.length ? Object.keys(answers).length === exercise.items.length : response.trim().length > 0;
  useEffect(() => { onDirty(changed || localFile); }, [changed, localFile, onDirty]);
  useEffect(() => { onBusy(busy || recording); }, [busy, recording, onBusy]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (changed || localFile || recording) { e.preventDefault(); e.returnValue = ""; } };
    const warnNavigation = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!link || link.hasAttribute("download") || link.getAttribute("target") === "_blank") return;
      const destination = new URL(link.getAttribute("href") ?? "", window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if ((changed || localFile || recording) && !window.confirm(locale === "vi" ? "Bạn có nội dung chưa lưu hoặc bản ghi chưa tải. Rời phòng sẽ bỏ phần này. Tiếp tục?" : "You have unsaved work or an undownloaded clip. Leaving discards it. Continue?")) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", warnNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", warnNavigation, true); };
  }, [changed, localFile, recording, locale]);
  useEffect(() => {
    if (!running || submitted) return;
    const start = Date.now(); const base = elapsed;
    const timer = setInterval(() => setElapsed(Math.min(7200, base + Math.floor((Date.now() - start) / 1000))), 500);
    return () => clearInterval(timer);
    // Capture elapsed only when the clock is started, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, submitted]);
  async function save(submit: boolean) {
    if (lock.current || opening || submitted || recording) return;
    lock.current = true; setBusy(true); setError(""); setNotice(""); setRunning(false);
    try {
      const next = await saveEnglishAttempt(attempt, answers, response, elapsed, submit);
      setAttempt(next); setConfirm(false);
      setNotice(submit ? c("Đã nộp bài. Xem phản hồi bên dưới.", "Submitted. Review the feedback below.") : c("Đã lưu trên máy chủ. Bạn có thể quay lại từ lịch sử.", "Saved to the server. You can resume from history."));
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? c("Bài đã đổi ở tab khác hoặc đã nộp. Nội dung đang gõ vẫn ở đây: sao chép trước, rồi mở lại từ lịch sử để tải phiên mới.", "This attempt changed elsewhere or was submitted. Your text is retained here: copy it, then reopen from history to load the latest version.") : c("Chưa xác nhận lưu được bài. Giữ tab này và thử lưu lại; không tải lại khi còn nội dung chưa lưu.", "Saving was not confirmed. Keep this tab open and retry; do not reload unsaved work."));
    } finally { lock.current = false; setBusy(false); }
  }
  return <section className="overflow-hidden rounded-2xl border border-line bg-surface" aria-labelledby="english-workspace-title">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-7"><button type="button" onClick={onClose} disabled={busy || recording} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"><ArrowLeftIcon size={18} aria-hidden />{c("Chọn bài khác", "Choose another exercise")}</button><div className="flex items-center gap-4"><span className="font-mono text-lg tabular-nums text-strong" aria-label={c("Thời gian đã luyện", "Elapsed practice time")}>{formatPracticeTime(elapsed)}</span>{!submitted && <button type="button" className="kg-secondary" disabled={busy} onClick={() => setRunning(v => !v)} aria-label={running ? c("Tạm dừng đồng hồ", "Pause timer") : c("Chạy đồng hồ", "Start timer")}>{running ? <PauseIcon size={19} aria-hidden /> : <PlayIcon size={19} aria-hidden />}</button>}</div></div>
    <div className="grid gap-8 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"><div className="min-w-0 space-y-5"><div><p className="text-sm text-subtle">{exercise.focus}</p><h2 id="english-workspace-title" className="mt-2 text-2xl font-semibold tracking-tight text-strong">{exercise.title}</h2></div><p className="max-w-prose leading-relaxed text-body" lang="en">{exercise.prompt}</p>
      {(exercise.parts?.length ?? 0) > 1 && <div className="space-y-3 border-t border-line pt-4"><label htmlFor="english-part" className="block font-medium text-strong">{c("Chọn phần bài luyện", "Choose practice section")}</label><select id="english-part" value={partIndex} disabled={busy} onChange={e => setPartIndex(Number(e.target.value))} className="min-h-12 w-full rounded-lg border border-control bg-surface px-3 text-base text-strong">{exercise.parts!.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title}</option>)}</select><p role="status" className="text-sm text-subtle">{Object.keys(answers).length}/{exercise.items.length} {c("câu đã chọn trong toàn bài. Đổi phần không xoá đáp án.", "questions answered across the whole exercise. Switching sections retains answers.")}</p></div>}
      {audioPath && <><ListeningPlayer key={audioPath} src={audioPath} /><ListeningTranscript key={`${exercise.id}:${part?.id ?? exercise.id}`} exerciseId={exercise.id} partId={part?.id} /></>}
      {passage && <div className="max-w-prose space-y-5 text-base leading-loose text-body" lang="en">{passage.trim().split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>}
      <details className="border-t border-line pt-4"><summary className="cursor-pointer py-2 font-medium text-strong">{c("Checklist luyện tập", "Practice checklist")}</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-body" lang="en">{exercise.checklist.map(item => <li key={item}>{item}</li>)}</ul></details>
      {elapsed >= exercise.minutes * 60 && !submitted && <p role="status" className="text-sm text-warning">{c("Đã hết thời gian gợi ý. Đây là chế độ luyện: bạn có thể tiếp tục, không tự động nộp bài.", "Suggested time has elapsed. Practice mode lets you continue; nothing is submitted automatically.")}</p>}
    </div><div className="min-w-0 space-y-6">
      {exercise.items.length > 0 ? <div className="space-y-6">{visibleItems.map(q => <fieldset key={q.id} disabled={busy || submitted} className="space-y-3"><legend className="mb-3 font-medium leading-relaxed text-strong" lang="en">{exercise.items.findIndex(item => item.id === q.id) + 1}. {q.stem}</legend>{q.options.map((option, choice) => <label key={choice} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-relaxed ${answers[q.id] === choice ? "border-accent bg-accent-soft text-strong" : "border-line text-body hover:border-control"}`}><input type="radio" name={`${attempt.id}-${q.id}`} checked={answers[q.id] === choice} onChange={() => { setAnswers(a => ({ ...a, [q.id]: choice })); setConfirm(false); setNotice(""); }} className="mt-1 accent-accent" /><span lang="en">{option}</span></label>)}</fieldset>)}</div> : <>
        {exercise.skill === "SPEAKING" && <SpeakingRecorder disabled={busy || submitted} onRecording={setRecording} onUnsavedFile={setLocalFile} />}
        <div><label htmlFor="english-response" className="block font-medium text-strong">{exercise.skill === "WRITING" ? c("Bài viết của bạn", "Your writing") : c("Tự nhận xét sau khi nghe lại", "Reflection after playback")}</label><p id="english-response-help" className="mt-2 text-sm leading-relaxed text-subtle">{exercise.skill === "WRITING" ? c("Lưu nháp trước khi rời trang. Không có chấm điểm AI; dùng checklist để tự rà soát.", "Save your draft before leaving. No AI grading; use the checklist to review your work.") : c("Ghi điều làm tốt và điều muốn sửa. Phần chữ này được lưu trên máy chủ; audio thì không.", "Note what went well and what to improve. This text is saved on the server; audio is not.")}</p><textarea id="english-response" aria-describedby="english-response-help english-word-count" value={response} maxLength={20000} disabled={busy || submitted} onChange={e => { setResponse(e.target.value); setConfirm(false); setNotice(""); }} rows={exercise.skill === "WRITING" ? 15 : 5} className="mt-4 w-full resize-y rounded-xl border border-control bg-surface p-4 text-base leading-relaxed text-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-80" spellCheck lang="en" /><p id="english-word-count" className="mt-2 text-sm text-subtle">{words} {c("từ", "words")}{exercise.minimumWords > 0 && ` / ${exercise.minimumWords} ${c("từ tối thiểu gợi ý", "suggested minimum")}`} · {response.length}/20,000 {c("ký tự", "characters")}</p></div>
      </>}
      {!submitted && <div className="space-y-4 border-t border-line pt-5"><p className="text-sm text-subtle">{changed ? c("Có thay đổi chưa lưu", "Unsaved changes") : c("Bản nháp đã đồng bộ", "Draft is synced")}</p><div className="flex flex-wrap gap-3"><button type="button" className="kg-secondary" disabled={busy || recording} onClick={() => void save(false)}>{busy ? c("Đang lưu…", "Saving…") : c("Lưu nháp", "Save draft")}</button><button type="button" className="kg-button" disabled={busy || recording || !filled} onClick={() => setConfirm(true)}>{c("Nộp bài luyện", "Submit practice")}</button></div>{confirm && <div className="space-y-3 rounded-xl border border-control p-4"><p className="text-sm leading-relaxed text-body">{c("Nộp bài sẽ khoá chỉnh sửa và mở phản hồi. Bạn vẫn có thể làm lượt mới.", "Submission locks editing and opens feedback. You can start a new attempt afterwards.")}{exercise.minimumWords > words && ` ${c("Bài chưa đạt số từ gợi ý; không chặn nộp trong chế độ luyện.", "Your response is below the suggested word count; practice mode still allows submission.")}`}</p><div className="flex flex-wrap gap-3"><button type="button" className="kg-button" disabled={busy || recording} onClick={() => void save(true)}>{c("Xác nhận nộp", "Confirm submission")}</button><button type="button" className="kg-secondary" disabled={busy} onClick={() => setConfirm(false)}>{c("Viết tiếp", "Keep working")}</button></div></div>}</div>}
      {notice && <p role="status" className="text-sm text-positive">{notice}</p>}{error && <p role="alert" className="text-sm leading-relaxed text-danger">{error}</p>}
    </div></div>
    {submitted && attempt.feedback && <section className="space-y-5 border-t border-line bg-accent-soft/30 p-5 sm:p-7" aria-labelledby="english-feedback-title"><h3 id="english-feedback-title" className="flex items-center gap-2 text-xl font-semibold text-strong"><CheckCircleIcon size={24} aria-hidden />{c("Nhìn lại bài luyện", "Review your practice")}</h3>{attempt.feedback.correct != null ? <><p className="font-medium text-strong">{attempt.feedback.correct}/{attempt.feedback.total} {c("câu đúng · Không phải điểm kỳ thi", "correct · Not an examination score")}</p><ol className="space-y-4">{attempt.feedback.items.map((item, index) => <li key={item.id} className="text-sm leading-relaxed text-body" lang="en"><p className="font-semibold">{index + 1}. {exercise.items.find(q => q.id === item.id)?.options[item.correctIndex]}</p><p className="mt-1">{item.explanation}</p></li>)}</ol></> : <p className="max-w-prose text-sm leading-relaxed text-body">{c("Đã lưu bài và tự nhận xét. Dùng checklist để rà soát nội dung, tổ chức ý và ngôn ngữ. Hệ thống chưa chấm Viết/Nói hoặc xác nhận B1/B2/C1.", "Your response is saved. Use the checklist to review content, organisation and language. The system does not grade writing/speaking or certify B1/B2/C1.")}</p>}{attempt.feedback.referenceResponse && <ReferenceResponse value={attempt.feedback.referenceResponse} skill={exercise.skill} />}</section>}
  </section>;
}
