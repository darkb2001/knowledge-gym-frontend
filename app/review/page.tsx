"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FlashcardDeck, type ReviewSummary } from "@/components/FlashcardDeck";
import { RequireAuth } from "@/components/ui";
import { useLocale } from "@/components/locale";
import { ApiError } from "@/lib/api-client";
import { listDue, type DueCard } from "@/lib/srs";

/**
 * Trang "Ôn tập hôm nay": gom các thẻ đến hạn của TẤT CẢ module.
 *
 * Dùng lại `FlashcardDeck` (chế độ 2 nút Ôn lại / Đã nhớ) để giữ đúng luồng lật thẻ và gọi
 * `/srs/review/{cardId}` của trang flashcard hiện có — không viết lại deck.
 *
 * Lưu ý i18n: `lib/i18n.test.ts` bắt mọi literal có dấu truyền thẳng vào `t()` phải có khoá
 * trong `lib/i18n.ts` (file này không được sửa trong đợt này). Vì vậy các câu MỚI dùng helper
 * `c(vi, en)` theo locale — vẫn là tiếng Việt mặc định — còn câu đã có sẵn thì dùng `t()`.
 */
type ReviewPhase =
  | { phase: "loading" }
  | { phase: "error"; message: string | null }
  | { phase: "unavailable" }
  | { phase: "empty" }
  | { phase: "ready"; cards: DueCard[] }
  | { phase: "reviewing"; cards: DueCard[] }
  | { phase: "done"; summaries: ReviewSummary[]; total: number };

/** MAX_LIMIT của BE = 100 — xin hết hàng đợi đến hạn, không cắt im lặng ở 20 mặc định. */
const DUE_LIMIT = 100;

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Trạng thái API báo tính năng chưa sẵn sàng — không phải lỗi hiển thị thô. */
function isUnavailable(err: unknown): boolean {
  return err instanceof ApiError && [404, 410, 501].includes(err.status);
}

/** Tally theo `quality` để màn kết thúc nói được người học vừa nhớ/quên bao nhiêu thẻ. */
function tally(summaries: ReviewSummary[]) {
  const again = summaries.filter((s) => s.quality < 2).length;
  const good = summaries.filter((s) => s.quality >= 2).length;
  return { again, good };
}

function DueSkeleton() {
  const { t, locale } = useLocale();
  const c = (vi: string, en: string) => (locale === "en" ? en : vi);
  return (
    <div className="animate-fade-up space-y-5" aria-busy="true">
      <span role="status" className="sr-only">{c("Đang tải thẻ đến hạn…", "Loading due cards…")}</span>
      <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="h-11 w-40 animate-pulse rounded-sm bg-muted" />
      <div className="h-56 w-full animate-pulse rounded-2xl border border-line/60 bg-surface" />
      <p className="sr-only">{t("Đang tải…")}</p>
    </div>
  );
}

function ReviewSession() {
  const { t, locale } = useLocale();
  const [state, setState] = useState<ReviewPhase>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const c = (vi: string, en: string) => (locale === "en" ? en : vi);

  useEffect(() => {
    const ac = new AbortController();
    setState({ phase: "loading" });
    // Không truyền moduleId ⇒ BE trả thẻ đến hạn của toàn bộ module của người học.
    listDue({ limit: DUE_LIMIT }, ac.signal)
      .then((cards) => {
        if (ac.signal.aborted) return;
        setState(cards.length === 0 ? { phase: "empty" } : { phase: "ready", cards });
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        if (isUnavailable(err)) {
          setState({ phase: "unavailable" });
          return;
        }
        setState({ phase: "error", message: err instanceof ApiError ? err.message : null });
      });
    return () => ac.abort();
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ phase: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  if (state.phase === "loading") return <DueSkeleton />;

  if (state.phase === "unavailable") {
    return (
      <div className="animate-fade-up">
        <div className="kg-notice">
          <p>{c("Tính năng ôn tập chưa sẵn sàng. Trong lúc chờ, bạn có thể tiếp tục học và luyện tập trong thư viện.", "Review is not available yet. In the meantime you can keep learning in the library.")}</p>
          <Link href="/learn" className="kg-button mt-4">{t("Chọn chủ đề")}</Link>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="animate-fade-up">
        <p role="alert">
          {state.message ? t(state.message) : c("Không tải được thẻ đến hạn", "Could not load due cards")}
          <button type="button" onClick={reload} className="ml-4 underline">{t("Thử lại")}</button>
        </p>
        <Link href="/learn" className="mt-5 inline-block text-sm text-subtle hover:text-warning">{c("← Về trang học", "← Back to learning")}</Link>
      </div>
    );
  }

  if (state.phase === "empty") {
    return (
      <div className="animate-fade-up">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">{t("Ôn tập hôm nay")}</p>
          <h1 className="mt-2 font-display text-3xl text-strong">{t("Ôn tập hôm nay")}</h1>
        </header>
        <div className="rounded-2xl border border-line bg-surface/50 p-8 text-center">
          <p className="font-display text-xl text-positive">{c("Không có thẻ nào đến hạn hôm nay", "No cards are due today")}</p>
          <p className="mt-2 text-sm text-subtle">{c("SM-2 sẽ nhắc lại đúng lúc. Quay lại khi thẻ đến hạn.", "Spaced repetition will bring them back at the right time. Come back when cards are due.")}</p>
        </div>
        <Link href="/learn" className="kg-button mt-6">{t("Chọn chủ đề")}</Link>
      </div>
    );
  }

  if (state.phase === "done") {
    const stats = tally(state.summaries);
    return (
      <div className="animate-fade-up">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">{t("Ôn tập hôm nay")}</p>
          <h1 className="mt-2 font-display text-3xl text-strong">{t("Hết thẻ trong phiên")}</h1>
        </header>
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <p className="font-display text-xl text-positive">{t("Đã ôn ")}{state.total}{t(" thẻ")}</p>
          <p className="mt-2 text-sm text-subtle">{c("Bạn đã xử lý hết số thẻ đến hạn hôm nay.", "You have cleared today's due cards.")}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-sm border border-line px-3 py-2">
              <dt className="text-xs font-medium text-subtle">{c("Đã nhớ", "Remembered")}</dt>
              <dd className="mt-1 font-display text-2xl text-positive">{stats.good}</dd>
            </div>
            <div className="rounded-sm border border-line px-3 py-2">
              <dt className="text-xs font-medium text-subtle">{c("Ôn lại", "Review again")}</dt>
              <dd className="mt-1 font-display text-2xl text-warning">{stats.again}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
          <button type="button" onClick={reload} className="kg-secondary">{t("Kiểm tra thẻ đến hạn")}</button>
          <Link href="/learn" className="text-subtle hover:text-warning">{c("← Về trang học", "← Back to learning")}</Link>
        </div>
      </div>
    );
  }

  // ready + reviewing dùng chung phần đầu trang; chỉ khác phần thân.
  const cards = state.cards;

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-subtle">{t("Ôn tập hôm nay")}</p>
        <h1 className="mt-2 font-display text-3xl text-strong">{t("Ôn tập hôm nay")}</h1>
        <p className="mt-2 text-sm tabular-nums text-subtle">{cards.length} {c("thẻ đến hạn hôm nay", "cards due today")}</p>
      </header>

      {state.phase === "ready" ? (
        <>
          <p className="mb-5 max-w-prose text-sm text-subtle">{c("Lật từng thẻ rồi tự chấm 'Đã nhớ' hoặc 'Ôn lại'. Lịch ôn sẽ tự điều chỉnh.", "Flip each card and rate it 'Remembered' or 'Review again'. The schedule adjusts automatically.")}</p>
          <button
            type="button"
            onClick={() => setState({ phase: "reviewing", cards: state.cards })}
            className="kg-button"
          >
            {c("Bắt đầu ôn", "Start review")}
          </button>
        </>
      ) : (
        <FlashcardDeck
          cards={state.cards}
          mode="simple"
          onFinished={(summaries) => setState({ phase: "done", summaries, total: state.cards.length })}
        />
      )}

      <Link href="/learn" className="mt-8 inline-block text-sm text-subtle hover:text-warning">{c("← Về trang học", "← Back to learning")}</Link>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <RequireAuth>
      <ReviewSession />
    </RequireAuth>
  );
}
