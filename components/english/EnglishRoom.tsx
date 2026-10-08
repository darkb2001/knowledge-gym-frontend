"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, CheckCircleIcon, ClockIcon, HeadphonesIcon, MicrophoneIcon, PauseIcon, PencilLineIcon, PlayIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import { ApiError } from "@/lib/api-client";
import { ENGLISH_SKILLS, countEnglishWords, formatPracticeTime, getEnglishAttempt, listEnglishExercises, listEnglishHistory, saveEnglishAttempt, startEnglishPractice, type EnglishAttempt, type EnglishExercise, type EnglishHistory, type EnglishSkill } from "@/lib/english";
import { SpeakingRecorder } from "./SpeakingRecorder";

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const gate = useRef(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    void (async () => {
      try {
        const [catalog, attempts] = await Promise.all([listEnglishExercises(), listEnglishHistory()]);
        const id = new URLSearchParams(window.location.search).get("attempt");
        const resumed = id ? await getEnglishAttempt(id) : null;
        if (cancelled) return;
        setExercises(catalog); setHistory(attempts);
        if (resumed) { setActive(resumed); const exercise = catalog.find(e => e.id === resumed.exerciseId); if (exercise) setSkill(exercise.skill); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load English practice"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [reload]);
  const canLeave = () => !workspaceBusy && (!dirty || window.confirm(c("Bạn có thay đổi chưa lưu hoặc bản ghi chưa tải. Rời bài sẽ bỏ phần chưa lưu. Tiếp tục?", "You have unsaved work or an undownloaded recording. Leaving discards it. Continue?")));
  function close() {
    if (!canLeave()) return;
    setActive(null); setDirty(false); window.history.replaceState(null, "", "/english");
  }
  async function open(exerciseId: string, attemptId?: string) {
    if (gate.current || !canLeave()) return;
    gate.current = true; setBusy(true); setError("");
    try {
      const attempt = attemptId ? await getEnglishAttempt(attemptId) : await startEnglishPractice(exerciseId);
      setActive(attempt); setWorkspaceKey(n => n + 1); setDirty(false);
      const exercise = exercises.find(e => e.id === attempt.exerciseId); if (exercise) setSkill(exercise.skill);
      window.history.replaceState(null, "", `/english?attempt=${encodeURIComponent(attempt.id)}`);
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
  return <div className="space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="max-w-2xl"><h1 className="text-3xl font-semibold tracking-tight text-strong">English Studio<span className="text-accent">.</span></h1><p className="mt-3 text-body">{c("Phòng học tiếng Anh · Bốn kỹ năng, một không gian luyện tập.", "Your English room · Four skills, one place to practise.")}</p></div>
      <a href="https://vstep.vnu.edu.vn/test-format/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent underline underline-offset-4">{c("Cấu trúc VSTEP.3–5 (B1–C1)", "VSTEP.3–5 format (B1–C1)")}<ArrowRightIcon size={18} aria-hidden /></a>
    </header>
    <div className="rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-subtle">{c("Bài luyện ngắn tự biên soạn theo dạng nhiệm vụ VSTEP. Không phải đề chính thức hoặc thi thử đầy đủ. Kết quả Nghe/Đọc là số câu đúng; Nói/Viết tự đánh giá, không quy đổi điểm chứng chỉ.", "Original short exercises aligned with VSTEP task types. Not official papers or a full mock exam. Listening/Reading show correct answers; Speaking/Writing use self-review, not certificate scores.")}</div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={c("Chọn kỹ năng", "Choose a skill")}>
      {ENGLISH_SKILLS.map(key => { const info = SKILLS[key]; const Icon = info.icon; return <button type="button" key={key} aria-pressed={skill === key} disabled={busy || workspaceBusy} onClick={() => { if (skill === key || !canLeave()) return; setActive(null); setDirty(false); setSkill(key); window.history.replaceState(null, "", "/english"); }} className={`flex min-h-14 items-center justify-center gap-3 rounded-lg border px-3 py-3 font-medium transition-colors disabled:opacity-50 ${skill === key ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-body hover:border-control"}`}><Icon size={23} aria-hidden />{locale === "vi" ? info.vi : info.en}</button>; })}
    </div>
    {error && <div role="alert" className="space-y-3 rounded-xl border border-danger bg-surface p-4 text-danger"><p>{error}</p><button type="button" className="kg-secondary" disabled={busy || workspaceBusy} onClick={() => { if (canLeave()) { setActive(null); setDirty(false); window.history.replaceState(null, "", "/english"); setReload(n => n + 1); } }}>{c("Thử tải lại", "Retry loading")}</button></div>}
    {loading ? <div role="status" className="min-h-48 rounded-2xl border border-line bg-surface p-8 text-subtle">{c("Đang mở phòng tiếng Anh…", "Opening English Studio…")}</div> : active && exercise ? <Workspace key={`${active.id}:${workspaceKey}`} initial={active} exercise={exercise} opening={busy} onClose={close} onDirty={setDirty} onBusy={setWorkspaceBusy} onSaved={() => void refreshHistory(1)} /> : <section className="grid gap-7 rounded-2xl border border-line bg-surface p-5 sm:p-8 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="flex flex-col justify-between gap-8"><div><h2 className="max-w-sm text-2xl font-semibold leading-snug tracking-tight text-strong">{locale === "vi" ? selected.viNote : selected.enNote}</h2><p className="mt-4 max-w-sm text-sm leading-relaxed text-subtle">{c("Bắt đầu bằng một bài nhỏ. Lưu để quay lại, nộp để nhìn rõ điều cần cải thiện.", "Start with a small exercise. Save to return, submit to see what to improve.")}</p></div><div className="border-t border-line pt-5"><p className="text-sm font-medium text-strong">{c("Trong bài thi VSTEP.3–5", "In the VSTEP.3–5 exam")}</p><p className="mt-2 text-sm text-subtle">{selected.exam}</p>{skill === "WRITING" && <p className="mt-2 text-sm text-subtle">{c("Task 1: 1/3 · Task 2: 2/3 điểm kỹ năng Viết.", "Task 1: 1/3 · Task 2: 2/3 of the writing score.")}</p>}</div></div>
      <div className="divide-y divide-line">{exercises.filter(e => e.skill === skill).map(e => <article key={e.id} className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"><div className="min-w-0"><p className="text-sm text-subtle">{e.focus}</p><h3 className="mt-2 text-lg font-semibold text-strong">{e.title}</h3><p className="mt-2 flex items-center gap-2 text-sm text-subtle"><ClockIcon size={17} aria-hidden />{e.minutes} {c("phút luyện", "practice min")}{e.minimumWords > 0 && ` · ≥ ${e.minimumWords} ${c("từ", "words")}`}</p></div><button type="button" disabled={busy} onClick={() => void open(e.id)} className="kg-secondary shrink-0" aria-label={`${c("Mở bài", "Open")} ${e.title}`}><ArrowRightIcon size={20} aria-hidden /></button></article>)}</div>
    </section>}
    {!loading && <section className="space-y-4" aria-labelledby="english-history-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="english-history-heading" className="text-xl font-semibold text-strong">{c("Dấu vết luyện tập", "Your practice trail")}</h2><button type="button" disabled={busy} onClick={() => void paginate(history?.page ?? 1)} className="kg-secondary">{c("Làm mới lịch sử", "Refresh history")}</button></div>
      {!history?.items.length ? <p className="rounded-xl border border-dashed border-control p-6 text-sm text-subtle">{c("Chưa có bài luyện. Chọn một kỹ năng để bắt đầu; bài nháp và bài đã nộp sẽ xuất hiện ở đây.", "No practice yet. Choose a skill to begin; drafts and submitted work will appear here.")}</p> : <><div className="divide-y divide-line rounded-xl border border-line bg-surface px-4 sm:px-6">{history.items.map(a => <button type="button" key={a.id} disabled={busy || workspaceBusy} onClick={() => void open(a.exerciseId, a.id)} className="flex min-h-20 w-full flex-wrap items-center justify-between gap-3 py-4 text-left disabled:opacity-50"><span><span className="block font-medium text-strong">{exercises.find(e => e.id === a.exerciseId)?.title ?? a.exerciseId}</span><span className="mt-1 block text-sm text-subtle">{new Date(a.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</span></span><span className="flex items-center gap-3 text-sm font-medium text-accent">{a.status === "DRAFT" ? c("Tiếp tục bài nháp", "Resume draft") : a.feedback?.correct != null ? `${a.feedback.correct}/${a.feedback.total} ${c("câu đúng", "correct")}` : c("Đã nộp · Tự đánh giá", "Submitted · Self-review")}<ArrowRightIcon size={18} aria-hidden /></span></button>)}</div><div className="flex items-center justify-between gap-3"><button type="button" disabled={busy || history.page <= 1} className="kg-secondary" onClick={() => void paginate(history.page - 1)}>{c("Trang trước", "Previous")}</button><p className="text-sm text-subtle">{c("Trang", "Page")} {history.page} / {Math.max(1, Math.ceil(history.totalElements / history.size))}</p><button type="button" disabled={busy || history.page * history.size >= history.totalElements} className="kg-secondary" onClick={() => void paginate(history.page + 1)}>{c("Trang sau", "Next")}</button></div></>}
    </section>}
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
      {exercise.audioPath && <div className="space-y-3 border-y border-line py-5"><audio controls preload="none" src={exercise.audioPath} className="w-full" aria-label={c("Audio bài nghe", "Listening exercise audio")} onError={() => setError(c("Không tải được audio. Kiểm tra kết nối rồi mở lại bài; chưa nên nộp khi chưa nghe.", "Audio could not load. Check your connection and reopen the exercise; do not submit before listening."))} /><p className="text-sm text-subtle">{c("Giọng tổng hợp từ kịch bản tự biên soạn. Có thể nghe lại khi luyện; transcript mở sau khi nộp.", "Synthetic speech from an original script. Replay freely in practice; the transcript opens after submission.")}</p></div>}
      {exercise.passage && <div className="max-w-prose space-y-5 text-base leading-loose text-body" lang="en">{exercise.passage.trim().split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>}
      <details className="border-t border-line pt-4"><summary className="cursor-pointer py-2 font-medium text-strong">{c("Checklist luyện tập", "Practice checklist")}</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-body" lang="en">{exercise.checklist.map(item => <li key={item}>{item}</li>)}</ul></details>
      {elapsed >= exercise.minutes * 60 && !submitted && <p role="status" className="text-sm text-warning">{c("Đã hết thời gian gợi ý. Đây là chế độ luyện: bạn có thể tiếp tục, không tự động nộp bài.", "Suggested time has elapsed. Practice mode lets you continue; nothing is submitted automatically.")}</p>}
    </div><div className="min-w-0 space-y-6">
      {exercise.items.length > 0 ? <div className="space-y-6">{exercise.items.map((q, index) => <fieldset key={q.id} disabled={busy || submitted} className="space-y-3"><legend className="mb-3 font-medium leading-relaxed text-strong" lang="en">{index + 1}. {q.stem}</legend>{q.options.map((option, choice) => <label key={choice} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-relaxed ${answers[q.id] === choice ? "border-accent bg-accent-soft text-strong" : "border-line text-body hover:border-control"}`}><input type="radio" name={`${attempt.id}-${q.id}`} checked={answers[q.id] === choice} onChange={() => { setAnswers(a => ({ ...a, [q.id]: choice })); setConfirm(false); setNotice(""); }} className="mt-1 accent-accent" /><span lang="en">{option}</span></label>)}</fieldset>)}</div> : <>
        {exercise.skill === "SPEAKING" && <SpeakingRecorder disabled={busy || submitted} onRecording={setRecording} onUnsavedFile={setLocalFile} />}
        <div><label htmlFor="english-response" className="block font-medium text-strong">{exercise.skill === "WRITING" ? c("Bài viết của bạn", "Your writing") : c("Tự nhận xét sau khi nghe lại", "Reflection after playback")}</label><p id="english-response-help" className="mt-2 text-sm leading-relaxed text-subtle">{exercise.skill === "WRITING" ? c("Lưu nháp trước khi rời trang. Không có chấm điểm AI; dùng checklist để tự rà soát.", "Save your draft before leaving. No AI grading; use the checklist to review your work.") : c("Ghi điều làm tốt và điều muốn sửa. Phần chữ này được lưu trên máy chủ; audio thì không.", "Note what went well and what to improve. This text is saved on the server; audio is not.")}</p><textarea id="english-response" aria-describedby="english-response-help english-word-count" value={response} maxLength={20000} disabled={busy || submitted} onChange={e => { setResponse(e.target.value); setConfirm(false); setNotice(""); }} rows={exercise.skill === "WRITING" ? 15 : 5} className="mt-4 w-full resize-y rounded-xl border border-control bg-surface p-4 text-base leading-relaxed text-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-80" spellCheck lang="en" /><p id="english-word-count" className="mt-2 text-sm text-subtle">{words} {c("từ", "words")}{exercise.minimumWords > 0 && ` / ${exercise.minimumWords} ${c("từ tối thiểu gợi ý", "suggested minimum")}`} · {response.length}/20,000 {c("ký tự", "characters")}</p></div>
      </>}
      {!submitted && <div className="space-y-4 border-t border-line pt-5"><p className="text-sm text-subtle">{changed ? c("Có thay đổi chưa lưu", "Unsaved changes") : c("Bản nháp đã đồng bộ", "Draft is synced")}</p><div className="flex flex-wrap gap-3"><button type="button" className="kg-secondary" disabled={busy || recording} onClick={() => void save(false)}>{busy ? c("Đang lưu…", "Saving…") : c("Lưu nháp", "Save draft")}</button><button type="button" className="kg-button" disabled={busy || recording || !filled} onClick={() => setConfirm(true)}>{c("Nộp bài luyện", "Submit practice")}</button></div>{confirm && <div className="space-y-3 rounded-xl border border-control p-4"><p className="text-sm leading-relaxed text-body">{c("Nộp bài sẽ khoá chỉnh sửa và mở phản hồi. Bạn vẫn có thể làm lượt mới.", "Submission locks editing and opens feedback. You can start a new attempt afterwards.")}{exercise.minimumWords > words && ` ${c("Bài chưa đạt số từ gợi ý; không chặn nộp trong chế độ luyện.", "Your response is below the suggested word count; practice mode still allows submission.")}`}</p><div className="flex flex-wrap gap-3"><button type="button" className="kg-button" disabled={busy || recording} onClick={() => void save(true)}>{c("Xác nhận nộp", "Confirm submission")}</button><button type="button" className="kg-secondary" disabled={busy} onClick={() => setConfirm(false)}>{c("Viết tiếp", "Keep working")}</button></div></div>}</div>}
      {notice && <p role="status" className="text-sm text-positive">{notice}</p>}{error && <p role="alert" className="text-sm leading-relaxed text-danger">{error}</p>}
    </div></div>
    {submitted && attempt.feedback && <section className="space-y-5 border-t border-line bg-accent-soft/30 p-5 sm:p-7" aria-labelledby="english-feedback-title"><h3 id="english-feedback-title" className="flex items-center gap-2 text-xl font-semibold text-strong"><CheckCircleIcon size={24} aria-hidden />{c("Nhìn lại bài luyện", "Review your practice")}</h3>{attempt.feedback.correct != null ? <><p className="font-medium text-strong">{attempt.feedback.correct}/{attempt.feedback.total} {c("câu đúng · Không phải điểm VSTEP", "correct · Not a VSTEP score")}</p><ol className="space-y-4">{attempt.feedback.items.map((item, index) => <li key={item.id} className="text-sm leading-relaxed text-body" lang="en"><p className="font-semibold">{index + 1}. {exercise.items.find(q => q.id === item.id)?.options[item.correctIndex]}</p><p className="mt-1">{item.explanation}</p></li>)}</ol></> : <p className="max-w-prose text-sm leading-relaxed text-body">{c("Đã lưu bài và tự nhận xét. Dùng checklist để rà soát nội dung, tổ chức ý và ngôn ngữ. Hệ thống chưa chấm Viết/Nói hoặc xác nhận B1/B2/C1.", "Your response is saved. Use the checklist to review content, organisation and language. The system does not grade writing/speaking or certify B1/B2/C1.")}</p>}{attempt.feedback.transcript && <details><summary className="cursor-pointer py-2 font-medium text-accent">{c("Mở transcript", "Open transcript")}</summary><p className="mt-3 max-w-prose leading-loose text-body" lang="en">{attempt.feedback.transcript}</p></details>}</section>}
  </section>;
}
