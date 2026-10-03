"use client";

import { useEffect, useState } from "react";
import { listModules, listTopics } from "@/lib/questions";
import type { Module, Topic } from "@/lib/types";

export function useAdminCatalog() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    Promise.all([listTopics(controller.signal), listModules(undefined, controller.signal)]).then(([nextTopics, nextModules]) => {
      if (!controller.signal.aborted) { setTopics(nextTopics); setModules(nextModules); setInitialized(true); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tick]);
  return { topics, modules, loading, initialized, error, reload: () => setTick(value => value + 1) };
}
