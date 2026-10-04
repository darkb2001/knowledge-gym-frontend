"use client";
import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireAuth, ContentLanguageNotice } from "@/components/ui";
import { ApiError } from "@/lib/api-client";
import { getQuestion, listQuestions } from "@/lib/questions";
import { LearningContent } from "@/components/LearningContent";
import type { QuestionDetail, QuestionSummary } from "@/lib/types";

/** Chỉ chấp nhận đường dẫn nội bộ để `?returnTo=` không thành open redirect. */
function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/questions";
  return value;
}

function QuestionDetailView() {
  const { t } = useLocale();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const backHref = safeReturnTo(searchParams.get("returnTo"));
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [previous, setPrevious] = useState<QuestionSummary | null>(null);
  const [next, setNext] = useState<QuestionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        const data = await getQuestion(id, ac.signal);
        if (!cancelled) setQuestion(data);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không tải được câu hỏi");
        }
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [id]);

  // Câu trước/câu sau trong cùng module: trước đây trang đáp án là ngõ cụt, phải bấm "← Danh sách".
  useEffect(() => {
    if (!question?.moduleId) return;
    let cancelled = false;
    const ac = new AbortController();
    listQuestions({ moduleId: question.moduleId, size: 200 }, ac.signal)
      .then(page => {
        if (cancelled) return;
        const index = page.items.findIndex(item => item.id === id);
        setPrevious(index > 0 ? page.items[index - 1] : null);
        setNext(index >= 0 && index < page.items.length - 1 ? page.items[index + 1] : null);
      })
      .catch(() => {
        if (!cancelled) {
          setPrevious(null);
          setNext(null);
        }
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [question?.moduleId, id]);

  if (error) {
    return (
      <div>
        <p className="text-warning" role="alert">
          {t(error)}
        </p>
        <Link href={backHref} className="mt-4 inline-block text-sm text-positive hover:underline">
          {t("← Danh sách")}</Link>
      </div>
    );
  }

  if (!question) {
    return <p className="animate-soft-pulse text-subtle">{t("Đang mở đáp án…")}</p>;
  }

  const withReturn = (target: string) => `${target}${target.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(`/questions/${id}`)}`;

  return (
    <article className="kg-reading">
      <Link href={backHref} className="text-sm text-subtle hover:text-warning">
        {t("← Danh sách")}</Link>
      <p className="mt-6 text-sm text-subtle">
        {question.moduleSlug} {t(" · ")}{question.difficulty}
      </p>
      <h1 className="mt-2 font-display text-3xl text-strong sm:text-4xl">{question.title}</h1>
      {question.tags.length > 0 ? (
        <p className="mt-3 text-sm text-subtle">{question.tags.join(" · ")}</p>
      ) : null}

      <ContentLanguageNotice />
      <LearningContent html={question.answerHtml} className="mt-8 border-t border-line pt-8" />

      <footer className="mt-12 border-t border-line pt-7">
        <h2 className="text-lg text-strong">{t("Luyện tiếp với module này")}</h2>
        <p className="mt-1 text-sm text-body">{t("Ghi nhớ lâu hơn bằng cách ôn lại và tự kiểm tra ngay sau khi đọc.")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/flashcard/${encodeURIComponent(question.moduleId)}`} className="kg-secondary">{t("Ôn flashcard")}</Link>
          <Link href={`/quiz/${encodeURIComponent(question.moduleId)}`} className="kg-secondary">{t("Luyện trắc nghiệm")}</Link>
          <Link href={`/questions?moduleId=${encodeURIComponent(question.moduleId)}`} className="kg-secondary">{t("Xem cả module")}</Link>
        </div>
        <nav aria-label={t("Câu hỏi trong cùng module")} className="mt-8 grid gap-3 sm:grid-cols-2">
          {previous ? (
            <Link href={withReturn(`/questions/${previous.id}`)} rel="prev" className="min-w-0 rounded-xl border border-line/80 bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-muted/50">
              <span className="text-xs text-subtle">{t("← Câu trước")}</span>
              <span className="mt-1 block break-words text-sm font-medium text-strong">{previous.title}</span>
            </Link>
          ) : <span aria-hidden />}
          {next ? (
            <Link href={withReturn(`/questions/${next.id}`)} rel="next" className="min-w-0 rounded-xl border border-line/80 bg-surface p-4 text-right transition-colors hover:border-accent/40 hover:bg-muted/50 sm:col-start-2">
              <span className="text-xs text-subtle">{t("Câu tiếp theo →")}</span>
              <span className="mt-1 block break-words text-sm font-medium text-strong">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </footer>
    </article>
  );
}

export default function QuestionDetailPage() {
  return (
    <RequireAuth>
      <QuestionDetailView />
    </RequireAuth>
  );
}
