"use client";
import { useLocale } from "@/components/locale";
import { useRef, useState } from "react";
import { inputClass } from "@/components/ui";
import { LearningContent } from "@/components/LearningContent";
import { answerInterview, type InterviewAnswer } from "@/lib/interview";
export default function MockInterviewEditor({ sessionId, question, disabled, onBusy }: { sessionId: string; question: { questionId: string; title: string }; disabled: boolean; onBusy: (busy: boolean) => void }) {
  const { t } = useLocale();
  const [text, setText] = useState(""); const [answer, setAnswer] = useState<InterviewAnswer | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");const inFlight=useRef(false);
 async function submit() { if(inFlight.current)return;inFlight.current=true;setBusy(true); onBusy(true); setError(""); try {setAnswer(await answerInterview(sessionId, question.questionId, text));} catch(e) {setError(e instanceof Error ? e.message : "Không lưu được câu trả lời");} finally {inFlight.current=false;setBusy(false); onBusy(false);} }
 return <section className="space-y-3 rounded-sm border border-line p-5"><h2 className="font-display text-xl">{question.title}</h2><label className="block">{t("Câu trả lời của bạn")}<textarea className={inputClass} rows={6} maxLength={20000} value={text} disabled={disabled || busy} onChange={e => setText(e.target.value)} /></label><button disabled={disabled || busy || !text.trim()} onClick={() => void submit()} className="rounded-sm border border-accent px-4 py-2 disabled:opacity-50">{busy ? t("Đang lưu…") : answer ? t("Cập nhật câu trả lời") : t("Lưu câu trả lời và xem đáp án")}</button>{error && <p role="alert" className="text-warning">{t(error)}</p>}{answer && <div className="space-y-3 border-t border-line pt-4"><p role="status" className="text-sm text-subtle">{t("Đã lưu câu trả lời. So sánh với đáp án tham khảo bên dưới.")}</p><h3 className="font-display text-lg">{t("Đáp án tham khảo")}</h3><LearningContent html={answer.answerHtml} className="rounded-xl bg-muted/45 p-5" /><p className="text-xs text-subtle">{t("Đáp án do ban biên tập Knowledge Gym tổng hợp, không phải điểm số tự động.")}</p></div>}</section>;
}
