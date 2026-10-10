import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { VOCABULARY_TOPICS } from "./english-vocabulary";

describe("English listening assets", () => {
  it.each(["announcement-v1", "dialogue-v1", "talk-v1", "notices-campus-v1", "dialogue-study-space-v1", "dialogue-volunteer-shifts-v1", "talk-urban-shade-v1", "talk-retrieval-practice-v1", "listening-complete-practice-v1", "dialogue-hcmus-short-v1", "hcmus-listening-complete-v1"])("ships a real MP3 and authored source for %s", name => {
    const file = fs.readFileSync(path.join(process.cwd(), "public/english/audio", name + ".mp3"));
    const script = fs.readFileSync(path.join(process.cwd(), "docs/english/audio-scripts", name + ".txt"), "utf8");
    expect(file.length).toBeGreaterThan(10000);
    expect(file.length).toBeLessThan(name.includes("complete") ? 15_000_000 : 3_000_000);
    expect(file.subarray(0, 3).toString()).toBe("ID3");
    expect(script.trim().length).toBeGreaterThan(100);
  });
  it("labels original synthetic practice, not official VSTEP audio", () => {
    const provenance = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/english/audio/provenance.json"), "utf8"));
    expect(provenance.source).toContain("not official VSTEP");
    expect(provenance.generator).toContain("Kokoro");
    expect(provenance.generator).toContain("0.4.7");
    expect(provenance.modelLicense).toBe("Apache-2.0");
    expect(provenance.assets).toHaveLength(171);
    expect(new Set(provenance.assets.map((r: { path: string }) => r.path)).size).toBe(171);
    const hcmus = provenance.assets.find((r: { path: string }) => r.path.endsWith("hcmus-listening-complete-v1.mp3"));
    expect(hcmus.sources.map((r: { path: string }) => r.path)).toEqual(["/english/audio/dialogue-hcmus-short-v1.mp3", "/english/audio/dialogue-study-space-v1.mp3", "/english/audio/talk-urban-shade-v1.mp3"]);
    expect(hcmus.composition).toContain("no new synthesis");
    for (const source of hcmus.sources) expect(createHash("sha256").update(fs.readFileSync(path.join(process.cwd(), "public", source.path))).digest("hex")).toBe(source.sha256);
    const composite = provenance.assets.find((r: { path: string }) => r.path.endsWith("listening-complete-practice-v1.mp3"));
    expect(composite.sources).toHaveLength(7);
    expect(composite.composition).toContain("no new synthesis");
    for (const source of composite.sources) expect(createHash("sha256").update(fs.readFileSync(path.join(process.cwd(), "public", source.path))).digest("hex")).toBe(source.sha256);
    expect(provenance.modelSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(provenance.notice).toContain("not bundled");
    for (const record of provenance.assets) {
      const file = fs.readFileSync(path.join(process.cwd(), "public", record.path));
      expect(createHash("sha256").update(file).digest("hex")).toBe(record.sha256);
      expect(record.seconds).toBeGreaterThan(0.5);
      expect(record.textSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
  it.each(VOCABULARY_TOPICS.flatMap(t => t.entries))("ships neural pronunciation for $id", entry => {
    const file = fs.readFileSync(path.join(process.cwd(), "public", entry.audioPath));
    expect(file.subarray(0, 3).toString()).toBe("ID3");
    expect(file.length).toBeGreaterThan(5000);
    expect(file.length).toBeLessThan(100000);
  });
});
