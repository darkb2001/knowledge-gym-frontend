export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4 p-1">
      <span className="sr-only">Đang tải nội dung…</span>
      <div className="h-8 w-2/3 animate-soft-pulse rounded-lg bg-muted" />
      <div className="h-4 w-1/2 animate-soft-pulse rounded bg-muted" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map(key => <div key={key} className="h-32 animate-soft-pulse rounded-2xl bg-muted/70" />)}
      </div>
    </div>
  );
}
