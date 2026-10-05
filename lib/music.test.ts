import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import {
  LOOP_TRACKS,
  MUSIC_DEFAULT,
  MUSIC_KEY,
  clampVolume,
  nextTrackIndex,
  parseMusicPrefs,
  readMusicPrefs,
  trackIndex,
  trackSrc,
  trackTime,
  writeMusicPrefs,
} from "./music";

describe("lo-fi study music", () => {
  it("stays silent until the learner switches it on", () => {
    expect(MUSIC_DEFAULT.enabled).toBe(false);
    expect(MUSIC_DEFAULT.volume).toBeGreaterThan(0);
    expect(MUSIC_DEFAULT.volume).toBeLessThan(0.6);
  });

  it("repairs stored preferences that are missing, broken or out of range", () => {
    expect(parseMusicPrefs(null)).toEqual({ ...MUSIC_DEFAULT });
    expect(parseMusicPrefs("not json at all")).toEqual({ ...MUSIC_DEFAULT });
    expect(parseMusicPrefs("[1,2,3]")).toEqual({ ...MUSIC_DEFAULT });
    expect(parseMusicPrefs('{"enabled":"yes","volume":5,"track":-1}')).toEqual({
      enabled: false,
      volume: 1,
      track: LOOP_TRACKS.length - 1,
    });
    expect(parseMusicPrefs('{"enabled":true,"volume":-3,"track":99}').track).toBe(99 % LOOP_TRACKS.length);
  });

  it("tolerates a blocked localStorage in both directions", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readMusicPrefs(blocked)).toEqual({ ...MUSIC_DEFAULT });
    expect(() => writeMusicPrefs({ enabled: true, volume: 0.4, track: 2 }, blocked)).not.toThrow();
    const store = new Map<string, string>();
    writeMusicPrefs({ enabled: true, volume: 0.4, track: 2 }, { setItem: (k, v) => void store.set(k, v) });
    expect(readMusicPrefs({ getItem: key => store.get(key) ?? null })).toEqual({ enabled: true, volume: 0.4, track: 2 });
    expect(store.has(MUSIC_KEY)).toBe(true);
    // Phía máy chủ không có localStorage: gọi mà không truyền storage vẫn phải im lặng, không ném lỗi.
    expect(() => writeMusicPrefs({ enabled: true, volume: 0.5, track: 1 })).not.toThrow();
    expect(readMusicPrefs().enabled).toBe(false);
  });

  it("clamps volume and wraps track indexes instead of trusting them", () => {
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume("loud")).toBe(MUSIC_DEFAULT.volume);
    expect(clampVolume(0.4567)).toBe(0.46);
    expect(trackIndex(undefined)).toBe(0);
    expect(trackIndex(3.9)).toBe(3);
    expect(trackIndex(-1)).toBe(LOOP_TRACKS.length - 1);
  });

  it("loops back to the first track after the last one", () => {
    expect(nextTrackIndex(0)).toBe(1);
    expect(nextTrackIndex(LOOP_TRACKS.length - 1)).toBe(0);
    expect(nextTrackIndex(LOOP_TRACKS.length)).toBe(1);
  });

  it("shows track length as minutes and seconds", () => {
    expect(trackTime(269)).toBe("4:29");
    expect(trackTime(60)).toBe("1:00");
    expect(trackTime(59.6)).toBe("1:00");
    expect(trackTime(0)).toBe("0:00");
    expect(trackTime(Number.NaN)).toBe("0:00");
  });

  it("ships every promised audio file next to the playlist", () => {
    const slugs = LOOP_TRACKS.map(track => track.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const track of LOOP_TRACKS) {
      expect(track.title.trim()).not.toBe("");
      expect(track.artist.trim()).not.toBe("");
      expect(track.seconds).toBeGreaterThan(60);
      expect(trackSrc(track.slug)).toBe(`/lofi/${track.slug}.mp3`);
      const file = statSync(resolve(__dirname, "../public/lofi", `${track.slug}.mp3`));
      expect(file.size).toBeGreaterThan(500_000);
    }
  });
});
