/* Synthetic fixtures only. Geometry and touch emulation are not physical-iPhone or backend proof. */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://127.0.0.1:3216';
const output = '.impeccable/review/pagination-mobile';
fs.mkdirSync(output, { recursive: true });
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const user = { id: id(1), email: 'fixture@example.test', displayName: 'Test learner', role: 'ADMIN', authProvider: 'LOCAL', xp: 100, blocked: false, emailVerified: true };
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'synthetic'].join('.');
const topics = [{ id: id(2), slug: 'java', name: 'Java foundations', track: 'java', displayOrder: 1, description: 'Java fundamentals', moduleCount: 7 }, { id: id(3), slug: 'aws', name: 'AWS architecture', track: 'aws', displayOrder: 2, moduleCount: 1 }];
const modules = Array.from({ length: 8 }, (_, n) => ({ id: id(10 + n), name: `Module ${n + 1}`, slug: `module-${n + 1}`, description: 'Understand concepts and practise applying them.', topicId: topics[n < 7 ? 0 : 1].id, topicSlug: topics[n < 7 ? 0 : 1].slug, questionCount: 10, displayOrder: n }));
const question = { id: id(30), moduleId: modules[0].id, title: 'Explain JVM memory management', moduleSlug: 'module-1', difficulty: 'JUNIOR', tags: [], answerHtml: '<p>A synthetic answer.</p>', options: [] };
const post = { id: id(31), title: 'Test article', slug: 'test-article', body: '<p>Test content</p>', tags: [], status: 'REVIEW' };
const draft = { id: id(32), kind: 'QUESTION', title: 'Test draft', payloadJson: '{"answerHtml":"<p>Review this answer.</p>"}', sourceIds: [], status: 'REVIEW', model: 'test', tokensUsed: 1 };
const comment = { id: id(33), postTitle: 'Test article', content: 'Test comment', displayName: 'Test learner', status: 'VISIBLE' };
const record = { id: id(34), label: 'Learning record', status: 'FINISHED', score: 80, total: 10, nextReview: null, occurredAt: '2026-10-03T00:00:00Z' };
const history = { id: id(35), startedAt: '2026-10-03T00:00:00Z', finishedAt: '2026-10-03T01:00:00Z', strategy: 'RANDOM', total: 10, score: 80, questionCount: 10, status: 'FINISHED' };
const cases = [['questions', '/questions'], ['users', '/admin/users'], ['comments', '/admin/comments'], ['posts', '/admin/posts'], ['content', '/admin/content'], ['drafts', '/admin/knowledge/drafts'], ['learning-picker', '/admin/learning'], ['learning-records', `/admin/learning?userId=${user.id}`], ['quiz', `/quiz/${modules[0].id}`], ['interview', '/mock-interview']];
const report = { evidence: 'Chromium fixtures and synthesized touch; not Safari or a physical iPhone', checks: [], errors: [], unmatched: [], accessibility: [] };
const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
try {
  for (const [device, width, height] of [['desktop', 1440, 900], ['iphone13', 390, 844], ['iphone13-landscape', 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, ...(device !== 'desktop' ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}), reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'kg_session', value: '1', url: base }]);
    const page = await context.newPage(); page.setDefaultTimeout(45000);
    page.on('pageerror', e => report.errors.push(e.message));
    let empty = false;
    await page.route('**/api/v1/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/v1', '');
      const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const paged = item => ({ items: empty ? [] : [item], page: Number(url.searchParams.get('page') || 1), size: 10, totalPages: empty ? 0 : 10, totalElements: empty ? 0 : 100 });
      let data;
      if (path === '/auth/refresh') data = { accessToken: token, user };
      else if (path === '/users/me') data = user;
      else if (path === '/topics') data = topics;
      else if (path === '/modules') data = modules;
      else if (path === '/tracks') data = [{ slug: 'java', name: 'Java', displayOrder: 1 }, { slug: 'aws', name: 'AWS', displayOrder: 2 }];
      else if (path === '/questions' || path === '/admin/content/questions') data = paged(question);
      else if (path === '/admin/users') data = paged(user);
      else if (path === '/admin/blog/comments') data = paged(comment);
      else if (path === '/admin/blog/posts') data = paged(post);
      else if (path === '/admin/blog/writer/review') data = empty ? [] : Array.from({ length: 100 }, (_, n) => ({ ...post, id: id(100 + n), title: `Test article ${n + 1}` }));
      else if (path === '/admin/knowledge/drafts') data = paged(draft);
      else if (path.endsWith('/learning')) data = paged(record);
      else if (path === '/quiz/history' || path === '/mock-interview/history') data = paged(history);
      else { report.unmatched.push({ device, path }); return route.fulfill({ status: 404, headers, json: { detail: 'Unhandled fixture' } }); }
      return route.fulfill({ headers, json: data });
    });
    const capture = async name => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name} overflow`);
      await page.screenshot({ path: `${output}/${device}-${name}.png`, fullPage: true });
      const a = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.accessibility.push({ device, name, violations: a.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) });
    };
    for (const [name, path] of cases) {
      for (const state of ['populated', 'empty']) {
        empty = state === 'empty';
        await page.goto(base + path); await page.locator('#main-content h1').waitFor(); await page.waitForLoadState('networkidle');
        const nav = page.locator('.kg-pagination:visible');
        assert.equal(await nav.count(), 1, `${name}: one visible footer`);
        const metrics = await nav.evaluate(el => {
          const main = document.querySelector('#main-content'), a = el.getBoundingClientRect(), b = main.getBoundingClientRect();
          return { offset: Math.abs(a.x + a.width / 2 - b.x - b.width / 2), bottomGap: b.bottom - a.bottom };
        });
        assert.ok(metrics.offset <= 2, `${device} ${name} centered: ${metrics.offset}`);
        assert.ok(metrics.bottomGap <= 70, `${device} ${name} is last: ${metrics.bottomGap}`);
        assert.equal(await nav.locator('ol button').count(), empty ? 1 : 5, `${name} numeric window`);
        if (!empty) {
          await nav.getByRole('button', { name: 'Trang 5', exact: true }).click();
          await page.waitForLoadState('networkidle');
          assert.equal(await nav.locator('[aria-current="page"]').textContent(), '5');
        }
        report.checks.push({ device, name, state, ...metrics });
        if (name === 'quiz') {
          const controls = await page.locator('#main-content form').first().locator('input, select, button[type="submit"]').evaluateAll(elements => elements.map(el => { const b = el.getBoundingClientRect(); return { height: b.height, bottom: b.bottom }; }));
          assert.equal(controls.length, 4);
          assert.ok(controls.every(control => Math.abs(control.height - 44) < 1), 'quiz controls share 44px height');
          assert.ok(Math.abs(controls[3].bottom - controls[2].bottom) < 1 || width < 640, 'quiz action aligned with fields');
        }
        await capture(`${name}-${state}`);
      }
    }
    empty = false;
    await page.goto(base + '/learn'); await page.locator('[data-module-card]').first().waitFor();
    const track = page.getByRole('group', { name: 'Loại nội dung', exact: true });
    const topic = page.locator('[role="group"][aria-labelledby="learn-topic-title"]');
    assert.equal(await track.count(), 1); assert.equal(await topic.count(), 1);
    if (device !== 'desktop') await track.getByRole('button', { name: 'Java', exact: true }).tap();
    else await track.getByRole('button', { name: 'Java', exact: true }).click();
    assert.equal(await page.locator('[data-module-card]').count(), 3);
    await page.getByRole('button', { name: /Xem thêm/ }).click();
    const verifyLocal = async n => {
      const card = page.locator(`[data-module-card="${modules[n].id}"]`), button = card.locator('button').first();
      if (device !== 'desktop') await button.tap(); else await button.click();
      if (width < 1280) {
        const panel = card.getByRole('group', { name: 'Bạn chọn cách học', exact: true });
        assert.equal(await panel.isVisible(), true);
        assert.equal(await panel.getByRole('link').count(), 3);
        assert.equal(await panel.getByRole('link', { name: 'Ôn flashcard', exact: true }).getAttribute('href'), `/flashcard/${modules[n].id}`);
        const a = await button.boundingBox(), b = await panel.boundingBox();
        assert.ok(Math.abs(b.y - a.y - a.height) <= 2, 'study options attached to clicked card');
        assert.equal(await page.getByRole('group', { name: 'Bạn chọn cách học', exact: true }).count(), 1);
      } else assert.equal(await page.locator('#practice-options').isVisible(), true);
      report.checks.push({ device, name: `local study options module ${n + 1}` });
    };
    await verifyLocal(0); await verifyLocal(3); await verifyLocal(6);
    await capture('learn-grouped-local');
    await topic.getByRole('button', { name: 'Java foundations', exact: true }).click();
    await verifyLocal(3); await capture('learn-topic-local');
    await page.getByLabel('Tìm chủ đề hoặc module').fill('Module 2');
    await verifyLocal(1); await capture('learn-search-local');
    await context.close();
  }
  assert.equal(report.errors.length, 0, 'page errors');
  assert.equal(report.unmatched.length, 0, 'unmatched requests');
  assert.equal(report.accessibility.flatMap(a => a.violations).length, 0, 'Axe violations');
} finally { await browser.close(); fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ checks: report.checks.length, captures: report.accessibility.length, errors: report.errors, unmatched: report.unmatched, axeViolations: report.accessibility.flatMap(a => a.violations).length }, null, 2));
