import { describe, expect, it } from "vitest";
import { pageWindow } from "./pagination";

describe("five-page pagination window", () => {
  it.each([
    [1, 100, [1, 2, 3, 4, 5]],
    [50, 100, [48, 49, 50, 51, 52]],
    [99, 100, [96, 97, 98, 99, 100]],
    [100, 100, [96, 97, 98, 99, 100]],
    [2, 3, [1, 2, 3]],
    [1, 0, []],
    [-20, 100, [1, 2, 3, 4, 5]],
    [200, 100, [96, 97, 98, 99, 100]],
    [NaN, 5, [1, 2, 3, 4, 5]],
    [1, Infinity, []],
  ])("page %s of %s", (page, total, expected) => expect(pageWindow(page as number, total as number)).toEqual(expected));
});
