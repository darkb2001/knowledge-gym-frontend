import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, CheckCircleIcon, HeadphonesIcon, LinkIcon, MagnifyingGlassIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import { meaningChoices, orderVocabulary, recallMatches, topicMatches, VOCABULARY_COUNT, VOCABULARY_TOPICS, type VocabularyMode } from "@/lib/english-vocabulary";
import { currentVocabularyRound, moveVocabularyCursor, nextVocabularyRound, openVocabularyLocation, resetVocabularyTopic, type VocabularyFocus, type VocabularySession } from "@/lib/english-vocabulary-session";
import { ListeningPlayer } from "./ListeningPlayer";

const MODES = [
  { id: "learn", vi: "Học cụm từ", en: "Learn", icon: BookOpenIcon },
  { id: "quiz", vi: "Chọn nghĩa", en: "Recall", icon: CheckCircleIcon },
  { id: "write", vi: "Nhớ & viết", en: "Recall & write", icon: PencilSimpleIcon },
  { id: "listen", vi: "Nghe & gõ", en: "Listen & type", icon: HeadphonesIcon },
  { id: "match", vi: "Ghép cặp", en: "Match", icon: LinkIcon },
] as const;

export function VocabularyStudio({ session, onSession, storageAvailable, onDirty }: {
  session: VocabularySession; onSession: (next: SetStateAction<VocabularySession>) => void; storageAvailable: boolean; onDirty: (dirty: boolean) => void;
}) {
  const { locale } = useLocale();
  const c = useCallback((vi: string, en: string) => locale === "vi" ? vi : en, [locale]);
  const desk = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [missedPairs, setMissedPairs] = useState<string[]>([]);
  const [pairNotice, setPairNotice] = useState("");
  const [sentence, setSentence] = useState("");
  const topic = VOCABULARY_TOPICS.find(t => t.id === session.topicId)!;
  const round = currentVocabularyRound(session);
  const batch = round.ids.map(id => topic.entries.find(e => e.id === id)!).filter(Boolean);
  const entry = batch[round.index];
  const { mode, progress } = session;
  const known = topic.entries.filter(e => progress[e.id] === "known").length;
  const review = topic.entries.filter(e => progress[e.id] === "review").length;
  const topics = VOCABULARY_TOPICS.filter(t => topicMatches(t, query));
  const promptKey = `${session.topicId}:${mode}:${session.focus}:${round.cycle}:${round.ids.join(",")}:${entry?.id}`;
  useEffect(() => {
    setRevealed(false); setTyped(""); setChoice(null); setResult(null); setAssisted(false);
    setSelectedPair(null); setMatched([]); setMissedPairs([]); setPairNotice(""); setSentence("");
  }, [promptKey]);
  useEffect(() => { onDirty(!!sentence.trim()); }, [sentence, onDirty]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (sentence.trim()) { e.preventDefault(); e.returnValue = ""; } };
    const navigate = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!sentence.trim() || !link || link.hasAttribute("download") || link.getAttribute("target") === "_blank") return;
      const destination = new URL(link.getAttribute("href") ?? "", window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!window.confirm(c("Câu tự luyện chưa được lưu. Rời phòng sẽ bỏ câu này. Tiếp tục?", "Your practice sentence is not saved. Leaving discards it. Continue?"))) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [sentence, c]);
  function canDiscard() {
    return !sentence.trim() || window.confirm(c("Câu tự luyện chưa được lưu. Chuyển bài sẽ bỏ câu này. Tiếp tục?", "Your practice sentence is not saved. Moving discards it. Continue?"));
  }
  function mark(id: string, value: "known" | "review") { onSession(previous => ({ ...previous, progress: { ...previous.progress, [id]: value } })); }
  function selectTopic(id: string) {
    if (!canDiscard()) return;
    const selected = VOCABULARY_TOPICS.find(t => t.id === id);
    if (!selected) return;
    const found = query.trim() ? selected.entries.find(e => topicMatches({ ...selected, title: "", vi: "", entries: [e] }, query)) : undefined;
    onSession(previous => openVocabularyLocation(previous, { topicId: id }, found?.id));
    requestAnimationFrame(() => desk.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  }
  function move(delta: -1 | 1) { if (canDiscard()) onSession(previous => moveVocabularyCursor(previous, delta)); }
  function changeMode(next: VocabularyMode) {
    if (next !== mode && canDiscard()) onSession(previous => openVocabularyLocation(previous, { mode: next }));
  }
  function changeFocus(next: VocabularyFocus) {
    if (next !== session.focus && canDiscard()) onSession(previous => openVocabularyLocation(previous, { focus: next }));
  }
  function answer(id: string) {
    if (!entry || choice !== null) return;
    setChoice(id); const correct = id === entry.id; setResult(correct); mark(entry.id, correct ? "known" : "review");
  }
  function checkTyping() {
    if (!entry || !typed.trim()) return;
    const correct = recallMatches(typed, entry.term); setResult(correct);
    if (!correct) setAssisted(true);
    mark(entry.id, correct && !assisted && !revealed ? "known" : "review");
  }
  function match(id: string) {
    if (!selectedPair) return;
    if (id === selectedPair) {
      setMatched(previous => [...previous, id]); mark(id, missedPairs.includes(id) ? "review" : "known");
      setSelectedPair(null); setPairNotice(c("Đúng cặp. Chọn cụm tiếp theo.", "Matched. Choose the next phrase."));
    } else {
      const missed = batch.find(e => e.id === selectedPair)!;
      setMissedPairs(previous => [...new Set([...previous, selectedPair])]); mark(selectedPair, "review"); setSelectedPair(null);
      setPairNotice(c(`Chưa khớp. ${missed.term}: ${missed.meaning}. Cụm này đã vào lượt cần ôn.`, `Not a match. ${missed.term}: ${missed.meaning}. This phrase is queued to revisit.`));
    }
  }
  function resetTopic() {
    const notice = sentence.trim() ? c("Đặt lại đánh dấu và các lượt của chủ đề này? Câu tự luyện chưa lưu sẽ bị bỏ.", "Reset this topic's marks and rounds? Your unsaved practice sentence will be discarded.") : c("Đặt lại đánh dấu và các lượt của chủ đề này?", "Reset this topic's marks and rounds?");
    if (!window.confirm(notice)) return;
    setSentence(""); setMatched([]); setMissedPairs([]); setSelectedPair(null); setPairNotice(""); setRevealed(false); setTyped(""); setResult(null); setAssisted(false); setChoice(null);
    onSession(previous => resetVocabularyTopic(previous));
  }
  return <section className="space-y-5 pb-16" aria-labelledby="vocabulary-heading">
    <div className="max-w-3xl"><h2 id="vocabulary-heading" className="sr-only text-2xl font-semibold tracking-tight text-strong sm:not-sr-only sm:text-3xl">{c("Học một cụm. Dùng được trong một câu.", "Learn a phrase. Make it yours.")}</h2><p className="leading-relaxed text-body sm:mt-3">{c(`${VOCABULARY_TOPICS.length} chủ đề · ${VOCABULARY_COUNT} thẻ · 4 cụm mỗi lượt. Nhớ, tự kiểm tra, rồi quay lại cụm khó.`, `${VOCABULARY_TOPICS.length} topics · ${VOCABULARY_COUNT} cards · 4 phrases per round. Recall, test, then revisit the difficult ones.`)}</p></div>
    <div className="grid overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-muted/40 p-4 lg:border-b-0 lg:border-r lg:p-5" aria-label={c("Chủ đề từ vựng", "Vocabulary topics")}>
        <label className="relative block"><span className="sr-only">{c("Tìm chủ đề hoặc cụm từ", "Find a topic or phrase")}</span><MagnifyingGlassIcon size={19} aria-hidden className="pointer-events-none absolute left-3 top-3 text-subtle" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={c("Tìm chủ đề, cụm từ…", "Find a topic, phrase…")} className="min-h-11 w-full rounded-lg border border-control bg-surface pl-10 pr-3 text-base text-strong" /></label>
        <label className="mt-3 block lg:hidden"><span className="sr-only">{c("Chọn chủ đề từ vựng", "Choose vocabulary topic")}</span><select aria-label={c("Chọn chủ đề từ vựng", "Choose vocabulary topic")} value={topics.some(t => t.id === session.topicId) ? session.topicId : ""} onChange={e => selectTopic(e.target.value)} className="min-h-12 w-full rounded-lg border border-control bg-surface px-3 text-base text-strong"><option value="" disabled>{c("Chọn chủ đề", "Choose a topic")}</option>{topics.map(t => <option key={t.id} value={t.id}>{locale === "vi" ? t.vi : t.title}</option>)}</select></label>
        <div className="mt-4 hidden max-h-[32rem] space-y-1 overflow-y-auto pr-1 lg:block">{topics.map(t => <button type="button" key={t.id} aria-pressed={t.id === session.topicId} onClick={() => selectTopic(t.id)} className={`min-h-12 w-full rounded-lg px-3 py-3 text-left text-sm transition-colors ${t.id === session.topicId ? "bg-accent text-on-accent" : "text-body hover:bg-accent-soft"}`}><span className="block font-medium">{locale === "vi" ? t.vi : t.title}</span>{locale === "vi" && <span lang="en" className="mt-1 block text-xs">{t.title}</span>}</button>)}</div>
        {!topics.length && <p role="status" className="mt-3 text-sm text-subtle">{c("Không thấy chủ đề phù hợp. Thử từ khóa khác.", "No matching topics. Try another search.")}</p>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 text-sm text-subtle lg:block lg:space-y-2" aria-live="polite"><p>{known}/{topic.entries.length} {c("đã nhớ trong chủ đề", "recalled in this topic")}</p><p>{review} {c("cụm cần ôn lại", "phrases to revisit")}</p></div>
      </aside>
      <div ref={desk} id="vocabulary-desk" className="min-w-0 scroll-mt-24 space-y-5 p-4 sm:p-7">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xl font-semibold text-strong" lang="en">{topic.title}</h3><p className="mt-2 text-sm text-subtle" aria-live="polite">{mode === "match" ? c(`${matched.length}/${batch.length} cặp trong lượt`, `${matched.length}/${batch.length} pairs in this round`) : batch.length ? c(`Cụm ${round.index + 1}/${batch.length} trong lượt · ${topic.entries.length} cụm trong chủ đề`, `Phrase ${round.index + 1}/${batch.length} in this round · ${topic.entries.length} phrases in this topic`) : c("Lượt cần ôn đang trống", "The revisit queue is empty")}</p></div><button type="button" className="min-h-11 shrink-0 text-sm text-accent underline underline-offset-4" onClick={resetTopic}>{c("Đặt lại", "Reset")}</button></div>
        <div className="flex flex-wrap items-center gap-3"><label htmlFor="vocabulary-focus" className="text-sm font-medium text-body">{c("Lượt luyện", "Practice queue")}</label><select id="vocabulary-focus" value={session.focus} onChange={e => changeFocus(e.target.value as VocabularyFocus)} className="min-h-11 rounded-lg border border-control bg-surface px-3 text-base text-strong"><option value="all">{c("Tất cả cụm", "All phrases")}</option><option value="review">{c("Cụm cần ôn", "Revisit phrases")}</option></select></div>
        <div className="grid grid-cols-2 gap-2 pb-1 sm:flex sm:flex-wrap" role="group" aria-label={c("Chế độ luyện từ", "Vocabulary practice mode")}>{MODES.map(m => { const Icon = m.icon; return <button type="button" key={m.id} aria-pressed={m.id === mode} onClick={() => changeMode(m.id)} className={`flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${m.id === mode ? "border-accent bg-accent text-on-accent" : "border-line text-body hover:border-control"}`}><Icon size={20} aria-hidden />{locale === "vi" ? m.vi : m.en}</button>; })}</div>
        {!entry ? <div className="space-y-4 border-t border-line py-6"><p role="status" className="text-body">{c("Không có cụm cần ôn trong chủ đề này. Một câu sai hoặc cụm bạn mở đáp án sẽ được đưa vào đây.", "No phrases to revisit in this topic. A wrong answer or a revealed phrase will be queued here.")}</p><button type="button" className="kg-secondary" onClick={() => changeFocus("all")}>{c("Luyện tất cả cụm", "Practise all phrases")}</button></div> : <>
        {mode === "learn" && <div className="space-y-5">
          <div className="flex min-h-44 flex-col justify-center rounded-xl bg-accent-soft/60 p-5 sm:p-8"><p lang="en" className="max-w-xl text-3xl font-semibold leading-snug tracking-tight text-strong sm:text-4xl">{entry.term}</p>{revealed ? <div className="mt-5 space-y-4"><p className="text-lg text-body" lang="vi">{entry.meaning}</p><p className="max-w-prose leading-relaxed text-body" lang="en">{entry.example}</p><p className="text-sm leading-relaxed text-subtle" lang="vi">{entry.tip}</p></div> : <button type="button" className="mt-5 min-h-11 self-start text-sm font-semibold text-accent underline underline-offset-4" onClick={() => setRevealed(true)}>{c("Nhớ nghĩa trước, rồi mở ví dụ", "Recall the meaning, then reveal the example")}</button>}</div>
          <ListeningPlayer key={entry.id} src={entry.audioPath} compact />
          {revealed && <><div className="flex flex-wrap gap-3"><button type="button" className="kg-secondary" onClick={() => mark(entry.id, "review")}>{c("Cần ôn lại", "Revisit")}</button><button type="button" className="kg-button" onClick={() => mark(entry.id, "known")}>{c("Đã nhớ cụm này", "I recall this phrase")}</button></div><p role="status" className="text-sm text-subtle">{progress[entry.id] === "known" ? c("Đã đánh dấu nhớ trong lượt luyện.", "Marked as recalled for this practice.") : progress[entry.id] === "review" ? c("Đã đưa vào lượt cần ôn.", "Queued to revisit.") : ""}</p><div className="border-t border-line pt-4"><label htmlFor="vocabulary-sentence" className="flex items-center gap-2 font-medium text-strong"><PencilSimpleIcon size={20} aria-hidden />{c("Thử dùng cụm này trong câu của bạn", "Try this phrase in your own sentence")}</label><textarea id="vocabulary-sentence" value={sentence} maxLength={1000} onChange={e => setSentence(e.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-control bg-surface p-3 text-base text-strong" lang="en" /><p className="mt-2 text-sm text-subtle">{c("Câu không được lưu hoặc chấm. Sao chép trước khi chuyển cụm hoặc tải lại.", "This sentence is not saved or graded. Copy it before moving or reloading.")}</p></div></>}
        </div>}
        {mode === "quiz" && <div className="space-y-5"><p lang="en" className="text-3xl font-semibold leading-snug text-strong">{entry.term}</p><p className="text-body">{c("Cụm này có nghĩa nào?", "Which meaning fits this phrase?")}</p><div className="space-y-3">{meaningChoices(topic, entry).map(item => <button type="button" key={item.id} disabled={choice !== null} onClick={() => answer(item.id)} className={`min-h-12 w-full rounded-lg border p-4 text-left text-base ${choice === item.id ? "border-accent bg-accent-soft text-strong" : "border-control text-body"}`} lang="vi">{item.meaning}{choice !== null && item.id === entry.id && <span className="ml-2 font-medium">{c("(nghĩa đúng)", "(correct meaning)")}</span>}</button>)}</div>{result !== null && <div role="status" className="space-y-3 border-t border-line pt-4"><p className={`font-medium ${result ? "text-positive" : "text-warning"}`}>{result ? c("Đúng rồi. Thử dùng trong một câu.", "Correct. Try using it in a sentence.") : c("Chưa đúng. Cụm đã vào lượt cần ôn; xem nghĩa và ví dụ trước khi chuyển tiếp.", "Not quite. Queued to revisit; review the meaning and example before moving on.")}</p><p lang="vi" className="text-body">{entry.meaning}</p><p lang="en" className="leading-relaxed text-body">{entry.example}</p><p lang="vi" className="text-sm leading-relaxed text-subtle">{entry.tip}</p></div>}</div>}
        {(mode === "listen" || mode === "write") && <div className="space-y-5">
          {mode === "listen" ? <><p className="text-body">{c("Phát audio rồi gõ cụm bạn nghe được. Không cần đúng viết hoa hoặc dấu gạch nối.", "Play the audio, then type the phrase you hear. Case and hyphens do not matter.")}</p><ListeningPlayer key={entry.id} src={entry.audioPath} compact /></> : <><p lang="vi" className="text-xl font-medium leading-relaxed text-strong">{entry.meaning}</p><p className="text-body">{c("Nhớ cụm tiếng Anh từ nghĩa, không nhìn đáp án trước.", "Recall the English phrase from its meaning before revealing the answer.")}</p></>}
          <form onSubmit={e => { e.preventDefault(); checkTyping(); }} className="space-y-3"><label htmlFor="vocabulary-recall" className="block font-medium text-strong">{mode === "listen" ? c("Bạn nghe được cụm gì?", "What phrase did you hear?") : c("Viết cụm tiếng Anh", "Write the English phrase")}</label><input id="vocabulary-recall" value={typed} maxLength={200} autoComplete="off" spellCheck={false} onChange={e => { setTyped(e.target.value); setResult(null); }} className="min-h-12 w-full rounded-lg border border-control bg-surface px-4 text-base text-strong" lang="en" /><div className="flex flex-wrap gap-3"><button type="submit" disabled={!typed.trim()} className="kg-button">{c("Kiểm tra", "Check")}</button><button type="button" className="kg-secondary" onClick={() => { setRevealed(true); setAssisted(true); mark(entry.id, "review"); }}>{c("Mở cụm từ", "Reveal phrase")}</button></div></form>
          {result !== null && <p role="status" className={`font-medium ${result ? "text-positive" : "text-warning"}`}>{result ? assisted || revealed ? c("Đã viết đúng sau gợi ý. Cụm vẫn ở lượt cần ôn để bạn thử lại không nhìn đáp án.", "Correct after feedback. Still queued so you can try again without the answer.") : c("Đúng cụm từ. Thử nói theo hoặc dùng trong câu.", "Correct phrase. Say it aloud or use it in a sentence.") : c("Chưa khớp. Cụm đã vào lượt cần ôn; thử lại hoặc mở đáp án.", "Not a match. Queued to revisit; try again or reveal the answer.")}</p>}
          {(revealed || result === true) && <div className="space-y-2 border-t border-line pt-4"><p lang="en" className="text-2xl font-semibold text-strong">{entry.term}</p><p lang="vi" className="text-body">{entry.meaning}</p><p lang="en" className="leading-relaxed text-subtle">{entry.example}</p></div>}
        </div>}
        {mode === "match" && <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="grid gap-3" style={{ gridTemplateRows: `repeat(${batch.length}, minmax(0,1fr))` }}>{batch.map(item => <button type="button" key={item.id} disabled={matched.includes(item.id)} aria-pressed={selectedPair === item.id} onClick={() => { setSelectedPair(item.id); setPairNotice(""); }} className={`min-h-24 w-full break-words rounded-lg border p-3 text-left text-sm leading-relaxed ${selectedPair === item.id ? "border-accent bg-accent-soft text-strong" : "border-control text-body"} disabled:opacity-50`} lang="en">{item.term}{matched.includes(item.id) && <CheckCircleIcon size={19} aria-label={c("Đã ghép", "Matched")} className="mt-2" />}</button>)}</div><div className="grid gap-3" style={{ gridTemplateRows: `repeat(${batch.length}, minmax(0,1fr))` }}>{orderVocabulary(batch, `${topic.id}:match:${round.cycle}:${round.used.length}`).map(item => <button type="button" key={item.id} disabled={!selectedPair || matched.includes(item.id)} onClick={() => match(item.id)} className="min-h-24 w-full break-words rounded-lg border border-control p-3 text-left text-sm leading-relaxed text-body disabled:opacity-50" lang="vi">{item.meaning}{matched.includes(item.id) && <CheckCircleIcon size={19} aria-label={c("Đã ghép", "Matched")} className="mt-2" />}</button>)}</div></div><p role="status" className="text-sm leading-relaxed text-body">{matched.length === batch.length ? c(`Đã ghép ${batch.length} cặp. Cụm từng ghép sai vẫn ở lượt cần ôn.`, `${batch.length} pairs matched. Phrases missed earlier remain queued to revisit.`) : pairNotice || c("Chọn một cụm ở bên trái, rồi chọn nghĩa bên phải.", "Choose a phrase on the left, then its meaning on the right.")}</p><button type="button" disabled={matched.length !== batch.length} className="kg-secondary" onClick={() => onSession(previous => nextVocabularyRound(previous))}>{c("Lượt ghép tiếp", "Next matching round")}</button></div>}
        {mode !== "match" && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><button type="button" disabled={round.index === 0} className="kg-secondary inline-flex items-center gap-2" onClick={() => move(-1)}><ArrowLeftIcon size={19} aria-hidden />{c("Cụm trước", "Previous phrase")}</button><button type="button" className="kg-secondary inline-flex items-center gap-2" onClick={() => move(1)}>{round.index === batch.length - 1 ? c("Lượt cụm tiếp", "Next phrase round") : c("Cụm tiếp", "Next phrase")}<ArrowRightIcon size={19} aria-hidden /></button></div>}
        </>}
        <p className="border-t border-line pt-4 text-xs leading-relaxed text-subtle">{storageAvailable ? c("Vị trí, lượt đã gặp và đánh dấu được giữ trong tab cho tài khoản này qua tải lại; không đồng bộ thiết bị. Không phải mastery, XP hay SRS.", "Position, seen phrases and marks survive reload in this account's tab; no device sync. Not mastery, XP or SRS.") : c("Trình duyệt không giữ được phiên học. Bạn vẫn luyện được; vị trí và đánh dấu có thể mất khi tải lại. Không phải mastery, XP hay SRS.", "This browser cannot retain the practice session. You can still practise; position and marks may be lost on reload. Not mastery, XP or SRS.")}</p>
      </div>
    </div>
  </section>;
}
