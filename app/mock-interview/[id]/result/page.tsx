"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ClockIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { PageHeading, RequireAuth } from "@/components/ui";
import { LearningContent } from "@/components/LearningContent";
import { useLocale } from "@/components/locale";
import { interviewResult, type InterviewResult } from "@/lib/interview";

type Filter = "ALL" | "ANSWERED" | "UNANSWERED";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "ANSWERED", label: "Đã trả lời" },
  { id: "UNANSWERED", label: "Chưa trả lời" },
];

function ResultView() {
  const { t, formatLocale } = useLocale();
  const params = useParams<{ id: string }>();
  const sessionId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    const ac = new AbortController();
    setLoading(true);
    interviewResult(sessionId, ac.signal)
      .then(data => {
        if (ac.signal.aborted) return;
        setResult(data);
        setError("");
      })
      .catch(e => {
        if (!ac.signal.aborted) setError(e instanceof Error ? e.message : t("Không tải được kết quả phiên"));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [sessionId, tick, t]);

  const items = useMemo(() => result?.items ?? [], [result]);
  const answered = useMemo(() => items.filter(item => (item.userAnswer ?? "").trim().length > 0), [items]);
  const unanswered = items.length - answered.length;
  const shown = filter === "ALL" ? items : filter === "ANSWERED" ? answered : items.filter(item => !(item.userAnswer ?? "").trim().length);
  const duration = useMemo(() => {
    if (!result?.session.finishedAt) return null;
    const ms = new Date(result.session.finishedAt).getTime() - new Date(result.session.startedAt).getTime();
    if (!Number.isFinite(ms) || ms < 0) return null;
    const minutes = Math.max(1, Math.round(ms / 60000));
    return minutes;
  }, [result]);

  const counter = (id: Filter) => (id === "ALL" ? items.length : id === "ANSWERED" ? answered.length : unanswered);

  return (
    <div className="space-y-6">
      <Link
        href="/mock-interview"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeftIcon size={16} weight="bold" aria-hidden />
        {t("Về trang luyện phỏng vấn")}
      </Link>

      <PageHeading
        title={t("Kết quả phỏng vấn")}
        description={t("Xem lại toàn bộ câu hỏi của phiên, câu trả lời của bạn và đáp án tham khảo. Hệ thống không chấm điểm.")}
      />

      {loading && <p className="text-sm text-subtle">{t("Đang tải kết quả…")}</p>}

      {error && !loading && (
        <p role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {t(error)}{" "}
          <button type="button" onClick={() => setTick(value => value + 1)} className="underline">
            {t("Thử lại")}
          </button>
        </p>
      )}

      {result && !error && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Số câu", value: String(items.length) },
              { label: "Đã trả lời", value: String(answered.length) },
              { label: "Chưa trả lời", value: String(unanswered) },
              { label: "Thời lượng", value: duration ? `${duration} ${t("phút")}` : "—" },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-line/80 bg-surface px-4 py-3">
                <p className="text-xs text-subtle">{t(stat.label)}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-strong">{stat.value}</p>
              </div>
            ))}
          </section>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon size={14} aria-hidden />
              {new Date(result.session.startedAt).toLocaleString(formatLocale)}
            </span>
            <span>{result.session.status === "FINISHED" ? t("Đã kết thúc") : t("Đang làm")}</span>
          </p>

          <div role="tablist" aria-label={t("Lọc câu hỏi")} className="flex flex-wrap gap-2">
            {FILTERS.map(entry => {
              const active = filter === entry.id;
              return (
                <button
                  key={entry.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setFilter(entry.id)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                    active
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line bg-surface text-strong hover:border-accent/60"
                  }`}
                >
                  {t(entry.label)}
                  <span className="tabular-nums opacity-80">{counter(entry.id)}</span>
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-xl border border-line/80 bg-surface px-4 py-6 text-center text-sm text-subtle">
              {t("Không có câu hỏi nào trong mục này.")}
            </p>
          ) : (
            <ol className="space-y-4">
              {shown.map(item => {
                const index = items.findIndex(candidate => candidate.questionId === item.questionId) + 1;
                const userAnswer = (item.userAnswer ?? "").trim();
                return (
                  <li key={item.questionId} className="rounded-2xl border border-line/80 bg-surface p-4 sm:p-5">
                    <header className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                          userAnswer ? "bg-sage text-positive" : "bg-warning/15 text-warning"
                        }`}
                      >
                        {index}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                          {t("Câu hỏi")} {index}/{items.length}
                        </p>
                        <h2 className="mt-1 text-base font-semibold leading-snug text-strong sm:text-lg">{item.title}</h2>
                      </div>
                    </header>

                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-strong">{t("Câu trả lời của bạn")}</h3>
                      {userAnswer ? (
                        <>
                          <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-muted/45 p-4 text-sm leading-relaxed text-body">
                            {userAnswer}
                          </p>
                          {item.answeredAt && (
                            <p className="mt-1.5 text-xs text-subtle">
                              {new Date(item.answeredAt).toLocaleString(formatLocale)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                          <WarningCircleIcon size={17} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                          {t("Bạn chưa trả lời câu này.")}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-strong">{t("Đáp án tham khảo")}</h3>
                      {item.answerHtml ? (
                        <LearningContent html={item.answerHtml} className="mt-2 rounded-xl bg-muted/45 p-4 sm:p-5" />
                      ) : (
                        <p className="mt-2 text-sm text-subtle">{t("Câu hỏi này chưa có đáp án tham khảo.")}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="rounded-xl border border-line/80 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-subtle">
            {t("Đáp án tham khảo do ban biên tập tổng hợp để bạn tự đối chiếu — phiên này không được chấm điểm.")}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/mock-interview" className="kg-button inline-flex min-h-11 items-center justify-center px-5">
              {t("Luyện phiên mới")}
            </Link>
            <Link href="/learn" className="kg-secondary inline-flex min-h-11 items-center justify-center px-5">
              {t("Về trang học")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function InterviewResultPage() {
  return (
    <RequireAuth>
      <ResultView />
    </RequireAuth>
  );
}
