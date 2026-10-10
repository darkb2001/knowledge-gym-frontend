"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale";
import { getEnglishTranscript, type EnglishTranscript } from "@/lib/english";

/** Opt-in practice aid, fetched separately so catalog/drafts stay lean and keys/models stay gated. */
export function ListeningTranscript({ exerciseId, partId }: { exerciseId: string; partId?: string }) {
  const { locale } = useLocale();
  const c = (vi: string, en: string) => locale === "vi" ? vi : en;
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState<EnglishTranscript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!shown || value) return;
    let cancelled = false;
    setLoading(true); setError(false);
    void getEnglishTranscript(exerciseId, partId).then(next => {
      if (!cancelled) { setValue(next); setLoading(false); }
    }).catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shown, value, exerciseId, partId, retry]);
  return <div className="space-y-3 border-t border-line pt-4">
    <button type="button" className="kg-secondary" aria-expanded={shown} aria-controls="english-listening-transcript" onClick={() => setShown(v => !v)}>
      {shown ? c("Ẩn transcript", "Hide transcript") : c("Hiện transcript", "Show transcript")}
    </button>
    {shown && <section id="english-listening-transcript" className="space-y-4" aria-label={c("Transcript phần đang nghe", "Current listening transcript")}>
      <p className="max-w-prose text-sm leading-relaxed text-subtle">{c("Bạn đang nghe có hỗ trợ văn bản. Thử nghe trước, mở để đối chiếu rồi ẩn và nghe lại. Số câu đúng không thể hiện khả năng nghe độc lập khi đã xem transcript.", "You are listening with text support. Try listening first, reveal to check, then hide and replay. Correct counts after reading the transcript do not demonstrate unaided listening.")}</p>
      {loading && <p role="status" className="text-sm text-subtle">{c("Đang tải transcript…", "Loading transcript…")}</p>}
      {error && <div role="alert" className="space-y-3 text-sm text-danger"><p>{c("Chưa tải được transcript. Audio và đáp án đang chọn vẫn được giữ; thử lại.", "Transcript could not load. Audio and selected answers are retained; retry.")}</p><button type="button" className="kg-secondary" onClick={() => setRetry(n => n + 1)}>{c("Thử tải transcript lại", "Retry transcript")}</button></div>}
      {value && <div className="max-w-prose space-y-4 whitespace-pre-line text-base leading-loose text-body" lang="en">{value.text.trim().split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
    </section>}
  </div>;
}
