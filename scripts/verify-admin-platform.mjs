/* Synthetic UI fixtures only: every API request and write is intercepted. */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://localhost:3211';
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const report = { evidence: 'Synthetic browser/API fixtures, not live-backend integration', checks: [], accessibility: [], errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
const output = '.impeccable/review/admin-platform'; fs.mkdirSync(output, { recursive: true });
try {
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 375, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', err => report.errors.push(err.message));
    const user = { id: id(1), email: 'learner@example.test', displayName: 'Fixture Learner', role: 'USER', blocked: false, emailVerified: true, authProvider: 'LOCAL', xp: 10, createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z' };
    const comment = { id: id(2), userId: user.id, displayName: user.displayName, postId: id(3), postTitle: 'Fixture article', parentId: null, content: 'A synthetic comment for moderation.', status: 'VISIBLE', createdAt: user.createdAt };
    const post = { id: id(3), title: 'Fixture blog', slug: 'fixture-blog', body: '<p>Fixture authored article.</p>', excerpt: 'Fixture', status: 'REVIEW', tags: [], createdAt: user.createdAt };
    const writes = [];
    await page.route('**/api/v1/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/v1', ''), method = req.method();
      const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const body = req.postData() ? req.postDataJSON() : null;
      const result = data => route.fulfill({ headers, json: data });
      const paged = items => ({ items, page: 1, size: 20, totalElements: items.length, totalPages: 1 });
      if (method !== 'GET') writes.push({ path, method, body });
      if (path === '/auth/login' || path === '/auth/refresh') return result({ accessToken: 'fixture-token', user: { id: id(9000), email: 'owner@example.test', displayName: 'Fixture Owner', role: 'ADMIN' } });
      if (path === '/topics' || path === '/modules') return result([]);
      if (path === '/admin/users') return result(paged([{ ...user }]));
      if (path.endsWith('/role')) { user.role = body.role; return result({ ...user }); }
      if (path.endsWith('/status') && path.startsWith('/admin/users/')) { user.blocked = body.blocked; return result({ ...user }); }
      if (path.endsWith('/revoke-sessions')) return route.fulfill({ status: 204, headers });
      if (path === '/admin/blog/writer/review') return result(post.status === 'REVIEW' ? [{ ...post }] : []);
      if (path === '/admin/blog/posts') return result(paged([{ ...post }]));
      if (path === `/admin/blog/writer/posts/${post.id}`) return result({ ...post });
      if (path === `/admin/blog/posts/${post.id}/status`) {
        post.status = { HIDE: 'HIDDEN', ARCHIVE: 'ARCHIVED', DELETE: 'DELETED', RESTORE: 'REVIEW' }[body.action];
        return result({ id: post.id, status: post.status });
      }
      if (path === '/admin/blog/comments') return result(paged([{ ...comment }]));
      if (path.startsWith('/admin/blog/comments/')) {
        comment.status = path.endsWith('/restore') ? 'HIDDEN' : method === 'DELETE' ? 'DELETED' : body.status;
        return result({ ...comment });
      }
      if (path.endsWith('/learning')) return result(paged([{ id: id(4), label: 'Fixture question', status: 'ENROLLED', score: null, total: 5, nextReview: '2026-10-04', occurredAt: user.createdAt }]));
      if (path.endsWith('/reset')) return route.fulfill({ status: 204, headers });
      throw new Error(`Unmatched API fixture ${method} ${path}`);
    });
    const check = (name, value = true) => { assert.ok(value, name); report.checks.push({ device, name }); };
    const capture = async name => {
      check(`${name}: no viewport overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/${device}-${name}.png`, fullPage: true });
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.accessibility.push({ device, name, violations: axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
    };
    await page.goto(`${base}/login`);
    await page.getByLabel('Email', { exact: true }).fill('owner@example.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Vào phòng tập', exact: true }).click();
    await page.waitForURL('**/learn');
    await page.goto(`${base}/admin/users`);
    await page.getByRole('button', { name: /Fixture Learner.*learner@example.test/ }).click();
    check('mutation disabled without reason', await page.getByRole('button', { name: 'Khóa tài khoản', exact: true }).isDisabled());
    await page.getByLabel('Lý do thay đổi', { exact: true }).fill('Fixture support action');
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click();
    await page.getByRole('button', { name: 'Mở khóa', exact: true }).waitFor();
    check('block uses real API contract', writes.some(w => w.path.endsWith('/status') && w.body.blocked === true));
    await capture('users');
    await page.goto(`${base}/admin/comments`);
    await page.getByRole('button', { name: /Fixture article/ }).click();
    await page.getByLabel('Lý do xử lý', { exact: true }).fill('Fixture spam review');
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Xóa mềm', exact: true }).click();
    await page.getByRole('button', { name: 'Khôi phục về trạng thái ẩn', exact: true }).waitFor();
    await page.getByLabel('Lý do xử lý', { exact: true }).fill('Fixture appeal');
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Khôi phục về trạng thái ẩn', exact: true }).click();
    await page.getByRole('button', { name: 'Cho hiển thị', exact: true }).waitFor();
    check('restore is hidden, not public', comment.status === 'HIDDEN');
    await capture('comments');
    await page.goto(`${base}/admin/learning?userId=${user.id}`);
    await page.getByLabel('Loại dữ liệu', { exact: true }).selectOption('SRS');
    await page.getByRole('button', { name: 'Đặt lại lịch ôn', exact: true }).click();
    await page.getByLabel('Lý do đặt lại', { exact: true }).fill('Fixture schedule support');
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Xác nhận đặt lại lịch', exact: true }).click();
    await page.getByText('Đã đặt lại lịch ôn và ghi audit.', { exact: true }).waitFor();
    check('reset targets selected user and card', writes.some(w => w.path === `/admin/users/${user.id}/learning/srs/${id(4)}/reset`));
    await capture('learning');
    await page.goto(`${base}/admin/posts`);
    await page.getByRole('button', { name: /Fixture blog/ }).click();
    await page.getByLabel('Lý do thay đổi trạng thái', { exact: true }).fill('Fixture deletion');
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Xóa mềm', exact: true }).click();
    await page.getByRole('button', { name: 'Khôi phục về REVIEW', exact: true }).waitFor();
    check('deleted article cannot be edited', await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).isDisabled());
    await page.getByLabel('Lý do thay đổi trạng thái', { exact: true }).fill('Fixture restoration');
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Khôi phục về REVIEW', exact: true }).click();
    await page.getByRole('button', { name: 'Ẩn bài', exact: true }).waitFor();
    check('article restoration requires explicit publication', post.status === 'REVIEW');
    await capture('posts');
    await context.close();
  }
  assert.equal(report.errors.length, 0, 'browser exceptions');
  assert.equal(report.accessibility.flatMap(r => r.violations).length, 0, 'accessibility violations');
} finally {
  await browser.close(); fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
