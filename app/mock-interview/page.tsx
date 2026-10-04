"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon, CheckCircleIcon, ClockIcon } from "@phosphor-icons/react";
import { PageHeading, RequireAuth, inputClass } from "@/components/ui";
import InterviewQuestionCard from "@/components/InterviewQuestionCard";
import { Pagination } from "@/components/Pagination";
import { useLocale } from "@/components/locale";
import { listTopics } from "@/lib/questions";
import type { Topic } from "@/lib/types";
import {
  clearDraft,
  countAnswered,
  interviewHistory,
  readDraft,
  startInterview,
  submitInterview,
  writeDraft,
  type Interview,
  type InterviewSession,
} from "@/lib/interview";

function InterviewFlow() {
  const { t, formatLocale } = useLocale();
  const router = useRouter();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [tick, setTick] = useState(0);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    listTopics(ac.signal)
      .then(list => {
        if (ac.signal.aborted) return;
        setTopics(list);
        setTopic(previous => previous || list[0]?.id || "");
      })
      .catch(e => {
        if (!ac.signal.aborted) setError(e instanceof Error ? e.message : t("Không tải được chủ đề"));
      });
    return () => ac.abort();
  }, [tick, t]);

  useEffect(() => {
    const ac = new AbortController();
    interviewHistory(page, 10, ac.signal)
      .then(result => {
        if (ac.signal.aborted) return;
        setHistory(result.items);
        setPages(result.totalPages);
        setHistoryError("");
      })
      .catch(e => {
        if (!ac.signal.aborted) setHistoryError(e instanceof Error ? e.message : t("Không tải được lịch sử"));
      });
    return () => ac.abort();
  }, [page, tick, t]);

  // Khôi phục nháp khi mở lại trang giữa chừng (F5, chuyển tab, mất mạng).
  useEffect(() => {
    if (!interview) return;
    setAnswers(readDraft(interview.session.id));
  }, [interview]);

  const answered = useMemo(
    () => (interview ? countAnswered(answers) : 0),
    [interview, answers],
  );
  const total = interview?.questions.length ?? 0;
  const active = interview && interview.session.status !== "FINISHED";

  async function start() {
    setBusy(true);
    setError("");
    setConfirming(false);
    try {
      const session = await startInterview(topic, count);
      setInterview(session);
      setAnswers(readDraft(session.session.id));
      setTick(value => value + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không mở được phiên phỏng vấn"));
    } finally {
      setBusy(false);
    }
  }

  function updateAnswer(questionId: string, value: string) {
    if (!interview) return;
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    writeDraft(interview.session.id, next);
  }

  /** Nút duy nhất của luồng: gửi TẤT CẢ câu trả lời rồi sang trang kết quả (kể cả câu bỏ trống). */
  async function submit() {
    if (!interview) return;
    if (answered < total && !confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = interview.questions.map(question => ({
        questionId: question.questionId,
        answer: (answers[question.questionId] ?? "").trim(),
      }));
      await submitInterview(interview.session.id, payload);
      clearDraft(interview.session.id);
      router.push(`/mock-interview/${interview.session.id}/result`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không gửi được bài phỏng vấn"));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={t("Luyện phỏng vấn")}
        description={t(
          "Trả lời các câu hỏi trong một phiên. Khi bấm Kết thúc phỏng vấn, toàn bộ câu trả lời được gửi một lần và bạn xem lại đáp án tham khảo ở trang kết quả.",
        )}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {t(error)}
        </p>
      )}

      {!active ? (
        <form
          onSubmit={event => {
            event.preventDefault();
            void start();
          }}
          className="space-y-5 rounded-2xl border border-line/80 bg-surface p-4 sm:p-6"
        >
          <h2 className="font-display text-xl text-strong">{t("Phiên mới")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-strong">
              {t("Chủ đề")}
              <select className={`${inputClass} mt-2`} value={topic} onChange={event => setTopic(event.target.value)} required>
                {topics.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-strong">
              {t("Số câu hỏi")}
              <input
                type="number"
                required
                min={1}
                max={20}
                inputMode="numeric"
                value={count}
                onChange={event => setCount(Number(event.target.value))}
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>
          <p className="text-sm text-subtle">{t("Chọn từ 1 đến 20 câu. Bạn có thể bỏ trống câu nào cũng được.")}</p>
          <button
            type="submit"
            disabled={busy || !topic}
            className="kg-button inline-flex min-h-11 w-full items-center justify-center gap-2 disabled:opacity-50 sm:w-auto"
          >
            {busy ? t("Đang mở phiên…") : t("Bắt đầu phỏng vấn")}
            {!busy && <ArrowRightIcon size={18} weight="bold" aria-hidden />}
          </button>
        </form>
      ) : (
        <>
          <div className="sticky top-2 z-10 space-y-3 rounded-2xl border border-line/80 bg-canvas/95 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-strong">
                {t("Đã trả lời")} {answered}/{total}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-subtle">
                <ClockIcon size={15} aria-hidden />
                {new Date(interview.session.startedAt).toLocaleString(formatLocale)}
              </p>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answered}
              aria-label={t("Tiến độ trả lời")}
            >
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${total ? Math.round((answered / total) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {interview.questions.map((question, index) => (
              <InterviewQuestionCard
                key={question.questionId}
                index={index + 1}
                total={total}
                title={question.title}
                value={answers[question.questionId] ?? ""}
                disabled={busy}
                onChange={value => updateAnswer(question.questionId, value)}
              />
            ))}
          </div>

          <div className="sticky bottom-0 z-10 -mx-5 border-t border-line bg-canvas/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8">
            {confirming && (
              <p role="status" className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                {t("Còn")} {total - answered} {t("câu chưa trả lời. Bạn vẫn có thể kết thúc và xem lại toàn bộ đáp án.")}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {confirming && (
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="kg-secondary inline-flex min-h-11 items-center justify-center px-4"
                >
                  {t("Tiếp tục trả lời")}
                </button>
              )}
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="kg-button inline-flex min-h-11 items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircleIcon size={19} weight="bold" aria-hidden />
                {busy ? t("Đang gửi…") : confirming ? t("Vẫn kết thúc") : t("Kết thúc phỏng vấn")}
              </button>
            </div>
          </div>
        </>
      )}

      <section className="space-y-3 border-t border-line pt-6">
        <h2 className="font-display text-xl text-strong">{t("Lịch sử phỏng vấn")}</h2>
        {historyError ? (
          <p role="alert" className="text-sm text-warning">
            {t(historyError)}{" "}
            <button type="button" onClick={() => setTick(value => value + 1)} className="underline">
              {t("Thử lại")}
            </button>
          </p>
        ) : history.length === 0 ? (
          <p className="text-sm text-subtle">{t("Chưa có phiên phỏng vấn.")}</p>
        ) : (
          <ul className="space-y-2">
            {history.map(session => (
              <li key={session.id}>
                <Link
                  href={`/mock-interview/${session.id}/result`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line/80 bg-surface px-4 py-3 transition-colors hover:border-accent/60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-strong">
                      {new Date(session.startedAt).toLocaleString(formatLocale)}
                    </span>
                    <span className="mt-0.5 block text-xs text-subtle">
                      {session.questionCount} {t("câu")} · {session.status === "FINISHED" ? t("Đã kết thúc") : t("Đang làm")}
                    </span>
                  </span>
                  <ArrowRightIcon size={18} className="shrink-0 text-accent" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={pages} onChange={setPage} disabled={Boolean(historyError)} />
      </section>
    </div>
  );
}

export default function MockInterviewPage() {
  return (
    <RequireAuth>
      <InterviewFlow />
    </RequireAuth>
  );
}
