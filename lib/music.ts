export const MUSIC_KEY = "kg.music";

export type MusicPrefs = { enabled: boolean; volume: number; track: number };

export type LoopTrack = { slug: string; title: string; artist: string; seconds: number };

/**
 * Nhạc nền lofi không lời, giấy phép CC0 (dùng thương mại, không bắt buộc ghi công nhưng vẫn ghi nguồn
 * trong khay tiện ích cho minh bạch). Tệp nằm trong public/lofi nên trang tự phát, không gọi API bên
 * thứ ba lúc chạy và không phụ thuộc dịch vụ ngoài. Nguồn: Openverse (Freesound) — xem
 * public/lofi/CREDITS.txt khi cần thay hoặc thêm bài.
 */
export const LOOP_TRACKS: readonly LoopTrack[] = [
  { slug: "lofi-dayum", title: "Dayum", artist: "loveless1017", seconds: 269 },
  { slug: "vanilla-lofi-beat", title: "Vanilla Lofi Beat", artist: "Seth Makes Sounds", seconds: 185 },
  { slug: "aesthetic-lofi-loop", title: "Aesthetic Lofi Loop", artist: "Seth Makes Sounds", seconds: 160 },
  { slug: "real-chill-beat", title: "Real Chill Beat", artist: "Seth Makes Sounds", seconds: 171 },
  { slug: "soul-beat", title: "Soul Beat", artist: "Seth Makes Sounds", seconds: 151 },
  { slug: "guitar-background-loop", title: "Cool Guitar Background Music", artist: "Seth Makes Sounds", seconds: 165 },
];

/** Mặc định tắt: trình duyệt chỉ phát tiếng sau một cú bấm của người dùng, và không ai muốn bị tự phát. */
export const MUSIC_DEFAULT: MusicPrefs = { enabled: false, volume: 0.35, track: 0 };

export const trackSrc = (slug: string) => `/lofi/${slug}.mp3`;

export function clampVolume(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : MUSIC_DEFAULT.volume;
  return Math.min(1, Math.max(0, Math.round(numeric * 100) / 100));
}

export function trackIndex(value: unknown, total: number = LOOP_TRACKS.length): number {
  if (total <= 0) return 0;
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  return ((numeric % total) + total) % total;
}

/** Giá trị trong localStorage là dữ liệu ngoài tầm kiểm soát: hỏng, thiếu, hoặc do người khác sửa. */
export function parseMusicPrefs(raw: string | null | undefined): MusicPrefs {
  if (!raw) return { ...MUSIC_DEFAULT };
  try {
    const parsed = JSON.parse(raw) as Partial<MusicPrefs> | null;
    if (!parsed || typeof parsed !== "object") return { ...MUSIC_DEFAULT };
    return { enabled: parsed.enabled === true, volume: clampVolume(parsed.volume), track: trackIndex(parsed.track) };
  } catch {
    return { ...MUSIC_DEFAULT };
  }
}

/** Không truyền `storage` thì lấy localStorage của môi trường hiện tại (undefined ở phía máy chủ). */
function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readMusicPrefs(storage?: Pick<Storage, "getItem">): MusicPrefs {
  try {
    return parseMusicPrefs((storage ?? defaultStorage())?.getItem(MUSIC_KEY) ?? null);
  } catch {
    return { ...MUSIC_DEFAULT };
  }
}

export function writeMusicPrefs(prefs: MusicPrefs, storage?: Pick<Storage, "setItem">): void {
  try {
    (storage ?? defaultStorage())?.setItem(
      MUSIC_KEY,
      JSON.stringify({ enabled: prefs.enabled === true, volume: clampVolume(prefs.volume), track: trackIndex(prefs.track) }),
    );
  } catch {
    // Chế độ riêng tư chặn localStorage: nhạc vẫn dùng được cho phiên hiện tại.
  }
}

/**
 * iOS/Safari: `audio.volume` là read-only — theo tài liệu Apple "iOS-Specific
 * Considerations", trên iOS "the volume property is not settable in JavaScript.
 * Reading the volume property always returns 1", nên kéo thanh âm lượng bằng
 * `element.volume` không có tác dụng gì trên iPhone. Muốn nó thật sự đổi tiếng thì
 * phải đưa âm thanh qua Web Audio GainNode (`createMediaElementSource`).
 *
 * Bắt buộc gọi trong một thao tác thật của người dùng (bấm nút / kéo thanh trượt):
 * AudioContext tạo ngoài thao tác sẽ ở trạng thái suspended và bài đang phát mất tiếng.
 *
 * Trả về `null` khi trình duyệt không có Web Audio (hoặc bị chặn) để nơi gọi quay về
 * `element.volume` như trước.
 */
export type AudioGraph = { setVolume: (value: number) => void; resume: () => void };

/**
 * Bề mặt tối thiểu của AudioContext mà ta dùng — khai báo bằng type DOM thật để
 * `new AudioContext()` khớp thẳng, còn test thì truyền đồ giả đã ép kiểu.
 */
export type AudioGraphContext = {
  createGain: () => GainNode;
  createMediaElementSource: (element: HTMLAudioElement) => MediaElementAudioSourceNode;
  destination: AudioNode;
  resume?: () => Promise<void> | void;
};

export function attachVolumeGraph(
  element: HTMLAudioElement,
  initialVolume: number,
  createContext: () => AudioGraphContext,
): AudioGraph | null {
  try {
    const context = createContext();
    const gain = context.createGain();
    gain.gain.value = clampVolume(initialVolume);
    context.createMediaElementSource(element).connect(gain);
    gain.connect(context.destination);
    // Âm lượng giờ do GainNode quyết định; để phần tử ở 1 nếu không sẽ suy giảm hai lần.
    element.volume = 1;
    return {
      setVolume(value: number) {
        gain.gain.value = clampVolume(value);
      },
      resume() {
        try {
          const pending = context.resume?.();
          // Nuốt lỗi: iOS có thể từ chối resume khi chưa có thao tác người dùng, và một
          // promise bị từ chối mà không ai bắt sẽ làm hỏng cả phiên (unhandled rejection).
          if (pending && typeof pending.catch === "function") void pending.catch(() => {});
        } catch {
          // Safari cũ không có resume(): bỏ qua, âm thanh vẫn đi qua GainNode.
        }
      },
    };
  } catch {
    return null;
  }
}

/** Hết bài thì quay vòng danh sách — "loop mấy bài đó" mà không cần bấm gì. */
export function nextTrackIndex(current: unknown, total: number = LOOP_TRACKS.length): number {
  return trackIndex(trackIndex(current, total) + 1, total);
}

export function trackTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
