import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MountainScene } from "./MountainScene";
import { farSnowPeaks, middleSnowPeaks, snowCapGeometry, type Point } from "@/lib/landscape";

function onLine(peak: Point, end: Point, point: Point) {
  return (point[0] - peak[0]) * (end[1] - peak[1]) - (point[1] - peak[1]) * (end[0] - peak[0]);
}
describe.each([...farSnowPeaks, ...middleSnowPeaks])("snow alignment at $peak", definition => {
  it("places both outer snow edges on the actual mountain slopes", () => {
    const cap = snowCapGeometry(definition);
    expect(onLine(definition.peak, definition.left, cap.leftEdge)).toBeCloseTo(0, 7);
    expect(onLine(definition.peak, definition.right, cap.rightEdge)).toBeCloseTo(0, 7);
    expect(cap.leftEdge[1]).toBe(definition.peak[1] + definition.depth);
    expect(cap.rightEdge[1]).toBe(cap.leftEdge[1]);
    expect(cap.outline).toMatch(/^M.*Z$/);
  });
  it("aligns the lower snow tip and shading plane with the ridge facet", () => {
    const cap = snowCapGeometry(definition);
    expect(onLine(definition.peak, definition.facetBase, cap.tip)).toBeCloseTo(0, 7);
    expect(cap.facet).toContain(definition.facetBase.join(" "));
  });
});
describe("decorative landscape instances", () => {
  it("keeps snow shading inside instance-specific snow clips", () => {
    const html = renderToStaticMarkup(<><MountainScene /><MountainScene portrait /></>);
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map(match => match[1]);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    for (const id of ids) expect(html).toContain(`clip-path="url(#${id})"`);
  });
  it("includes a small daytime flock and only two sparse meteor tracks", () => {
    const html = renderToStaticMarkup(<MountainScene />);
    expect(html.match(/class="scene-bird-wing scene-bird-wing--/g)).toHaveLength(6);
    expect(html.match(/class="scene-meteor scene-meteor--/g)).toHaveLength(2);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("tabindex");
    expect(html).not.toContain("https://");
  });
});
