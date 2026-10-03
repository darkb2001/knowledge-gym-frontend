import { useEffect, useId, useState } from "react";
import { CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useLocale } from "./locale";
import { pageWindow } from "@/lib/pagination";

export function Pagination({ page, totalPages, onChange, disabled = false }: {
  page: number; totalPages: number; onChange: (page: number) => void; disabled?: boolean;
}) {
  const { locale, t } = useLocale();
  const id = useId();
  const [target, setTarget] = useState(String(page));
  useEffect(() => setTarget(String(page)), [page]);
  const pages = pageWindow(page, totalPages);
  if (totalPages < 2) return null;
  const label = (vi: string, en: string) => locale === "en" ? en : vi;
  const go = (next: number) => { if (!disabled && next !== page && Number.isInteger(next) && next >= 1 && next <= totalPages) onChange(next); };
  const control = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 text-sm text-strong transition-colors hover:bg-muted disabled:opacity-40";
  return <nav aria-label={label("Phân trang", "Pagination")} className="kg-pagination mt-auto w-full space-y-3 pt-10">
    <div className="flex flex-wrap items-center justify-center gap-2">
      <div className="flex gap-2">
        <button type="button" className={control} disabled={disabled || page <= 1} onClick={() => go(1)} aria-label={label("Trang đầu", "First page")}><CaretDoubleLeftIcon size={17} aria-hidden /></button>
        <button type="button" className={control} disabled={disabled || page <= 1} onClick={() => go(page - 1)} aria-label={label("Trang trước", "Previous page")}><CaretLeftIcon size={17} aria-hidden /></button>
      </div>
      <ol className="flex justify-center gap-1">
        {pages.map(value => <li key={value}><button type="button" aria-label={`${t("Trang")} ${value}`} aria-current={value === page ? "page" : undefined} disabled={disabled} onClick={() => go(value)} className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-semibold tabular-nums transition-colors disabled:opacity-50 ${value === page ? "bg-accent text-on-accent" : "text-strong hover:bg-muted"}`}>{value}</button></li>)}
      </ol>
      <div className="flex gap-2">
        <button type="button" className={control} disabled={disabled || page >= totalPages} onClick={() => go(page + 1)} aria-label={label("Trang sau", "Next page")}><CaretRightIcon size={17} aria-hidden /></button>
        <button type="button" className={control} disabled={disabled || page >= totalPages} onClick={() => go(totalPages)} aria-label={label("Trang cuối", "Last page")}><CaretDoubleRightIcon size={17} aria-hidden /></button>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-subtle">
      <span className="tabular-nums" aria-live="polite">{t("Trang")} {page} / {totalPages}</span>
      {totalPages > 5 && <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); go(Number(target)); }}>
        <label htmlFor={id}>{label("Đến trang", "Go to page")}</label>
        <input id={id} type="number" min={1} max={totalPages} step={1} required disabled={disabled} value={target} onChange={event => setTarget(event.target.value)} className="kg-field !w-20 !px-2 text-sm" />
        <button type="submit" disabled={disabled} className="kg-secondary !px-3">{label("Đi", "Go")}</button>
      </form>}
    </div>
  </nav>;
}
