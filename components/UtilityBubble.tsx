"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import {
  attachVolumeGraph,
  LOOP_TRACKS,
  MUSIC_DEFAULT,
  readMusicPrefs,
  trackIndex,
  trackSrc,
  trackTime,
  writeMusicPrefs,
  type AudioGraph,
  type MusicPrefs,
} from "@/lib/music";

/**
 * Bong bóng tiện ích nổi ở góc dưới bên phải: bấm vào mở danh sách tiện ích học tập.
 * Tiện ích đầu tiên là nhạc lofi không lời, tự chạy vòng qua cả danh sách bài để ngồi học lâu
 * không bị ngắt vibe. Trình duyệt chỉ cho phát tiếng sau một cú bấm của người dùng nên nhạc mặc
 * định tắt; lựa chọn âm lượng/bài đang nghe được nhớ trên chính thiết bị này.
 */
export default function UtilityBubble() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<MusicPrefs>(MUSIC_DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  // Âm lượng đọc qua ref để việc kéo thanh trượt không vô tình phát lại bài đang tạm dừng.
  const volumeRef = useRef(MUSIC_DEFAULT.volume);
  // Trên iOS, `element.volume` không ghi được: âm lượng phải đi qua Web Audio GainNode
  // (xem attachVolumeGraph). Chỉ dựng một lần cho mỗi phần tử audio, và chỉ trong thao
  // tác của người dùng — dựng ngoài thao tác thì AudioContext bị treo và mất tiếng.
  const graphRef = useRef<AudioGraph | null>(null);
  const graphFailed = useRef(false);

  const index = trackIndex(prefs.track);
  const track = LOOP_TRACKS[index] ?? LOOP_TRACKS[0];

  /** Dựng đường GainNode trong chính thao tác người dùng; trả null nếu không hỗ trợ. */
  const ensureVolumeGraph = useCallback((): AudioGraph | null => {
    if (graphRef.current) return graphRef.current;
    if (graphFailed.current) return null;
    const element = audio.current;
    const Ctor =
      typeof window === "undefined"
        ? undefined
        : window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!element || !Ctor) {
      graphFailed.current = true;
      return null;
    }
    const created = attachVolumeGraph(element, volumeRef.current, () => new Ctor());
    if (!created) {
      graphFailed.current = true;
      return null;
    }
    graphRef.current = created;
    created.resume();
    return created;
  }, []);

  /** Ghi âm lượng: ưu tiên GainNode (chạy trên cả iOS), nơi khác dùng element.volume. */
  const applyVolume = useCallback((value: number) => {
    volumeRef.current = value;
    if (graphRef.current) {
      graphRef.current.setVolume(value);
      return;
    }
    const element = audio.current;
    if (element) element.volume = value;
  }, []);

  // Đọc lựa chọn đã lưu sau khi mount để bản dựng trên máy chủ và trên máy khách giống nhau.
  useEffect(() => {
    setPrefs(readMusicPrefs(window.localStorage));
    setHydrated(true);
  }, []);

  // Đổi bài hoặc bật nhạc: giữ phần tử audio khớp với lựa chọn hiện tại.
  useEffect(() => {
    if (!hydrated) return;
    const element = audio.current;
    if (!element) return;
    applyVolume(volumeRef.current);
    if (!prefs.enabled) {
      element.pause();
      setPlaying(false);
      setBlocked(false);
      return;
    }
    const attempt = element.play();
    if (!attempt) return;
    attempt
      .then(() => {
        setPlaying(true);
        setBlocked(false);
      })
      .catch(() => {
        setPlaying(false);
        setBlocked(true);
      });
  }, [applyVolume, hydrated, prefs.enabled, prefs.track]);

  useEffect(() => {
    applyVolume(prefs.volume);
  }, [applyVolume, prefs.volume]);

  useEffect(() => {
    if (hydrated) writeMusicPrefs(prefs);
  }, [hydrated, prefs]);

  // Đóng khay tiện ích bằng Esc hoặc bằng cú bấm ra ngoài, và trả tiêu điểm về nút bong bóng.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panel.current?.contains(target) || trigger.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const toggleMusic = useCallback(() => {
    const next = !prefs.enabled;
    setPrefs(current => ({ ...current, enabled: next }));
    const element = audio.current;
    if (!element) return;
    // Dựng GainNode ngay trong cú bấm: iOS chỉ mở khoá Web Audio từ thao tác người dùng.
    ensureVolumeGraph();
    applyVolume(volumeRef.current);
    if (next) {
      // Phát ngay trong cú bấm: Safari/Firefox chỉ mở khoá âm thanh từ thao tác của người dùng.
      element
        .play()
        .then(() => {
          setPlaying(true);
          setBlocked(false);
        })
        .catch(() => setBlocked(true));
    } else {
      element.pause();
      setPlaying(false);
      setBlocked(false);
    }
  }, [applyVolume, ensureVolumeGraph, prefs.enabled]);

  const togglePlayback = useCallback(() => {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      setPlaying(false);
      return;
    }
    ensureVolumeGraph();
    applyVolume(volumeRef.current);
    element
      .play()
      .then(() => {
        setPlaying(true);
        setBlocked(false);
      })
      .catch(() => setBlocked(true));
  }, [applyVolume, ensureVolumeGraph]);

  const skip = useCallback((step: number) => {
    setPrefs(current => ({ ...current, track: trackIndex(current.track + step) }));
  }, []);

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end gap-3 print:hidden">
      {open ? (
        <div
          ref={panel}
          id="utility-panel"
          role="dialog"
          aria-label={t("Tiện ích")}
          className="max-h-[calc(100dvh-6.5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-xl motion-safe:animate-fade-up"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-sm font-semibold text-strong">{t("Tiện ích")}</p>
              <p className="mt-1 text-xs leading-relaxed text-subtle">{t("Vài tiện ích nhỏ cho buổi học dài.")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
              aria-label={t("Đóng")}
              className="rounded-sm p-1 text-subtle transition-colors hover:bg-muted hover:text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <XIcon size={18} aria-hidden />
            </button>
          </div>

          <section className="mt-4 rounded-lg border border-line bg-muted/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-strong">
                <MusicNotesIcon size={18} aria-hidden className={playing ? "text-accent" : "text-subtle"} />
                {t("Nhạc lofi")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.enabled}
                aria-label={t("Nhạc lofi")}
                onClick={toggleMusic}
                className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  prefs.enabled ? "bg-accent text-on-accent hover:bg-accent-hover" : "border border-line bg-surface text-body hover:bg-control"
                }`}
              >
                {prefs.enabled ? t("Bật") : t("Tắt")}
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-subtle">{t("Nhạc không lời, phát lặp cả danh sách trong lúc bạn học.")}</p>

            {prefs.enabled ? (
              <div className="mt-3 border-t border-line pt-3">
                <p className="truncate text-sm text-strong">{track.title}</p>
                <p className="mt-1 flex items-center justify-between gap-2 text-xs text-subtle">
                  <span className="truncate">{track.artist}</span>
                  <span className="shrink-0 font-mono tabular-nums">{trackTime(track.seconds)}</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => skip(-1)}
                    aria-label={t("Bài trước")}
                    className="rounded-full p-2 text-body transition-colors hover:bg-control hover:text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <SkipBackIcon size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlayback}
                    aria-label={playing ? t("Tạm dừng") : t("Phát")}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {playing ? <PauseIcon size={18} weight="fill" aria-hidden /> : <PlayIcon size={18} weight="fill" aria-hidden />}
                  </button>
                  <button
                    type="button"
                    onClick={() => skip(1)}
                    aria-label={t("Bài tiếp theo")}
                    className="rounded-full p-2 text-body transition-colors hover:bg-control hover:text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <SkipForwardIcon size={18} aria-hidden />
                  </button>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-subtle">
                  <span className="shrink-0 whitespace-nowrap">{t("Âm lượng")}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={prefs.volume}
                    onChange={event => {
                      const value = Number(event.target.value);
                      // Kéo thanh trượt cũng là thao tác người dùng: dựng GainNode ở đây để
                      // iPhone đổi tiếng ngay, và để lần phát sau đã sẵn đường âm lượng.
                      ensureVolumeGraph();
                      applyVolume(value);
                      setPrefs(current => ({ ...current, volume: value }));
                    }}
                    aria-label={t("Âm lượng")}
                    className="h-8 min-w-0 flex-1 accent-accent"
                  />
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums text-subtle">
                    {Math.round(prefs.volume * 100)}%
                  </span>
                </label>
                {blocked ? (
                  <p className="mt-2 text-xs text-warning">{t("Trình duyệt đang chặn tự phát — bấm Phát để nghe.")}</p>
                ) : null}
                <p className="mt-3 text-[11px] leading-relaxed text-subtle">
                  {t("Nhạc CC0 (Freesound) — miễn phí, không cần ghi công.")} {t("Tiếng chỉ phát trên thiết bị này.")}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls="utility-panel"
        aria-label={t("Trợ giúp và tiện ích")}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {open ? <XIcon size={22} aria-hidden /> : <SparkleIcon size={22} weight="duotone" aria-hidden />}
        {playing && !open ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-positive text-[11px] text-on-accent"
          >
            ♪
          </span>
        ) : null}
      </button>

      <audio
        ref={audio}
        src={trackSrc(track.slug)}
        preload="none"
        onEnded={() => skip(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
