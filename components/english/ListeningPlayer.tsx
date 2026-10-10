import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwiseIcon, HeadphonesIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";

/** Native audio remains the accessible playback control; additions never autoplay. */
export function ListeningPlayer({ src, compact = false }: { src: string; compact?: boolean }) {
  const { locale } = useLocale();
  const c = (vi: string, en: string) => locale === "vi" ? vi : en;
  const ref = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const audio = ref.current;
    return () => { audio?.pause(); audio?.removeAttribute("src"); audio?.load(); };
  }, []);
  function rewind() {
    const audio = ref.current;
    if (audio && Number.isFinite(audio.currentTime)) audio.currentTime = Math.max(0, audio.currentTime - 10);
  }
  return <div className="space-y-4 rounded-xl bg-accent-soft/60 p-4 sm:p-5">
    {!compact && <div className="flex items-center gap-3 text-strong"><HeadphonesIcon size={24} aria-hidden /><div><p className="font-semibold">{c("Nghe rõ, luyện từng lượt", "Listen clearly, one pass at a time")}</p><p className="mt-1 text-sm text-subtle">{c("Giọng neural Anh-Anh. Nghe ý chính trước, rồi nghe lại chi tiết.", "British English neural speech. Listen for the gist, then the detail.")}</p></div></div>}
    <audio ref={ref} controls preload="metadata" src={src} className="w-full" aria-label={compact ? c("Phát âm cụm từ", "Phrase pronunciation") : c("Audio bài nghe", "Listening exercise audio")} onLoadedMetadata={() => { setReady(true); setFailed(false); if (ref.current) ref.current.playbackRate = rate; }} onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); setReady(false); }} onPlay={() => { document.querySelectorAll<HTMLAudioElement>("audio").forEach(audio => { if (audio !== ref.current) audio.pause(); }); }} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={!ready || failed} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-control px-3 text-sm font-medium text-strong disabled:opacity-50" onClick={rewind}><ArrowCounterClockwiseIcon size={19} aria-hidden />{c("Lùi 10 giây", "Back 10 seconds")}</button>
      <label className="flex min-h-11 items-center gap-2 text-sm text-body">{c("Tốc độ", "Speed")}<select aria-label={c("Tốc độ nghe", "Listening speed")} className="min-h-11 rounded-lg border border-control bg-surface px-3 text-strong" value={rate} onChange={e => { const next = Number(e.target.value); setRate(next); if (ref.current) ref.current.playbackRate = next; }}>{[0.75, 0.9, 1, 1.25].map(n => <option key={n} value={n}>{n}×{n === 1 ? c(" bình thường", " normal") : ""}</option>)}</select></label>
    </div>
    {loading && !failed && <p role="status" className="text-sm text-subtle">{c("Đang tải âm thanh…", "Buffering audio…")}</p>}
    {failed && <div role="alert" className="space-y-2 text-sm text-danger"><p>{c("Không tải được audio. Kiểm tra kết nối rồi thử lại; chưa nên nộp bài khi chưa nghe.", "Audio could not load. Check your connection and retry; do not submit before listening.")}</p><button type="button" className="kg-secondary" onClick={() => { setFailed(false); setLoading(true); ref.current?.load(); }}>{c("Tải lại audio", "Reload audio")}</button></div>}
    {!compact && <p className="text-sm leading-relaxed text-subtle">{c("Audio tổng hợp từ kịch bản tự biên soạn, không phải giọng thu đề thi. Transcript mở sau khi nộp.", "Synthetic audio from an original script, not recorded exam speakers. The transcript opens after submission.")}</p>}
  </div>;
}
