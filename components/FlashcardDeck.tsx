"use client";
import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRightIcon as ArrowUpRight } from "@phosphor-icons/react";
import { ApiError } from "@/lib/api-client";
import { QUALITY, reviewCard, type DueCard } from "@/lib/srs";
import { extractKeyAnswer } from "@/lib/flashcard-summary";
import { formatReviewInterval } from "@/lib/i18n";

type Rating = {
  label: string;
  quality: number;
  hint: string;
  tone: string;
};

/** Thứ tự nút và phím tắt 1–4 khớp `quality` gửi lên BE (0 Again → 3 Easy). */
const RATINGS: Rating[] = [
  {
    label: "Again",
    quality: QUALITY.AGAIN,
    hint: "Quên — reset về 1 ngày",
    tone: "border-accent/60 text-warning hover:bg-accent/10",
  },
  {
    label: "Hard",
    quality: QUALITY.HARD,
    hint: "Nhớ nhưng khó",
    tone: "border-line text-body hover:border-accent hover:text-warning",
  },
  {
    label: "Good",
    quality: QUALITY.GOOD,
    hint: "Nhớ bình thường",
    tone: "border-accent/60 text-positive hover:bg-accent/10",
  },
  {
    label: "Easy",
    quality: QUALITY.EASY,
    hint: "Quá dễ",
    tone: "border-accent text-positive hover:bg-accent/15",
  },
];

export type ReviewSummary = {
  cardId: string;
  quality: number;
  intervalDays: number;
  nextReview: string;
};

function ratingLabel(quality: number): string {
  return RATINGS.find((r) => r.quality === quality)?.label ?? String(quality);
}

/**
 * Phiên flashcard: lật thẻ → tự chấm 4 mức → gọi `/srs/review/{cardId}`.
 *
 * `cards` là queue ban đầu từ BE; component tự tiến index và báo `onFinished` khi hết thẻ. Không tự
 * refetch sau mỗi lần chấm — thẻ vừa chấm chắc chắn không còn đến hạn hôm nay, và refetch giữa phiên
 * làm mất thứ tự đang học.
 */
export function FlashcardDeck({
  cards,
  onFinished,
}: {
  cards: DueCard[];
  onFinished?: (summaries: ReviewSummary[]) => void;
}) {
  const { t, locale } = useLocale();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<ReviewSummary[]>([]);

  const shownAtRef = useRef<number>(Date.now());
  const inFlight = useRef(false);
  const card = cards[index];
  // Mặt sau là câu trả lời trọng tâm (đoạn đầu khối `ans-block` của bài), KHÔNG cắt ngang;
  // bài đầy đủ nằm ở trang câu hỏi mở tab mới nên phiên ôn thẻ không bị gián đoạn.
  const keyAnswer = useMemo(() => extractKeyAnswer(card?.answerHtml), [card?.answerHtml]);

  // Thời gian đo từ lúc thẻ được hiển thị — mỗi thẻ mới bắt đầu lại đồng hồ.
  useEffect(() => {
    shownAtRef.current = Date.now();
    setFlipped(false);
    setError(null);
  }, [index, card?.cardId]);

  const submit = useCallback(
    async (quality: number) => {
      if (!card || inFlight.current) return;
      inFlight.current = true;
      setSubmitting(true);
      setError(null);
      const timeMs = Date.now() - shownAtRef.current;
      try {
        const result = await reviewCard(card.cardId, quality, timeMs);
        const summary: ReviewSummary = {
          cardId: card.cardId,
          quality,
          intervalDays: result.intervalDays,
          nextReview: result.nextReview,
        };
        const next = [...summaries, summary];
        setSummaries(next);
        setIndex(index + 1);
        if (index + 1 >= cards.length) onFinished?.(next);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không gửi được kết quả ôn");
        // Gửi lỗi thì đồng hồ phải bắt đầu lại: giữ nguyên `shownAtRef` sẽ khiến lần thử lại
        // cộng dồn cả thời gian của lần hỏng vào `time_ms`, làm hỏng số liệu tốc độ của thẻ này.
        shownAtRef.current = Date.now();
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [card, cards.length, index, onFinished, summaries],
  );

  // Phím tắt: Space/Enter lật; 1–4 (hoặc A/H/G/E) chấm — khớp nút chuột (chấm được cả khi chưa lật).
  // Chỉ một listener ở window: gắn thêm ở khung thẻ sẽ làm Space/Enter toggle 2 lần.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      // Bỏ qua khi focus đang ở phần tử tương tác: để link/button/nút chấm nhận phím native của
      // chúng, thay vì bị preventDefault cướp mất (Space vẫn cuộn được khi focus ở các phần tử này).
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(event.target.tagName)
      ) {
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }
      const byDigit = RATINGS[Number(event.key) - 1];
      const byLetter = RATINGS.find(
        (r) => r.label.charAt(0).toLowerCase() === event.key.toLowerCase(),
      );
      const rating = byDigit ?? byLetter;
      if (rating) {
        event.preventDefault();
        void submit(rating.quality);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  if (!card) {
    return (
      <div className="rounded-sm border border-line bg-surface/50 p-8 text-center">
        <p className="font-display text-xl text-positive">{t("Hết thẻ trong phiên")}</p>
        <p className="mt-2 text-sm text-subtle">
          {t("Đã ôn ")}{summaries.length} {t(" thẻ. Quay lại sau khi thẻ đến hạn.")}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 text-sm tabular-nums text-subtle">
        <span>
          {t("Thẻ ")}{index + 1} {t(" / ")}{cards.length}
        </span>
        {card.moduleSlug ? <span>{card.moduleSlug}</span> : null}
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface">
        {!flipped ? <button type="button" aria-label={t("Lật xem đáp án")} disabled={submitting} onClick={() => setFlipped(true)} className="flex min-h-[22rem] w-full flex-col items-start justify-between gap-8 p-6 text-left transition-colors hover:bg-muted/35 sm:p-10">
          <span className="rounded-md bg-sage/60 px-3 py-1 text-xs text-positive">{card.difficulty ?? (locale === "en" ? "Review" : "Ôn tập")}</span>
          <span className="block break-words text-2xl font-semibold leading-relaxed text-strong sm:text-3xl">{card.title}</span>
          <span className="text-sm text-accent">{locale === "en" ? "Reveal answer. Space also works." : "Mở đáp án. Bạn cũng có thể dùng phím Space."}</span>
        </button> : <div className="space-y-5 p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium text-positive">{t("Đáp án")}</p><button type="button" className="kg-secondary" aria-label={t("Lật về mặt câu hỏi")} onClick={() => setFlipped(false)}>{locale === "en" ? "Back to question" : "Về câu hỏi"}</button></div>
          <h2 className="break-words text-xl">{card.title}</h2>
          <div className="border-t border-line pt-5">
            <p className="text-lg leading-relaxed text-body">{keyAnswer || t("Thẻ này chưa có đáp án — mở bài viết đầy đủ bên dưới.")}</p>
            <Link
              href={`/questions/${card.questionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-accent underline underline-offset-4 hover:text-strong"
            >
              {t("Mở bài viết đầy đủ")}
              <ArrowUpRight size={16} aria-hidden />
            </Link>
            <p className="text-xs text-subtle">{t("Mở trong tab mới — phiên ôn thẻ hiện tại không bị gián đoạn.")}</p>
          </div>
        </div>}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-warning" role="alert">
          {t(error)}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RATINGS.map((rating) => (
          <button
            key={rating.quality}
            type="button"
            disabled={submitting}
            onClick={() => void submit(rating.quality)}
            className={`rounded-sm border px-3 py-3 text-left transition disabled:opacity-50 ${rating.tone}`}
          >
            <span className="block font-display text-base">{t(rating.label)}</span>
            <span className="mt-0.5 block text-xs text-subtle">{t(rating.hint)}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-subtle">
        {flipped
          ? t("Chấm mức độ nhớ — phím 1–4 cũng dùng được.")
          : t("Chưa lật card vẫn chấm được, nhưng thời gian phản hồi sẽ phản ánh điều đó.")}
      </p>

      {summaries.length > 0 ? (
        <ul className="mt-8 space-y-1 border-t border-line pt-4 text-xs text-subtle">
          {summaries.slice(-5).reverse().map((summary) => (
            <li key={summary.cardId}>
              {t(ratingLabel(summary.quality))} {t(" · lần sau sau ")}{formatReviewInterval(summary.intervalDays, locale)} {t(" (")}{summary.nextReview}{t(")")}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
