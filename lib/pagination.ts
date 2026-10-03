export function pageWindow(page: number, totalPages: number): number[] {
  const total = Number.isFinite(totalPages) ? Math.max(0, Math.floor(totalPages)) : 0;
  if (!total) return [];
  const current = Number.isFinite(page) ? Math.min(total, Math.max(1, Math.floor(page))) : 1;
  const count = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}
