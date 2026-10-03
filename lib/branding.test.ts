import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const asset = (name: string) => readFileSync(new URL(`../app/${name}`, import.meta.url));

describe("Knowledge Gym browser branding", () => {
  it("uses the existing blue/cream stack identity in a self-contained SVG", () => {
    const svg = asset("icon.svg").toString("utf8");
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain('<title>Knowledge Gym</title>');
    expect(svg).toContain('#345f73');
    expect(svg).toContain('#fffcf6');
    expect(svg).not.toMatch(/<script|https?:\/\/(?!www\.w3\.org)/);
  });
  it("provides real 16/32/48/64 pixel ICO frames, not an HTML fallback", () => {
    const ico = asset("favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(4);
    const sizes = Array.from({ length: 4 }, (_, i) => ico[6 + i * 16]).sort((a, b) => a - b);
    expect(sizes).toEqual([16, 32, 48, 64]);
  });
  it("ships a 180px PNG for Safari/iOS touch icons", () => {
    const png = asset("apple-icon.png");
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBe(180);
    expect(png.readUInt32BE(20)).toBe(180);
  });
});
