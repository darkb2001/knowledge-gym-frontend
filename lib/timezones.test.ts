import { describe, expect, it } from "vitest";
import { supportedTimezones } from "./timezones";

describe("timezone selector data", () => {
  it("returns sorted IANA values with UTC available", () => {
    const zones = supportedTimezones();
    expect(zones[0]).toBe("UTC");
    expect(zones).toContain("Asia/Ho_Chi_Minh");
    expect(new Set(zones).size).toBe(zones.length);
    expect(zones.slice(1)).toEqual([...zones.slice(1)].sort());
  });
});
