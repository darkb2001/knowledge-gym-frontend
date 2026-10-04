"use client";

import { useLocale } from "@/components/locale";

/**
 * Một câu hỏi trong phiên luyện phỏng vấn.
 *
 * Chỉ có ô nhập: KHÔNG nút "lưu câu trả lời" và KHÔNG đáp án riêng từng câu — đáp án chỉ xuất hiện
 * ở trang kết quả sau khi người dùng bấm *Kết thúc phỏng vấn* (submit toàn cục).
 */
export default function InterviewQuestionCard({
  index,
  total,
  title,
  value,
  disabled,
  onChange,
}: {
  index: number;
  total: number;
  title: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { t, formatLocale } = useLocale();
  const answered = value.trim().length > 0;
  return (
    <section className="rounded-2xl border border-line/80 bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
            answered ? "bg-sage text-positive" : "bg-muted text-subtle"
          }`}
        >
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
            {t("Câu hỏi")} {index}/{total}
          </p>
          <h2 className="mt-1 text-base font-semibold leading-snug text-strong sm:text-lg">{title}</h2>
        </div>
      </header>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-strong">{t("Câu trả lời của bạn")}</span>
        <textarea
          className="kg-field min-h-32 resize-y leading-relaxed"
          rows={5}
          maxLength={20000}
          value={value}
          disabled={disabled}
          placeholder={t("Viết câu trả lời của bạn…")}
          onChange={event => onChange(event.target.value)}
        />
      </label>

      <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-subtle">
        <span>{answered ? t("Đã trả lời") : t("Chưa trả lời")}</span>
        <span className="tabular-nums">
          {value.length.toLocaleString(formatLocale)}/20.000 {t("ký tự")}
        </span>
      </p>
    </section>
  );
}
