"use client";

import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import type { QuizQuestion as Question } from "@/lib/quiz";

export default function QuizQuestion({ question, selected, onSelect, disabled = false, correctOptionId }: {
  question: Question; selected?: string | null; onSelect: (id: string) => void; disabled?: boolean; correctOptionId?: string | null;
}) {
  const { locale } = useLocale();
  return <fieldset disabled={disabled} className="min-w-0 rounded-2xl border border-line p-5 sm:p-6">
    <legend className="max-w-full break-words px-2 text-xl font-semibold leading-relaxed text-strong">{question.title}</legend>
    <div className="space-y-3">{question.options.map((option, index) => {
      const correct = correctOptionId === option.id;
      const chosen = selected === option.id;
      const wrong = Boolean(correctOptionId) && chosen && !correct;
      return <label key={option.id} data-result={correct ? "correct" : wrong ? "incorrect" : undefined} className={`flex min-h-16 items-start gap-3 rounded-xl border p-4 transition-colors ${disabled ? "cursor-default" : "cursor-pointer"} ${correct ? "border-positive/50 bg-sage/50" : wrong ? "border-danger/40 bg-[#fbefea]" : chosen ? "border-accent bg-accent-soft" : "border-line hover:bg-muted/40"}`}>
        <input type="radio" className="mt-1" name={question.questionId} value={option.id} checked={chosen} onChange={() => onSelect(option.id)} />
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${chosen ? "bg-accent text-on-accent" : "bg-muted text-subtle"}`} aria-hidden>{index < 26 ? String.fromCharCode(65 + index) : index + 1}</span>
        <span className="min-w-0 flex-1"><span className="block whitespace-pre-wrap break-words text-sm leading-7 text-strong">{option.content}</span>{correct && <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-positive"><CheckCircleIcon size={16} aria-hidden />{locale === "en" ? "Correct answer" : "Đáp án đúng"}</span>}{wrong && <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-danger"><XCircleIcon size={16} aria-hidden />{locale === "en" ? "Your answer" : "Đáp án của bạn"}</span>}</span>
      </label>;
    })}</div>
  </fieldset>;
}
