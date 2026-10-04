import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import config from "../tailwind.config";
import { readTheme, THEME_KEY, THEME_INIT_SCRIPT, themeColors, validTheme } from "./theme";
describe("scenic theme preference", () => {
  it("defaults to light and ignores malformed preferences", () => {
    expect(validTheme(null)).toBe("light");
    expect(validTheme("unexpected")).toBe("light");
    expect(readTheme()).toBe("light");
    expect(validTheme("dark")).toBe("dark");
  });
  it("reads only the theme key and tolerates unavailable storage", () => {
    expect(readTheme({ getItem: key => key === THEME_KEY ? "dark" : null })).toBe("dark");
    expect(readTheme({ getItem: () => { throw new Error("Denied"); } })).toBe("light");
    expect(THEME_INIT_SCRIPT).not.toMatch(/cookie|token|auth|fetch/);
  });
  it("keeps both CSS palettes synchronized with contrast-test colors", () => {
    const css = readFileSync(new URL("../app/scenic.css", import.meta.url), "utf8");
    for (const [theme, palette] of Object.entries(themeColors)) {
      const section = theme === "light" ? css.split(":root {")[1] : css.split(':root[data-theme="dark"] {')[1];
      for (const [key, value] of Object.entries(palette)) {
        const rgb = [1,3,5].map(i => parseInt(value.slice(i,i+2),16)).join(" ");
        expect(section).toContain(`--kg-${key}: ${rgb};`);
      }
    }
    expect(config.theme?.extend?.colors).toHaveProperty("canvas", "rgb(var(--kg-canvas) / <alpha-value>)");
  });
  it("uses semantic scrollbar colors rather than the previous fixed beige thumb", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(css).toContain("scrollbar-color: rgb(var(--kg-control)) rgb(var(--kg-surface))");
    expect(css).toContain("::-webkit-scrollbar-thumb:hover { background: rgb(var(--kg-accent))");
    expect(css).not.toContain("#b7bcad");
  });
  it("preserves login fields, validation, credential submission and redirect behavior", () => {
    const login = readFileSync(new URL("../app/(auth)/login/page.tsx", import.meta.url), "utf8");
    expect(login).toContain('type="email"');
    expect(login).toContain('autoComplete="email"');
    expect(login).toContain('type="password"');
    expect(login).toContain('autoComplete="current-password"');
    expect(login.match(/\n            required/g)).toHaveLength(2);
    expect(login).toContain("await login(email.trim(), password)");
    expect(login).toContain("router.replace(safeNextPath())");
    expect(login).toContain("onClick={startGoogleLogin}");
    expect(login).toContain('href="/verify-email"');
    expect(login).toContain('href="/forgot-password"');
    expect(login).toContain('href="/register"');
  });
});
