/* Synthetic browser fixtures only. All API traffic, including every write, is intercepted.
 * NODE_PATH must provide playwright and @axe-core/playwright; no production mocks are shipped.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://localhost:3210';
const v2 = process.env.KG_ADMIN_V2 === '1';
const output = path.resolve('.impeccable/review/admin');
fs.mkdirSync(output, { recursive: true });
const report = { notice: 'Intercepted synthetic API fixtures, NOT live backend integration. Every API write is mocked.', v2, checks: [], screenshots: [], accessibility: [], errors: [], unmatched: [] };
const uid = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const topics = [{ id: uid(10), slug: 'java', name: 'Java (fixture)', description: 'Synthetic study catalog', displayOrder: 1, moduleCount: 1 }];
const modules = [{ id: uid(20), topicId: uid(10), topicSlug: 'java', slug: 'java-core', name: 'Java Core (fixture)', description: 'Collections and runtime', displayOrder: 1, questionCount: 1000 }];
const answer = '<h2>Collections</h2><p>Keep a stable key contract.</p><pre><code class="language-java">Map&lt;String, Integer&gt; values = new HashMap&lt;&gt;();\nvalues.put("answer", 42);</code></pre><div class="flow-diagram"><div class="flow-row"><div class="flow-node primary">Request</div><span class="flow-arrow">→</span><div class="flow-node">Service</div><span class="flow-arrow">→</span><div class="flow-node success">Response</div></div></div><script>window.__fixtureXss = true</script>';
const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
try {
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 375, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.errors.push({ device, message: error.message }));
    let role = 'ADMIN', failSave = false, jobPolls = 0;
    const writes = [], overrides = new Map();
    const topicItems = topics.map(item => ({ ...item })), moduleItems = modules.map(item => ({ ...item }));
    let post = { id: uid(5000), title: 'Fixture: Transactions', slug: 'fixture-transactions', body: answer, status: 'REVIEW', tags: ['database'], moduleId: uid(20), questionId: null, excerpt: 'Synthetic draft', createdAt: '2026-10-03T08:00:00Z' };
    const question = (id = uid(1)) => overrides.get(id) ?? { id, moduleId: uid(20), moduleSlug: 'java-core', title: `Fixture: question ${Number(id.slice(-12))}`, answerHtml: answer, difficulty: 'MID', tags: ['java'], sortOrder: 1, options: [{ id: uid(2001), content: 'Stable key contract', isCorrect: true, displayOrder: 1 }, { id: uid(2002), content: 'Every key is mutable', isCorrect: false, displayOrder: 2 }] };
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.replace('/api/v1', ''), method = request.method();
      const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const body = request.postData() ? request.postDataJSON() : null;
      if (method !== 'GET') writes.push({ endpoint, method, body });
      if (endpoint.startsWith('/admin/') && role !== 'ADMIN') return route.fulfill({ status: 403, headers, json: { detail: 'Fixture forbidden' } });
      let data;
      if (endpoint === '/auth/login' || endpoint === '/auth/refresh') data = { accessToken: 'fixture-only-token', expiresIn: 3600, user: { id: uid(9000), email: 'fixture@example.test', displayName: 'Fixture Admin', role } };
      else if (endpoint === '/topics') data = topicItems;
      else if (endpoint === '/modules') data = moduleItems;
      else if (/^\/admin\/content\/(topics|modules)(\/[^/]+)?$/.test(endpoint)) {
        const group = endpoint.split('/')[3], items = group === 'topics' ? topicItems : moduleItems;
        const id = method === 'POST' ? uid(group === 'topics' ? 30 : 40) : endpoint.split('/').at(-1);
        if (method === 'DELETE') items.splice(items.findIndex(item => item.id === id), 1);
        else {
          data = { id, ...body, ...(group === 'topics' ? { moduleCount: 0 } : { topicSlug: 'java', questionCount: 0 }) };
          const index = items.findIndex(item => item.id === id); if (index < 0) items.push(data); else items[index] = data;
        }
        topicItems.forEach(topic => { topic.moduleCount = moduleItems.filter(module => module.topicId === topic.id).length; });
        if (method === 'DELETE') return route.fulfill({ status: 204, headers });
      }
      else if ((endpoint === '/questions' || endpoint === '/admin/content/questions') && method === 'GET') {
        const p = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('size') || 20);
        data = { items: Array.from({ length: size }, (_, index) => question(uid((p - 1) * size + index + 1))), page: p, size, totalElements: 1000, totalPages: Math.ceil(1000 / size) };
      } else if ((endpoint.startsWith('/questions/') || /^\/admin\/content\/questions\/[^/]+$/.test(endpoint)) && method === 'GET') {
        data = question(endpoint.split('/').at(-1));
        if (endpoint.startsWith('/questions/')) data = { ...data, options: data.options.map(({ id, content, displayOrder }) => ({ id, content, displayOrder })) };
      } else if (endpoint === '/admin/content/questions' && method === 'POST' || /^\/admin\/content\/questions\/[^/]+$/.test(endpoint) && method === 'PATCH') {
        if (failSave) return route.fulfill({ status: 409, headers, json: { detail: 'Fixture conflict: retry with your input kept' } });
        const id = method === 'POST' ? uid(1100) : endpoint.split('/').at(-1); data = { ...question(id), ...body }; overrides.set(id, data);
      } else if (/\/questions\/[^/]+\/options$/.test(endpoint) && method === 'PUT') {
        data = body.options.map((option, index) => ({ ...option, id: option.id || uid(2200 + index) }));
        const id = endpoint.split('/').at(-2); overrides.set(id, { ...question(id), options: data });
      }
      else if (/\/admin\/content\/questions\/[^/]+\/status$/.test(endpoint) && method === 'PATCH') {
        const id = endpoint.split('/').at(-2); const saved = { ...question(id), contentStatus: body.status };
        overrides.set(id, saved); data = { ...saved, options: [] };
      }
      else if (endpoint === '/admin/content/parse') data = { jobId: uid(6000), status: 'QUEUED' };
      else if (endpoint.startsWith('/admin/content/jobs/')) data = { jobId: uid(6000), status: ++jobPolls > 0 ? 'SUCCEEDED' : 'RUNNING', result: { questions: 1000, modules: 1 }, finishedAt: '2026-10-03T08:00:00Z' };
      else if (endpoint === '/admin/content/questions/generate-options') data = { questions: 1000, eligible: 1000, options: 4000 };
      else if (endpoint === '/admin/blog/writer/review') data = post.status === 'REVIEW' ? [post] : [];
      else if (endpoint === '/admin/blog/posts' && method === 'GET') data = { items: [post], page: 1, size: 10, totalElements: 1, totalPages: 1 };
      else if (endpoint === '/admin/blog/posts' && method === 'POST') { post = { ...post, ...body, id: uid(5001), status: 'DRAFT' }; data = { id: post.id, title: post.title, slug: post.slug, status: post.status }; }
      else if (/\/admin\/blog\/writer\/posts\/[^/]+$/.test(endpoint)) { if (method === 'PUT') post = { ...post, ...body, status: 'REVIEW' }; data = post; }
      else if (endpoint.endsWith('/publish')) { post.status = 'PUBLISHED'; return route.fulfill({ status: 204, headers }); }
      else if (endpoint === '/admin/blog/collect') data = { collected: 2 };
      else if (endpoint === '/quiz/history' || endpoint === '/mock-interview/history') data = { items: [], page: Number(url.searchParams.get('page') || 1), size: 10, totalElements: 1000, totalPages: 100 };
      else if (endpoint === '/srs/enroll') data = { enrolled: 0 };
      else if (endpoint === '/srs/due') data = [{ cardId: uid(7000), questionId: uid(1), title: 'Fixture: long answer', answerHtml: answer, difficulty: 'MID', moduleSlug: 'java-core' }];
      else if (endpoint.startsWith('/srs/review/')) data = { intervalDays: 1, nextReview: '2026-10-04' };
      else { report.unmatched.push({ device, endpoint, method }); return route.fulfill({ status: 501, headers, json: { detail: 'Unmatched synthetic fixture' } }); }
      return route.fulfill({ headers, json: data });
    });
    const check = (name, value = true) => { assert.ok(value, name); report.checks.push({ device, name, passed: true }); };
    const capture = async name => {
      await page.screenshot({ path: path.join(output, `${v2 ? 'v2' : 'legacy'}-${device}-${name}.png`), fullPage: true });
      report.screenshots.push({ device, name });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      check(`${name}: no horizontal page overflow`, !overflow);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.accessibility.push({ device, name, violations: axe.violations.map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.map(n => n.target) })) });
    };
    async function login() {
      await page.goto(`${base}/login`);
      await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
      await page.getByLabel('Mật khẩu', { exact: true }).fill('fixture-password');
      await page.getByRole('button', { name: 'Vào phòng tập', exact: true }).click();
      await page.waitForURL('**/learn');
    }
    await login();
    await page.goto(`${base}/admin/content`);
    await page.getByRole('heading', { name: 'Câu hỏi mới', exact: true }).waitFor();
    await capture('content');
    const editor = page.getByRole('region', { name: 'Vùng biên tập câu hỏi' });
    await editor.getByLabel('Câu hỏi', { exact: true }).fill('Fixture: author input');
    await editor.getByLabel('Mã HTML', { exact: true }).fill('<p>Fixture authored answer</p><script>window.__fixtureXss=true</script>');
    check('preview sanitizes executable markup', !(await page.evaluate(() => window.__fixtureXss)));
    await page.getByRole('button', { name: 'Chèn code', exact: true }).click();
    await page.getByLabel('Đoạn code', { exact: true }).fill('class Demo { int count = 42; }');
    await page.getByRole('button', { name: 'Chèn vào nội dung', exact: true }).click();
    await page.locator('.hljs-keyword').first().waitFor(); check('code is highlighted');
    await page.getByRole('button', { name: 'Chủ đề & module', exact: true }).click();
    await page.getByLabel('Tên', { exact: true }).fill('Fixture catalog draft');
    check('catalog mutation is gated until backend rollout', await page.getByRole('button', { name: 'Lưu dữ liệu', exact: true }).isDisabled() === !v2);
    await capture('catalog');
    if (v2) {
      await page.getByLabel('Slug', { exact: true }).fill('fixture-topic');
      await page.getByRole('button', { name: 'Lưu dữ liệu', exact: true }).click();
      await page.getByText('Đã lưu danh mục.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Lưu dữ liệu', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('fieldset[disabled]'));
      check('topic create becomes PATCH, not duplicate POST', writes.filter(x => x.endpoint === '/admin/content/topics' && x.method === 'POST').length === 1 && writes.some(x => x.endpoint === `/admin/content/topics/${uid(30)}` && x.method === 'PATCH'));
      await page.getByRole('button', { name: 'Xóa', exact: true }).click();
      await page.getByLabel(/Nhập tên để xác nhận/).fill('Fixture catalog draft');
      await page.getByRole('button', { name: 'Xóa vĩnh viễn', exact: true }).click();
      await page.getByText('Đã xóa danh mục rỗng.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Module mới', exact: true }).click();
      await page.getByLabel('Tên', { exact: true }).fill('Fixture new module');
      await page.getByLabel('Slug', { exact: true }).fill('fixture-module');
      await page.getByRole('button', { name: 'Lưu dữ liệu', exact: true }).click();
      await page.getByText('Đã lưu danh mục.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Xóa', exact: true }).click();
      await page.getByLabel(/Nhập tên để xác nhận/).fill('Fixture new module');
      await page.getByRole('button', { name: 'Xóa vĩnh viễn', exact: true }).click();
      await page.getByText('Đã xóa danh mục rỗng.', { exact: true }).waitFor();
      check('empty topic/module deletion uses planned contracts', writes.some(x => x.endpoint === `/admin/content/topics/${uid(30)}` && x.method === 'DELETE') && writes.some(x => x.endpoint === `/admin/content/modules/${uid(40)}` && x.method === 'DELETE'));
    }
    await page.getByRole('button', { name: 'Câu hỏi & đáp án', exact: true }).click();
    check('switching workspace sections keeps question draft', await editor.getByLabel('Câu hỏi', { exact: true }).inputValue() === 'Fixture: author input');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', { name: 'Biên tập bài viết', exact: true }).first().click();
    check('unsaved navigation cancellation keeps workspace', page.url().endsWith('/admin/content'));
    failSave = true;
    await editor.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Fixture conflict' }).waitFor();
    check('failed save retains input', await editor.getByLabel('Câu hỏi', { exact: true }).inputValue() === 'Fixture: author input');
    failSave = false;
    await editor.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click();
    await page.getByText('Đã lưu câu hỏi. Nội dung hiển thị là bản backend đã làm sạch.').waitFor();
    check('question writes use real existing contract', writes.some(x => x.endpoint === '/admin/content/questions' && x.method === 'POST' && x.body.title === 'Fixture: author input'));
    if (v2) {
      await page.getByLabel('Nội dung lựa chọn 2', { exact: true }).fill('Fixture edited choice');
      await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).click();
      await page.getByText('Đã lưu bộ lựa chọn.').waitFor(); check('planned option contract works against synthetic backend');
      await page.getByLabel('Nội dung lựa chọn 2', { exact: true }).fill('Fixture pending choice');
      await editor.getByLabel('Câu hỏi', { exact: true }).fill('Fixture: follow-up edit');
      await editor.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click();
      await page.getByText('Đã lưu câu hỏi. Nội dung hiển thị là bản backend đã làm sạch.').waitFor();
      check('question save preserves unsaved manual choice edits', await page.getByLabel('Nội dung lựa chọn 2', { exact: true }).inputValue() === 'Fixture pending choice');
      await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).click();
      await page.getByText('Đã lưu bộ lựa chọn.').waitFor();
    }
    if (v2) {
      overrides.set(uid(1150), { ...question(uid(1150)), contentStatus: 'DRAFT' });
      await page.goto(`${base}/admin/content?questionId=${uid(1150)}`);
      await page.getByRole('heading', { name: 'Trạng thái xuất bản: DRAFT', exact: true }).waitFor();
      check('AI materialization deep link opens its nonpublic question', await page.getByLabel('Câu hỏi', { exact: true }).inputValue() === 'Fixture: question 1150');
      check('draft does not link to an unavailable public detail', await page.getByRole('link', { name: 'Mở trang người học', exact: true }).count() === 0);
      check('publish requires an explicit reason', await page.getByRole('button', { name: 'Xuất bản cho người học', exact: true }).isDisabled());
      await page.getByLabel('Lý do thay đổi trạng thái', { exact: true }).fill('Fixture review complete');
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Xuất bản cho người học', exact: true }).click();
      await page.getByRole('heading', { name: 'Trạng thái xuất bản: PUBLISHED', exact: true }).waitFor();
      check('status mutation keeps existing answer choices', await page.getByLabel('Nội dung lựa chọn 2', { exact: true }).inputValue() === 'Every key is mutable');
      check('published question exposes learner link', await page.getByRole('link', { name: 'Mở trang người học', exact: true }).isVisible());
      await page.getByLabel('Lý do thay đổi trạng thái', { exact: true }).fill('Fixture withdraw');
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Ẩn, giữ lịch sử', exact: true }).click();
      await page.getByRole('heading', { name: 'Trạng thái xuất bản: HIDDEN', exact: true }).waitFor();
      check('withdraw uses status endpoint rather than hard deletion', writes.some(x => x.endpoint === `/admin/content/questions/${uid(1150)}/status` && x.body.status === 'HIDDEN') && !writes.some(x => x.method === 'DELETE' && x.endpoint === `/admin/content/questions/${uid(1150)}`));
    }
    await capture('saved-question');
    await page.getByRole('button', { name: 'Import & tác vụ', exact: true }).click();
    await page.getByLabel('Tôi đã kiểm tra nguồn nhập và đồng ý cập nhật dữ liệu thư viện.', { exact: true }).check();
    await page.getByRole('button', { name: 'Bắt đầu import', exact: true }).click();
    await page.getByText('SUCCEEDED', { exact: true }).waitFor(); check('import polls to terminal backend state');
    await capture('import');
    if (!v2) page.once('dialog', dialog => dialog.accept());
    await page.goto(`${base}/admin/posts`);
    await page.getByRole('heading', { name: 'Bài viết mới', exact: true }).waitFor();
    await page.getByLabel('Tiêu đề bài viết', { exact: true }).fill('Fixture: manually authored blog');
    await page.getByLabel('Mã HTML', { exact: true }).fill(answer);
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
    await page.getByText('Đã lưu bản nháp. Chưa xuất bản cho người học.').waitFor();
    check('manual draft does not depend on AI worker', writes.some(x => x.endpoint === '/admin/blog/posts' && x.method === 'POST'));
    await capture('posts');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    await page.getByText('Đã xuất bản bài viết.', { exact: true }).waitFor(); check('publishes via existing admin blog alias');
    await page.goto(`${base}/questions`);
    await page.getByRole('button', { name: 'Trang 5', exact: true }).waitFor();
    await page.getByLabel('Đến trang', { exact: true }).fill('48');
    await page.getByRole('button', { name: 'Đi', exact: true }).click();
    await page.getByRole('button', { name: 'Trang 48', exact: true }).waitFor();
    check('far page jump exposes five consecutive numbers', (await page.locator('nav[aria-label="Phân trang"] ol button').allTextContents()).join(',') === '46,47,48,49,50');
    await capture('pagination');
    await page.goto(`${base}/questions/${uid(1)}`);
    await page.locator('.hljs-keyword').first().waitFor();
    await page.locator('.answer-html pre').first().focus();
    check('code scrolling is keyboard accessible', await page.locator('.answer-html pre').first().evaluate(node => document.activeElement === node && node.tabIndex === 0));
    await capture('reading');
    await page.goto(`${base}/flashcard/${uid(20)}`);
    await page.getByRole('button', { name: 'Lật xem đáp án', exact: true }).click();
    await page.locator('.kg-code-toolbar button').first().waitFor();
    await page.locator('.kg-code-toolbar button').first().click();
    check('copying flashcard code does not flip the answer', await page.getByRole('button', { name: 'Lật về mặt câu hỏi', exact: true }).isVisible());
    await capture('flashcard');
    await page.goto(`${base}/admin/content`);
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('heading', { name: 'Content library', exact: true }).waitFor();
    await capture('content-en');
    await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
    role = 'USER'; await login(); await page.goto(`${base}/admin/content`);
    await page.getByRole('heading', { name: 'Cần quyền quản trị', exact: true }).waitFor();
    check('ordinary user cannot mount authoring controls', await page.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).count() === 0);
    await capture('permission');
    await context.close();
  }
  assert.equal(report.errors.length, 0, 'browser exceptions');
  assert.equal(report.unmatched.length, 0, 'unmatched fixture API calls');
  assert.equal(report.accessibility.reduce((sum, item) => sum + item.violations.length, 0), 0, 'accessibility violations');
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, `${v2 ? 'v2' : 'legacy'}-report.json`), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ checks: report.checks.length, screenshots: report.screenshots.length, errors: report.errors.length, unmatched: report.unmatched.length, accessibilityViolations: report.accessibility.reduce((sum, item) => sum + item.violations.length, 0) }, null, 2));
