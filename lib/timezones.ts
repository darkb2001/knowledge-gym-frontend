const FALLBACK_TIMEZONES = [
  "UTC", "Africa/Cairo", "Africa/Johannesburg", "America/Los_Angeles", "America/New_York",
  "America/Sao_Paulo", "Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Hong_Kong", "Asia/Jakarta",
  "Asia/Kolkata", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Europe/Berlin", "Europe/London", "Europe/Paris", "Pacific/Auckland",
];

/** Uses the browser's IANA timezone registry; no third-party network request is needed. */
export function supportedTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    const zones = new Set(Intl.supportedValuesOf("timeZone"));
    // Keep the familiar canonical application value even where the browser only exposes its alias.
    zones.add("Asia/Ho_Chi_Minh");
    return ["UTC", ...Array.from(zones).filter(zone => zone !== "UTC").sort()];
  }
  return FALLBACK_TIMEZONES;
}
