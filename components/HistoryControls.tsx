import { useLocale } from "./locale";

export function HistoryControls({ size, total, count, page, loading, onSizeChange }: { size: number; total: number; count: number; page: number; loading: boolean; onSizeChange: (size: number) => void }) {
  const { locale } = useLocale();
  const c = (vi: string, en: string) => locale === "en" ? en : vi;
  const first = count ? (page - 1) * size + 1 : 0;
  return <div className="flex flex-wrap items-end justify-between gap-3">
    <p className="text-sm tabular-nums text-subtle">{loading ? c("Đang tải lịch sử…", "Loading history…") : `${first}–${count ? first + count - 1 : 0} / ${total} ${c("phiên", "sessions")}`}</p>
    <div className="flex flex-wrap items-end gap-3"><label className="block text-sm"><span className="mb-2 block">{c("Số phiên mỗi trang", "Sessions per page")}</span><select className="kg-field !w-auto" value={size} disabled={loading} onChange={e => onSizeChange(Number(e.target.value))}>{[5, 10, 20].map(value => <option key={value} value={value}>{value}</option>)}</select></label>{total > size && size < 20 && <button type="button" className="kg-secondary" disabled={loading} onClick={() => onSizeChange(size === 5 ? 10 : 20)}>{c("Xem thêm phiên", "Show more sessions")}</button>}</div>
  </div>;
}
