export type Point = readonly [number, number];
export type SnowPeak = { peak: Point; left: Point; right: Point; facetBase: Point; depth: number };
export const farSnowPeaks: readonly SnowPeak[] = [
  { peak: [355,272], left: [187,514], right: [532,521], facetBase: [316,591], depth: 70 },
  { peak: [995,317], left: [804,556], right: [1155,502], facetBase: [973,675], depth: 62 },
  { peak: [1334,263], left: [1155,502], right: [1550,577], facetBase: [1303,688], depth: 80 },
];
export const middleSnowPeaks: readonly SnowPeak[] = [
  { peak: [445,463], left: [236,670], right: [659,737], facetBase: [379,817], depth: 60 },
  { peak: [1190,483], left: [1035,684], right: [1530,742], facetBase: [1147,868], depth: 62 },
];
/** Derive both snow boundaries from the actual ridge edges; align the lower tip with the mountain facet. */
export function snowCapGeometry({ peak, left, right, facetBase, depth }: SnowPeak) {
  const y = peak[1] + depth;
  const leftEdge: Point = [peak[0] + (left[0] - peak[0]) * depth / (left[1] - peak[1]), y];
  const rightEdge: Point = [peak[0] + (right[0] - peak[0]) * depth / (right[1] - peak[1]), y];
  const tip: Point = [peak[0] + (facetBase[0] - peak[0]) * (depth + 18) / (facetBase[1] - peak[1]), y + 18];
  const outline = `M${peak.join(" ")}L${leftEdge.join(" ")}L${peak[0] - (peak[0] - leftEdge[0]) * .37} ${y - 8}L${tip.join(" ")}L${peak[0] + (rightEdge[0] - peak[0]) * .4} ${y - 5}L${rightEdge.join(" ")}Z`;
  return { outline, facet: `M${peak.join(" ")}L${facetBase.join(" ")}L${right.join(" ")}Z`, leftEdge, rightEdge, tip };
}
