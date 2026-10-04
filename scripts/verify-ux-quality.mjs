/* All API responses are synthetic. This verifies layout/UX, not backend persistence or authorization. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://127.0.0.1:3215';
const baseline = process.env.KG_UX_BASELINE === '1';
const output = `.impeccable/review/ux-${baseline ? 'before' : 'after'}`;
fs.mkdirSync(output, { recursive: true });
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const stats = { xp: 120, currentStreak: 2, longestStreak: 4, level: 1, badges: [] };
const user = { id: id(1), email: 'learner@example.test', displayName: 'Người học kiểm thử', role: 'ADMIN', authProvider: 'LOCAL', hasPassword: true, stats };
const topics = [{ id: id(2), slug: 'java', name: 'Java', description: 'Nền tảng ngôn ngữ Java.', displayOrder: 1, moduleCount: 1 }];
const modules = [{ id: id(3), topicId: id(2), topicSlug: 'java', slug: 'java-core', name: 'Java Core', description: 'JDK, JRE, JVM và những khái niệm nền tảng.', questionCount: 10, displayOrder: 1 }];
const question = { id: id(4), moduleId: id(3), moduleSlug: 'java-core', title: 'Phân biệt JDK, JRE và JVM?', difficulty: 'JUNIOR', tags: ['runtime'], sortOrder: 1 };
const draft = { id: id(5), goalId: null, kind: 'QUESTION', title: 'Vai trò của JVM trong ứng dụng Java', payloadJson: JSON.stringify({ title: 'Vai trò của JVM', answerHtml: '<h2>Thực thi bytecode</h2><p>JVM thực thi bytecode và quản lý bộ nhớ của chương trình Java.</p><pre><code>java Hello</code></pre><script>window.__fixtureXss=true</script>' }), sourceIds: [id(6)], status: 'REVIEW', model: 'fixture-model', tokensUsed: 120, costUsd: .001, createdAt: '2026-10-03T00:00:00Z', reviewedAt: null, reviewReason: null };
const goal = { id: id(7), name: 'Nền tảng JVM', topic: 'Java', objective: 'Giải thích JVM, bytecode và quản lý bộ nhớ.', status: 'DRAFT', autoPublish: false, dailyItemLimit: 20, dailyCostLimitUsd: 10, scheduleCron: null, allowedDomains: ['docs.oracle.com'], updatedAt: draft.createdAt };
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture-signature'].join('.');
const report = { evidence: 'Synthetic API fixtures only; not live-backend verification', checks: [], errors: [], unmatched: [], accessibility: [] };
const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
try {
  for (const [device, width, height] of [['desktop', 1440, 900], ['laptop', 1280, 800], ['mobile', 390, 844], ['narrow', 320, 740]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'kg_session', value: '1', url: base }]);
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', e => report.errors.push({ device, message: e.message }));
    let emptyDrafts = false;
    await page.route('**/api/v1/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/v1', '');
      const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const paged = (items, totalPages = 1) => ({ items, page: Number(url.searchParams.get('page') || 1), totalPages, totalElements: items.length, size: 20 });
      let data;
      if (path === '/auth/refresh') data = { accessToken: token, user };
      else if (path === '/users/me') data = user;
      else if (path === '/topics') data = topics;
      else if (path === '/modules') data = modules;
      else if (path === '/questions') data = paged([question], 10);
      else if (path === '/dashboard/radar') data = { modules: [{ moduleId: id(3), name: 'Java Core', masteryPct: 35 }] };
      else if (path === '/dashboard/heatmap') data = [{ date: '2026-10-03', count: 2 }];
      else if (path === '/users/me/progress') data = [{ moduleId: id(3), masteryPct: 35, totalAttempts: 2, streak: 2 }];
      else if (path === '/users/me/stats') data = stats;
      else if (path === '/dashboard/leaderboard') data = [{ rank: 1, userId: user.id, displayName: user.displayName, xp: 120 }];
      else if (path === '/users/me/bookmarks' || path === '/notes') data = [];
      else if (path === '/mock-interview/history' || path.endsWith('/learning')) data = paged([]);
      else if (path === '/mindmap') data = { nodes: modules.map(m => ({ ...m, masteryPct: 35 })), edges: [] };
      else if (path === '/admin/knowledge/drafts') data = paged(emptyDrafts ? [] : [draft], emptyDrafts ? 0 : 10);
      else if (path === '/admin/knowledge/goals') data = [goal];
      else if (path === '/admin/users') data = paged([{ ...user, blocked: false, emailVerified: true, xp: 120 }]);
      else if (path === '/blog/posts') data = [];
      else { report.unmatched.push({ device, path }); return route.fulfill({ status: 404, headers, json: { detail: 'Unmatched fixture' } }); }
      return route.fulfill({ headers, json: data });
    });
    const capture = async (name) => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${output}/${device}-${name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      report.checks.push({ device, name, overflow });
      if (!baseline) assert.equal(overflow, false, `${device} ${name} viewport overflow`);
      const a = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.accessibility.push({ device, name, violations: a.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) });
    };
    for (const route of ['learn', 'questions', 'dashboard', 'profile', 'notes', 'mock-interview', 'mindmap', 'admin/users', 'admin/learning', 'admin/knowledge', 'admin/knowledge/drafts']) {
      await page.goto(`${base}/${route}`);
      await page.locator('#main-content h1').waitFor();
      await page.waitForLoadState('networkidle');
      await capture(route.replaceAll('/', '-'));
    }
    const pagination = page.getByRole('navigation', { name: 'Phân trang', exact: true });
    if (!baseline) {
      assert.equal(await pagination.locator('ol button').count(), 5);
      await pagination.getByRole('button', { name: 'Trang 5', exact: true }).click();
      await page.waitForLoadState('networkidle');
      assert.equal(await pagination.locator('[aria-current="page"]').textContent(), '5');
      report.checks.push({ device, name: 'five pages and page selection' });
    }
    await page.getByRole('button', { name: /Vai trò của JVM trong ứng dụng Java/ }).click();
    await capture('draft-selected');
    if (!baseline) {
      assert.equal(await page.locator('.answer-html').count(), 1);
      assert.equal(await page.evaluate(() => !!window.__fixtureXss), false);
      const center = await pagination.boundingBox(), main = await page.locator('#main-content').boundingBox();
      assert.ok(Math.abs(center.x + center.width / 2 - main.x - main.width / 2) < 2, 'pagination centered across page');
    }
    emptyDrafts = true;
    await page.reload(); await page.getByText('Không có draft ở trạng thái này.', { exact: true }).waitFor();
    await capture('draft-empty');
    if (!baseline) {
      const b = await pagination.boundingBox();
      assert.ok(b.y + b.height >= height - (width < 640 ? 26 : 42), `${device} pagination at footer`);
      assert.equal(await pagination.locator('ol button').count(), 1);
    }
    if (!baseline) {
      await page.goto(base + '/admin/knowledge');
      await page.getByRole('button', { name: /Nền tảng JVM/ }).click();
      await capture('goal-selected');
      await page.getByRole('button', { name: 'Tạo mục tiêu', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).isDisabled(), true);
      await capture('goal-form');
      await page.getByRole('button', { name: 'Đóng form', exact: true }).click();
      await page.goto(base + '/admin/learning');
      await page.getByRole('button', { name: /Người học kiểm thử.*learner@example.test/ }).click();
      await page.getByLabel('Loại dữ liệu', { exact: true }).selectOption('SRS');
      await page.getByText('Chưa có dữ liệu học thuộc nhóm này.', { exact: true }).waitFor();
      await capture('learning-selected');
      await page.getByRole('button', { name: 'English', exact: true }).click();
      await page.goto(base + '/profile');
      await page.getByRole('heading', { name: 'Your profile', exact: true }).waitFor();
      await capture('profile-en');
      await page.goto(base + '/admin/knowledge/drafts');
      await page.getByText('No drafts with this status.', { exact: true }).waitFor();
      await capture('draft-empty-en');
      assert.equal(await page.locator('nav a[aria-current="page"]').count(), 1, 'one active navigation link');
      report.checks.push({ device, name: 'guided goal form, account picker, English UI and navigation' });
    }
    await context.close();
  }
  if (!baseline) {
    assert.equal(report.errors.length, 0, 'page exceptions');
    assert.equal(report.unmatched.length, 0, 'unmatched fixture requests');
    assert.equal(report.accessibility.flatMap(a => a.violations).length, 0, 'accessibility violations');
  }
} finally { await browser.close(); fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify(report, null, 2));
