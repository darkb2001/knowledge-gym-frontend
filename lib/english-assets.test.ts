import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("English listening assets", () => {
  it.each(["announcement-v1", "dialogue-v1", "talk-v1"])("ships a real MP3 and authored source for %s", name => {
    const file = fs.readFileSync(path.join(process.cwd(), "public/english/audio", name + ".mp3"));
    const script = fs.readFileSync(path.join(process.cwd(), "docs/english/audio-scripts", name + ".txt"), "utf8");
    expect(file.length).toBeGreaterThan(10000);
    expect(file.length).toBeLessThan(2_000_000);
    expect(file.subarray(0, 3).toString()).toBe("ID3");
    expect(script.trim().length).toBeGreaterThan(100);
  });
  it("labels original synthetic practice, not official VSTEP audio", () => {
    const provenance = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/english/audio/provenance.json"), "utf8"));
    expect(provenance.source).toContain("not official VSTEP");
    expect(provenance.generator).toContain("espeak");
    expect(provenance.notice).toContain("not bundled");
  });
});
