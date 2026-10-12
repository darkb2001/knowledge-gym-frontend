import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const base = process.env.KG_UI_URL ?? "http://127.0.0.1:3228";
const output = path.resolve(".impeccable/review/landing");
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.KG_CHROME_PATH ? { executablePath: process.env.KG_CHROME_PATH } : process.platform === "darwin" ? { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" } : {}) });
const checks = [];
const captures = [];
const errors = [];
const article = (id, title) => ({ id, title, slug: `landing-fixture-${id}`, excerpt: "Bài viết fixture dùng để kiểm tra bố cục và luồng công khai; không phải dữ liệu production.", publishedAt: "2026-10-01T12:00:00Z", tags: ["Backend", "System Design"] });
const items = [article("one", "Vì sao cache cần TTL?"), article("two", "Hiểu transaction qua một tình huống nhỏ"), article("three", "Một câu hỏi, nhiều cách nhìn")];
function check(name, ok, details) { checks.push({ name, ok, ...(details ? { details } : {}) }); if (!ok) { console.error(name + (details ? `: ${JSON.stringify(details)}` : "")); process.exitCode = 1; } }
async function snapshot(page, name) {
  const file = `${name}.png`;
  if (name === "desktop-diagram-reader") {
    // Capture the lazy reader in its visible viewport, not an unpainted offscreen iframe.
    await page.locator(".landing-reader-dialog").screenshot({ path: path.join(output, file) });
  } else {
    // Full-page captures start at the document top; scrolled fixed skip-links are not page ink.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, file), fullPage: true });
  }
  captures.push(file);
}
async function assertNoOverflow(page, name) {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  check(`${name}: no horizontal overflow`, widths.scroll <= widths.viewport + 1, widths);
}
async function axe(page, name) { const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); check(`${name}: automated WCAG`, result.violations.length === 0, result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))); }
async function context(options = {}) {
  const ctx = await browser.newContext(options);
  const requests = [];
  await ctx.route("**/api/v1/**", route => {
    requests.push({ url: route.request().url(), headers: route.request().headers() });
    if (route.request().url().includes("/blog/posts?")) return route.fulfill({ json: { items, total: 3, page: 0, size: 3, hasMore: false } });
    return route.fulfill({ status: 401, json: { message: "Unauthenticated fixture" } });
  });
  const page = await ctx.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  return { ctx, page, requests };
}
try {
  for (const [name, viewport, dark, reduced] of [
    ["desktop", { width: 1440, height: 900 }, false, false],
    ["laptop", { width: 1280, height: 800 }, false, false],
    ["mobile", { width: 390, height: 844 }, false, false],
    ["narrow", { width: 320, height: 740 }, false, false],
    ["landscape-dark", { width: 844, height: 390 }, true, false],
    ["desktop-dark-reduced", { width: 1440, height: 900 }, true, true],
  ]) {
    const touch = ["mobile", "narrow", "landscape-dark"].includes(name);
    const { ctx, page, requests } = await context({ viewport, hasTouch: touch, isMobile: touch, reducedMotion: reduced ? "reduce" : "no-preference" });
    if (dark) await ctx.addInitScript(() => localStorage.setItem("kg.theme", "dark"));
    const response = await page.goto(base + "/", { waitUntil: "networkidle" });
    check(`${name}: anonymous landing 200`, response.status() === 200);
    await page.getByText(items[0].title, { exact: true }).waitFor();
    check(`${name}: articles are public-only requests`, requests.length === 1 && requests[0].url.includes("/blog/posts?") && !requests[0].headers.authorization && !requests[0].headers.cookie, requests);
    check(`${name}: no eager iframe`, await page.locator("iframe").count() === 0);
    check(`${name}: idle study utility does not obscure public content`, !await page.locator("[data-study-utility]").isVisible());
    await assertNoOverflow(page, name);
    await axe(page, name);
    if (name === "laptop" || name === "mobile") {
      const bounds = await page.locator(".landing-hero-actions .landing-primary").boundingBox();
      check(`${name}: primary CTA visible in initial viewport`, bounds.y + bounds.height < viewport.height, bounds);
    }
    await snapshot(page, name);
    await page.getByRole("button", { name: "Cache hit", exact: true }).click();
    await page.getByRole("button", { name: "3. Lấy dữ liệu", exact: true }).click();
    check(`${name}: cache hit avoids database`, await page.locator(".landing-demo-caption").innerText().then(t => t.includes("không được truy vấn")));
    await page.getByRole("button", { name: "Cache miss", exact: true }).click();
    await page.getByRole("button", { name: "3. Lấy dữ liệu", exact: true }).click();
    check(`${name}: cache miss explains TTL`, await page.locator(".landing-demo-caption").innerText().then(t => t.includes("TTL")));
    await page.getByRole("button", { name: "1. Gửi request", exact: true }).click();
    if (reduced) {
      check(`${name}: playback disabled under reduced motion`, await page.getByRole("button", { name: "Giảm chuyển động", exact: true }).isDisabled());
      const animations = await page.locator(".kg-landing").evaluate(root => root.getAnimations({ subtree: true }).filter(a => a.playState === "running").length);
      check(`${name}: no running reduced-motion animations`, animations === 0, { animations });
    } else if (name === "desktop") {
      await page.getByRole("button", { name: "Chạy luồng", exact: true }).click();
      await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
      const pausedStep = await page.locator(".landing-demo").getAttribute("data-step");
      await page.waitForTimeout(1600);
      check("playback pauses without changing steps", await page.locator(".landing-demo").getAttribute("data-step") === pausedStep);
      check("pause also freezes the visual trace", await page.locator(".landing-edge.is-active").first().evaluate(element => getComputedStyle(element).animationPlayState === "paused"));
      await page.getByRole("button", { name: "Chạy luồng", exact: true }).click();
      await page.waitForTimeout(5500);
      check("finite playback stops after returning the response", await page.locator(".landing-demo").getAttribute("data-step") === "3" && await page.getByRole("button", { name: "Chạy luồng", exact: true }).count() === 1);
      await page.getByRole("button", { name: "English", exact: true }).click();
      await page.getByRole("heading", { name: "Turn knowledge into second nature.", exact: true }).waitFor();
      check("English UI preserves original article language", await page.getByText(items[0].title, { exact: true }).count() === 1);
      await snapshot(page, "desktop-en");
      await page.getByRole("button", { name: "Open a larger diagram", exact: true }).click();
      const englishReader = page.getByRole("dialog", { name: "Explore cache-aside", exact: true });
      await englishReader.waitFor({ state: "visible" });
      await englishReader.getByRole("button", { name: "Cache hit", exact: true }).click();
      await englishReader.getByRole("button", { name: "Explore Database", exact: true }).focus(); await page.keyboard.press("Enter");
      check("English reader exposes translated keyboard interaction", await englishReader.locator(".landing-demo").getAttribute("data-mode") === "hit" && await englishReader.locator(".landing-demo").getAttribute("data-step") === "2");
      await axe(page, "English diagram reader");
      await englishReader.getByRole("button", { name: "Close diagram", exact: true }).click();
      await englishReader.waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Tiếng Việt", exact: true }).click();
    }
    // Regression: opening the reader cannot expand the hero or move the next section.
    const trigger = page.getByRole("button", { name: "Mở diagram lớn", exact: true });
    await trigger.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => ({ hero: document.querySelector(".landing-hero").getBoundingClientRect().height, method: document.querySelector(".landing-method").getBoundingClientRect().top + scrollY, scroll: scrollY }));
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Khám phá cache-aside", exact: true });
    await dialog.waitFor({ state: "visible" });
    await dialog.locator(".landing-graph").waitFor({ state: "visible" });
    const opened = await page.evaluate(() => ({ hero: document.querySelector(".landing-hero").getBoundingClientRect().height, method: document.querySelector(".landing-method").getBoundingClientRect().top + scrollY, locked: document.body.style.overflow === "hidden" }));
    check(`${name}: reader never stretches the hero or creates a blank gap`, Math.abs(opened.hero - before.hero) < 2 && Math.abs(opened.method - before.method) < 2, { before, opened });
    check(`${name}: modal locks background scroll`, opened.locked);
    const close = page.getByRole("button", { name: "Đóng diagram", exact: true });
    check(`${name}: close action remains outside scrolling content`, await close.isVisible());
    await close.focus();
    for (let tab = 0; tab < 16; tab += 1) {
      await page.keyboard.press("Tab");
      if (!await dialog.evaluate(element => element.contains(document.activeElement))) throw new Error(`${name}: modal focus escaped`);
    }
    check(`${name}: keyboard focus is contained in the modal`, true);
    await dialog.getByRole("button", { name: "Khám phá Cache", exact: true }).focus(); await page.keyboard.press(" ");
    check(`${name}: enlarged diagram remains keyboard interactive`, await dialog.locator(".landing-demo").getAttribute("data-step") === "1");
    await axe(page, `${name} diagram reader`);
    if (reduced) check("reduced-motion reader has no running animation", await dialog.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length === 0));
    if (name === "desktop") await snapshot(page, "desktop-diagram-reader");
    if (name === "mobile") { await dialog.screenshot({ path: path.join(output, "mobile-diagram-reader.png") }); captures.push("mobile-diagram-reader.png"); }
    await close.click();
    await page.locator(".landing-reader-dialog").waitFor({ state: "detached" });
    check(`${name}: close unmounts reader and restores focus`, await trigger.evaluate(element => element === document.activeElement));
    check(`${name}: close restores scroll`, await page.evaluate(y => document.body.style.overflow !== "hidden" && Math.abs(scrollY - y) < 2, before.scroll));
    await trigger.click(); await close.waitFor({ state: "visible" }); await close.focus(); await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    check(`${name}: repeated opening and Escape closure work`, await page.locator("iframe").count() === 0);
    await trigger.click(); await close.waitFor({ state: "visible" });
    await page.mouse.click(2, 2); await dialog.waitFor({ state: "hidden" });
    check(`${name}: backdrop dismissal works`, await page.locator("iframe").count() === 0);
    await page.getByRole("button", { name: "Khám phá Database", exact: true }).focus(); await page.keyboard.press("Enter");
    check(`${name}: diagram nodes are keyboard explorable`, await page.locator(".landing-demo").getAttribute("data-step") === "2");
    if (name === "desktop") {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.mouse.move(10, 10);
      await page.waitForTimeout(150);
      const art = await page.locator(".landing-hero-art").boundingBox();
      await page.mouse.move(art.x + 30, art.y + 60);
      await page.waitForFunction(() => document.querySelector(".kg-landing").dataset.pointer === "true");
      check("pointer produces bounded diagram tilt", await page.locator(".kg-landing").evaluate(root => parseFloat(root.style.getPropertyValue("--tilt-y")) !== 0 && Math.abs(parseFloat(root.style.getPropertyValue("--tilt-y"))) <= 3.1));
      await page.getByRole("button", { name: "Khám phá Client", exact: true }).hover();
      check("pointer shape changes over explorable nodes", await page.locator(".kg-landing").getAttribute("data-pointer-focus") === "true");
      await page.locator(".landing-paths").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => Number(document.querySelector(".kg-landing").style.getPropertyValue("--reading-progress")) > 0);
      check("scroll advances reading progress and moves the learning visual", await page.locator(".kg-landing").evaluate(root => Math.abs(parseFloat(root.style.getPropertyValue("--path-travel"))) > 0));
    }
    if (touch || reduced) check(`${name}: no custom pointer on touch/reduced motion`, !await page.locator(".landing-pointer").isVisible());
    if (reduced) check("reduced-motion diagram has no spatial tilt", await page.locator(".landing-hero-depth").evaluate(element => getComputedStyle(element).transform === "none"));
    if (name === "mobile") {
      await page.getByRole("button", { name: "English", exact: true }).click();
      await assertNoOverflow(page, "mobile English");
      await axe(page, "mobile English");
      await snapshot(page, "mobile-en");
      await page.locator(".landing-hero-actions .landing-primary").click();
      await page.waitForURL(url => url.pathname === "/login");
      check("anonymous learning CTA keeps return-to", new URL(page.url()).searchParams.get("next") === "/learn", { url: page.url() });
      await page.goto(base + "/english?track=hcmus", { waitUntil: "networkidle" });
      check("English deep link remains protected and keeps its track", new URL(page.url()).pathname === "/login" && new URL(page.url()).searchParams.get("next") === "/english?track=hcmus");
    }
    await ctx.close();
  }
  // Deterministic state checks: the public endpoint is mocked, never an authenticated acceptance claim.
  for (const scenario of ["empty", "error", "retry", "long-text", "draft-filter"]) {
    const { ctx, page } = await context({ viewport: { width: 390, height: 844 } });
    let count = 0;
    await page.route("**/blog/posts?*", route => {
      count++;
      if (scenario === "error" || scenario === "retry" && count === 1) return route.fulfill({ status: 503, json: {} });
      const data = scenario === "empty" ? [] : scenario === "long-text" ? [article("long", "Unbroken".repeat(25))] : scenario === "draft-filter" ? [{ ...items[0], status: "DRAFT" }, items[1]] : items;
      return route.fulfill({ json: { items: data } });
    });
    await page.goto(base, { waitUntil: "networkidle" });
    if (scenario === "empty") check("published-empty state is honest", await page.getByText("Chưa có bài viết được xuất bản.", { exact: true }).count() === 1);
    else if (scenario === "error" || scenario === "retry") {
      await page.getByRole("button", { name: "Thử lại", exact: true }).waitFor();
      check(`${scenario}: recovery action shown`, await page.getByRole("button", { name: "Thử lại", exact: true }).count() === 1);
      if (scenario === "retry") { await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await page.getByText(items[0].title, { exact: true }).waitFor(); check("retry recovers without reload/login", count === 2); }
    } else if (scenario === "draft-filter") check("explicit draft is never previewed", await page.getByText(items[0].title, { exact: true }).count() === 0 && await page.getByText(items[1].title, { exact: true }).count() === 1);
    await assertNoOverflow(page, scenario);
    await snapshot(page, `mobile-${scenario}`);
    await ctx.close();
  }
  const { ctx, page } = await context({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const response = await page.goto(base, { waitUntil: "load" });
  check("no-JS landing remains public and readable", response.status() === 200 && await page.locator("h1").innerText().then(t => t.includes("kiến thức thành")));
  check("no-JS CTA is still a normal link", await page.locator(".landing-hero-actions .landing-primary").getAttribute("href") === "/learn");
  await ctx.close();
  check("no uncaught JavaScript errors", errors.length === 0, errors);
} finally {
  await browser.close();
  const report = { generatedAt: new Date().toISOString(), base, evidenceBoundary: "Local production build, public API fixtures. Not live backend, OAuth or deployed-production acceptance.", checks, captures, errors };
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: checks.filter(c => c.ok).length, failed: checks.filter(c => !c.ok).length, captures: captures.length, errors, report: path.join(output, "report.json") }, null, 2));
}
