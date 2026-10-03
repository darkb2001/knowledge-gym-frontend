"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { PageResponse } from "@/lib/types";

export function useAdminDirectory<T>(path: string) {
  const [data, setData] = useState<PageResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setData(null);
    apiRequest<PageResponse<T>>(path, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, loading, error, reload: () => setVersion(value => value + 1) };
}
