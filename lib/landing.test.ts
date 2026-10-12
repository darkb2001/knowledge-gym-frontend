import fs from "node:fs";
import crypto from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/locale";
import { ThemeProvider } from "@/components/theme";
import { LandingPage } from "@/components/landing/LandingPage";
import { CacheDemo } from "@/components/landing/CacheDemo";
import { CACHE_STEPS, LANDING_DIAGRAM_URL, landingPosts } from "./landing";
import { isPublicPath, requiresAuth, loginRedirectTarget } from "./route-guard";

const post = { id: "p1", title: "An original article", slug: "an-article", excerpt: "Plain text", publishedAt: "2026-10-01T12:00:00Z", tags: ["Java"] };

describe("public landing boundary", () => {
  it("opens only the root and public blog while preserving learning destinations", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath(LANDING_DIAGRAM_URL)).toBe(true);
    for (const route of ["/learn", "/english", "/notes", "/admin", "/dashboard", "/questions/one"]) expect(requiresAuth(route)).toBe(true);
    expect(loginRedirectTarget("/english", "?track=hcmus")).toBe("/login?next=%2Fenglish%3Ftrack%3Dhcmus");
    expect(isPublicPath("//untrusted.example")).toBe(false);
  });
  it("renders readable content and working destinations without a user/session", () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ThemeProvider, null, createElement(LandingPage))));
    expect(html).toContain("kiến thức thành");
    expect(html).toContain("English Studio");
    expect(html).toContain('href="/learn"');
    expect(html).toContain('href="/english"');
    expect(html).toContain('href="/blog"');
    expect(html).toContain('id="diagram-demo"');
    expect(html).toContain('id="landing-main"');
    expect(html).not.toContain("<iframe"); // Heavy reader is genuinely opt-in.
    expect(html).not.toContain("kg-shell"); // No incidental learning-shell redesign.
    expect(html).toContain("không phải request thật");
  });
  it("does not import authenticated transport, fixtures or learning mutation APIs", () => {
    const articles = fs.readFileSync("components/landing/PublishedArticles.tsx", "utf8");
    const demo = fs.readFileSync("components/landing/CacheDemo.tsx", "utf8");
    expect(articles).toContain('credentials: "omit"');
    expect(articles).toContain("/blog/posts?page=0&size=3");
    expect(articles).not.toMatch(/restoreSession|apiGet|Authorization|\/admin\/|\.fixtures/);
    expect(demo).not.toMatch(/\bfetch\(|localStorage|submitAttempt|recordAttempt/);
  });
});

describe("native diagram reader and motion boundaries", () => {
  it("does not create an eager dialog, iframe or duplicate demo in SSR", () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(CacheDemo)));
    expect(html).toContain("Mở diagram lớn");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("<dialog");
    expect(html).not.toContain("<iframe");
    expect(html.match(/id="diagram-demo"/g)).toHaveLength(1);
    expect(html.match(/role="button"/g)).toHaveLength(4);
  });
  it("renders an independent reader demo without another opener or duplicate anchor", () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(CacheDemo, { allowReader: false, initialMode: "hit", initialStep: 2 })));
    expect(html).toContain('data-mode="hit"');
    expect(html).toContain('data-step="2"');
    expect(html).toContain("không được truy vấn");
    expect(html).not.toContain("Mở diagram lớn");
    expect(html).not.toContain('id="diagram-demo"');
  });
  it("keeps continuous values out of React state and uses native focus/scroll restoration", () => {
    const motion = fs.readFileSync("components/landing/useLandingMotion.ts", "utf8");
    const reader = fs.readFileSync("components/landing/DiagramReader.tsx", "utf8");
    expect(motion).not.toContain("useState");
    expect(motion).toContain("requestAnimationFrame");
    expect(motion).toContain("cancelAnimationFrame");
    expect(motion).toContain("(hover: hover) and (pointer: fine)");
    expect(reader).toContain("createPortal");
    expect(reader).toContain("element.showModal()");
    expect(reader).toContain("preventScroll: true");
    expect(reader).not.toContain("<iframe");
  });
});

describe("public article previews", () => {
  it("accepts the published-only envelope and the legacy array", () => {
    expect(landingPosts({ items: [post] })).toEqual([post]);
    expect(landingPosts([post])).toEqual([post]);
  });
  it("filters explicit drafts, invalid publication dates and missing required fields", () => {
    expect(landingPosts({ items: [{ ...post, status: "DRAFT" }, { ...post, publishedAt: "bad" }, { ...post, slug: "" }, null, { ...post, id: "" }] })).toEqual([]);
  });
  it("caps previews, deduplicates and normalizes optional text/tags", () => {
    const value = [post, post, { ...post, id: "p2", excerpt: {}, tags: ["Java", 1, "Backend", "Review", "Extra"] }, { ...post, id: "p3" }, { ...post, id: "p4" }];
    const result = landingPosts(value);
    expect(result).toHaveLength(3);
    expect(result[1].excerpt).toBeNull();
    expect(result[1].tags).toEqual(["Java", "Backend", "Review"]);
  });
  it("rejects a malformed items payload", () => {
    for (const value of [{ items: "bad" }, {}, null, "bad"]) expect(() => landingPosts(value)).toThrow("Invalid public blog response");
  });
});

describe("checked Archify teaching artifact", () => {
  it("publishes exactly the finalized bytes with all four gates passing", () => {
    const receipt = JSON.parse(fs.readFileSync("docs/landing/cache-aside.finalize-summary.json", "utf8"));
    const spec = JSON.parse(fs.readFileSync("docs/landing/cache-aside.json", "utf8"));
    const bytes = fs.readFileSync(`public${LANDING_DIAGRAM_URL}`);
    expect(receipt.ok).toBe(true);
    expect(Object.values(receipt.gates)).toEqual(["pass", "pass", "pass", "pass"]);
    expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(receipt.artifact.sha256);
    expect(spec.meta.animation).toBe("trace");
    expect(spec.participants.map((p: { id: string }) => p.id)).toEqual(["client", "api", "cache", "database"]);
    expect(spec.cards[0].items[0]).toContain("not Knowledge Gym");
  });
  it("has complete VI/EN step descriptions for both scenarios", () => {
    expect(CACHE_STEPS).toHaveLength(4);
    for (const step of CACHE_STEPS) for (const copy of [step.label, step.miss, step.hit]) {
      expect(copy).toHaveLength(2);
      expect(copy.every(text => text.length > 5)).toBe(true);
    }
    expect(CACHE_STEPS[2].hit[1]).toContain("not queried");
    expect(CACHE_STEPS[2].miss[1]).toContain("TTL");
  });
});
