"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { PageResponse } from "@/lib/types";

/**
 * Hoãn một giá trị thay đổi nhanh (ví dụ ô tìm kiếm) cho tới khi người dùng ngừng gõ `delay` ms.
 *
 * Bẫy cũ khiến debounce "không bao giờ chạy": đưa cả object options vào dependency array thì
 * effect chạy lại mỗi render và `clearTimeout` xoá timer trước khi nó kịp phát. Ở đây chỉ phụ
 * thuộc vào giá trị nguyên thuỷ `value`/`delay` nên timer thực sự phát sau khoảng lặng.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (delay <= 0) { setDebounced(value); return; }
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Fetch một trang danh sách admin. Khi `debounceMs > 0`, đường dẫn (thường chứa `?q=`) chỉ được
 * gọi sau khi người dùng ngừng gõ — nên gõ trong ô tìm kiếm không bắn request cho từng ký tự.
 */
export function useAdminDirectory<T>(path: string, options: { debounceMs?: number } = {}) {
  const debounceMs = options.debounceMs ?? 0;
  const debouncedPath = useDebouncedValue(path, debounceMs);
  const [data, setData] = useState<PageResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setData(null);
    apiRequest<PageResponse<T>>(debouncedPath, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [debouncedPath, version]);
  return { data, loading, error, reload: () => setVersion(value => value + 1) };
}
