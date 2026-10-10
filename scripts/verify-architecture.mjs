/* Synthetic authentication fixtures, not production/backend verification. */
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const base = process.env.KG_UI_URL || "http://localhost:3217";
const output = ".impeccable/review/architecture";
fs.mkdirSync(output, { recursive: true });
const report = { evidence: "Synthetic browser auth fixtures; no live production or backend claims", checks: [], accessibility: [], errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" } : {}) });
const slugs = ["deployment", "layers", "async", "password", "google", "refresh", "sessions"];
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
async function fixtures(context, role) {
  await context.addCookies([{ name: "kg_session", value: "1", url: base }]);
  // Deliberately forged client cache: the real mocked /users/me must still decide role.
  await context.addInitScript(() => {
    if (window.top !== window.self) return;
    sessionStorage.setItem("kg.user", JSON.stringify({ id: "fixture", role: "ADMIN", displayName: "Forged client cache" }));
    localStorage.setItem("kg.motion", "off");
  });
  await context.route("**/api/v1/**", async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const headers = { "access-control-allow-origin": base, "access-control-allow-credentials": "true", "access-control-allow-headers": "Authorization,Content-Type", "access-control-allow-methods": "GET,POST,OPTIONS" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (pathname.endsWith("/auth/refresh")) return route.fulfill({ headers, json: { accessToken: "synthetic-access-only", expiresIn: 900 } });
    if (pathname.endsWith("/users/me")) return route.fulfill({ headers, json: { id: "fixture", email: "owner@example.test", displayName: "Fixture Owner", role } });
    throw new Error(`Documentation unexpectedly requested ${request.method()} ${pathname}`);
  });
}
try {
  const guest = await browser.newPage();
  await guest.goto(`${base}/admin/architecture`);
  check("guest redirected to login", new URL(guest.url()).pathname === "/login");
  await guest.close();
  const userContext = await browser.newContext();
  await fixtures(userContext, "USER");
  const userPage = await userContext.newPage();
  await userPage.goto(`${base}/admin/architecture`);
  await userPage.getByRole("heading", { name: "Cần quyền quản trị" }).waitFor();
  check("non-admin including forged client role cannot render documentation workspace", await userPage.locator("#system-diagrams").count() === 0);
  await userContext.close();

  for (const [device, width, height, theme] of [["desktop", 1440, 1000, "light"], ["mobile", 390, 844, "dark"]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    await fixtures(context, "ADMIN");
    await context.addInitScript(value => { if (window.top === window.self) localStorage.setItem("kg.theme", value); }, theme);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => report.errors.push(`${device}: ${error.message}`));
    await page.goto(`${base}/admin/architecture`);
    await page.getByRole("heading", { name: "Kiến trúc & luồng xác thực", exact: true }).waitFor();
    const select = page.getByLabel("Chọn sơ đồ để khám phá");
    const capture = async name => {
      check(`${device}/${name}: no page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/${device}-${name}.png`, fullPage: false });
    };
    await page.locator("iframe").scrollIntoViewIfNeeded();
    for (const slug of slugs) {
      await select.selectOption(slug);
      const frame = await page.locator("iframe").elementHandle();
      const content = await frame.contentFrame();
      await content.waitForSelector("svg");
      await content.waitForFunction(() => document.fonts.status === "loaded");
      check(`${device}: ${slug} diagram renders`, await content.locator("svg").count() > 0);
      check(`${device}: ${slug} viewer has no horizontal overflow`, await content.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await select.selectOption("deployment");
    await page.locator("iframe").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // Bounded layout settle, not a polling loop.
    await capture("diagram");
    await page.locator("#session-lifetime").scrollIntoViewIfNeeded();
    const scenarios = page.getByLabel("Thử hai tình huống minh họa");
    await scenarios.selectOption("idle");
    check(`${device}: idle example expires`, await page.getByRole("status").filter({ hasText: "đã hết hạn từ ngày 7" }).count() === 1);
    await scenarios.selectOption("active");
    check(`${device}: rolling example survives beyond a week`, await page.getByRole("status").filter({ hasText: "R3 vẫn còn hạn đến ngày 25" }).count() === 1);
    await capture("lifetime");
    // Axe scans the shell/workspace; the sandboxed standalone viewers have their own Archify gates.
    const axe = await new AxeBuilder({ page }).exclude("iframe").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    report.accessibility.push({ device, violations: axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
    if (device === "desktop") {
      await page.getByRole("button", { name: "English", exact: true }).click();
      await page.getByRole("heading", { name: "Architecture & authentication flows", exact: true }).waitFor();
      check("English documentation UI switches", await page.getByLabel("Choose a diagram to explore").count() === 1);
      await page.evaluate(() => scrollTo(0, 0));
      await capture("english");
    }
    await context.close();
  }
  assert.equal(report.errors.length, 0, "browser exceptions");
  assert.equal(report.accessibility.flatMap(row => row.violations).length, 0, "workspace accessibility violations");
} finally {
  await browser.close();
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
