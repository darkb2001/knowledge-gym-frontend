/* Browser verification uses intercepted synthetic API fixtures, not a deployed backend.
 * Real static MP3 decoding and browser MediaRecorder (fake microphone) are exercised.
 * NODE_PATH supplies playwright and @axe-core/playwright.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://127.0.0.1:3214';
const output = path.resolve('.impeccable/review/english');
fs.mkdirSync(output, { recursive: true });
const report = { evidence: 'Synthetic intercepted API fixtures; real local MP3 decoding and fake-microphone MediaRecorder. NOT live API, production, Safari or real microphone acceptance.', checks: [], screenshots: [], accessibility: [], errors: [], unmatched: [] };
const item = (id, stem, answer) => ({ id, stem, options: ['First option', 'Second option', 'Third option', 'Fourth option'], answer });
const catalog = [
  { id: 'listening-announcement-v1', skill: 'LISTENING', title: 'A change of plans', focus: 'Part 1 · Announcement', minutes: 5, audioPath: '/english/audio/announcement-v1.mp3', items: [item('q1', 'Why is the library closing early?', 1), item('q2', 'What must students bring?', 2), item('q3', 'When can books be returned?', 0)] },
  { id: 'listening-dialogue-v1', skill: 'LISTENING', title: 'Planning a community event', focus: 'Part 2 · Conversation', minutes: 7, audioPath: '/english/audio/dialogue-v1.mp3' },
  { id: 'listening-talk-v1', skill: 'LISTENING', title: 'Why small habits last', focus: 'Part 3 · Short talk', minutes: 8, audioPath: '/english/audio/talk-v1.mp3' },
  { id: 'reading-community-v1', skill: 'READING', title: 'The library beyond books', focus: 'Mini passage · Main idea & inference', minutes: 12, passage: 'This is an original synthetic browser fixture. The library meets local needs.\n\nA trial helps evaluate new activities before making a permanent decision.', items: [item('q1', 'What is the main idea?', 1)] },
  { id: 'writing-email-v1', skill: 'WRITING', title: 'An invitation with a purpose', focus: 'Task 1 · Letter / email', minutes: 20, minimumWords: 120 },
  { id: 'writing-essay-v1', skill: 'WRITING', title: 'Learning wherever you are', focus: 'Task 2 · Essay', minutes: 40, minimumWords: 250 },
  ...['interaction', 'solutions', 'development'].map((part, i) => ({ id: `speaking-${part}-v1`, skill: 'SPEAKING', title: ['Your everyday world', 'Make a choice, make a case', 'A greener daily life'][i], focus: `Part ${i + 1} · Speaking`, minutes: i + 3 })),
].map(e => ({ minimumWords: 0, prompt: 'Original mini-practice for browser verification. Complete the task and review your response.', passage: '', audioPath: '', items: [], checklist: ['Develop a clear answer.', 'Support ideas with examples.'], ...e }));
const browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
try {
  const anonymous = await browser.newContext();
  const guest = await anonymous.newPage();
  await guest.goto(`${base}/english`);
  assert.match(new URL(guest.url()).pathname, /login/);
  report.checks.push({ name: 'Anonymous room redirects to login', passed: true });
  await anonymous.close();
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['landscape', 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', permissions: ['microphone'], acceptDownloads: true });
    await context.addCookies([{ name: 'kg_session', value: '1', url: base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => report.errors.push({ device, message: e.message }));
    page.on('dialog', dialog => dialog.accept());
    const attempts = new Map(); const writes = [];
    let next = 1, failSave = false, holdRead = false, releaseRead;
    const user = { id: '11111111-1111-4111-8111-000000009000', email: 'fixture@example.test', displayName: 'English learner', role: 'USER' };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url')}.fixture`;
    const check = (name, value = true) => { assert.ok(value, name); report.checks.push({ device, name, passed: true }); };
    await page.route('**/api/v1/**', async route => {
      const request = route.request(); const url = new URL(request.url()); const endpoint = url.pathname.replace('/api/v1', ''); const method = request.method();
      const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const body = request.postData() ? request.postDataJSON() : null;
      if (method !== 'GET') writes.push({ endpoint, method, body });
      let data;
      if (endpoint === '/auth/refresh') data = { accessToken: token, expiresIn: 3600, user };
      else if (endpoint === '/users/me') data = user;
      else if (endpoint === '/english/exercises') data = catalog.map(e => ({ ...e, items: e.items.map(q => ({ id: q.id, stem: q.stem, options: q.options })) }));
      else if (endpoint === '/english/attempts' && method === 'POST') {
        data = [...attempts.values()].find(a => a.exerciseId === body.exerciseId && a.status === 'DRAFT');
        if (!data) { const id = `11111111-1111-4111-8111-${String(next++).padStart(12,'0')}`; data = { id, exerciseId: body.exerciseId, status: 'DRAFT', version: 0, answers: {}, response: '', elapsedSeconds: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), feedback: null }; attempts.set(id, data); }
      } else if (endpoint === '/english/attempts' && method === 'GET') {
        const p = Number(url.searchParams.get('page') || 1), size = 10;
        const items = [...attempts.values()].reverse(); data = { items: items.slice((p - 1)*size, p*size), page: p, size, totalElements: items.length };
      } else if (endpoint.startsWith('/english/attempts/')) {
        const id = endpoint.split('/').at(-1); data = attempts.get(id);
        if (!data) return route.fulfill({ status: 404, headers, json: { detail: 'Attempt not found' } });
        if (method === 'GET' && holdRead) { holdRead = false; await new Promise(resolve => { releaseRead = resolve; }); }
        if (method === 'PUT') {
          if (failSave) { failSave = false; return route.fulfill({ status: 500, headers, json: { detail: 'Synthetic save failure' } }); }
          if (body.version !== data.version || data.status !== 'DRAFT') return route.fulfill({ status: 409, headers, json: { detail: 'Synthetic version conflict' } });
          const e = catalog.find(e => e.id === data.exerciseId);
          const feedback = body.submit ? { correct: e.items.length ? e.items.filter(q => body.answers[q.id] === q.answer).length : null, total: e.items.length, transcript: e.skill === 'LISTENING' ? 'Original fixture transcript revealed only after submission.' : '', items: e.items.map(q => ({ id: q.id, correctIndex: q.answer, explanation: 'Original fixture explanation.' })) } : null;
          data = { ...data, ...body, status: body.submit ? 'SUBMITTED' : 'DRAFT', version: data.version + 1, feedback, updatedAt: new Date().toISOString() }; attempts.set(id, data);
        }
      } else { report.unmatched.push({ device, endpoint, method }); return route.fulfill({ status: 501, headers, json: { detail: 'Unmatched fixture' } }); }
      return route.fulfill({ headers, json: data });
    });
    async function capture(name) {
      await page.evaluate(async () => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await page.screenshot({ path: path.join(output, `${device}-${name}.png`), fullPage: true });
      report.screenshots.push(`${device}-${name}.png`);
      check(`${name}: no horizontal overflow`, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      report.accessibility.push({ device, name, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
    }
    await page.goto(`${base}/english?attempt=11111111-1111-4111-8111-000000999999`);
    await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
    await page.getByRole('button', { name: 'Mở bài A change of plans', exact: true }).waitFor();
    check('Retry clears unavailable attempt deep link', !new URL(page.url()).searchParams.has('attempt'));
    await page.getByRole('button', { name: 'Mở bài A change of plans', exact: true }).waitFor();
    await capture('room');
    await page.getByRole('button', { name: 'Mở bài A change of plans', exact: true }).click();
    await page.getByRole('heading', { name: 'A change of plans' }).waitFor();
    check('Transcript hidden before submission', await page.getByText('Mở transcript', { exact: true }).count() === 0);
    await page.getByLabel('Audio bài nghe', { exact: true }).evaluate(async el => { await el.play(); el.pause(); });
    check('Real MP3 decodes with positive duration', await page.getByLabel('Audio bài nghe', { exact: true }).evaluate(el => Number.isFinite(el.duration) && el.duration > 0));
    for (const [i, choice] of [[0,1],[1,2],[2,0]]) await page.locator('fieldset').nth(i).getByRole('radio').nth(choice).check();
    await page.getByRole('button', { name: 'Nộp bài luyện', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận nộp', exact: true }).click();
    await page.getByText('3/3 câu đúng · Không phải điểm VSTEP', { exact: true }).waitFor();
    check('Submitted choices become read-only', await page.getByRole('radio').first().isDisabled());
    await page.getByText('Mở transcript', { exact: true }).click();
    await capture('listening-feedback');
    await page.getByRole('button', { name: 'Viết', exact: true }).click();
    await page.getByRole('button', { name: 'Mở bài An invitation with a purpose', exact: true }).click();
    const text = 'Dear Alex, ' + 'practice '.repeat(128);
    await page.getByLabel('Bài viết của bạn', { exact: true }).fill(text);
    failSave = true;
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await page.getByText(/Chưa xác nhận lưu được bài/).waitFor();
    check('Failed save retains writing', await page.getByLabel('Bài viết của bạn', { exact: true }).inputValue() === text);
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await page.getByText(/Đã lưu trên máy chủ/).waitFor();
    const attemptId = new URL(page.url()).searchParams.get('attempt');
    await page.reload();
    await page.getByLabel('Bài viết của bạn', { exact: true }).waitFor();
    check('Saved writing restored after reload', await page.getByLabel('Bài viết của bạn', { exact: true }).inputValue() === text);
    check('One draft per exercise', [...attempts.values()].filter(a => a.exerciseId === 'writing-email-v1').length === 1);
    await capture('writing');
    const stale = attempts.get(attemptId); attempts.set(attemptId, { ...stale, version: stale.version + 1 });
    await page.getByLabel('Bài viết của bạn', { exact: true }).fill(text + 'changed');
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await page.getByText(/Bài đã đổi ở tab khác/).waitFor();
    check('Conflict preserves local response', (await page.getByLabel('Bài viết của bạn', { exact: true }).inputValue()).endsWith('changed'));
    if (device === 'desktop') {
      page.removeAllListeners('dialog'); page.once('dialog', dialog => dialog.dismiss());
      await page.locator('a[href="/notes"]').click();
      check('Cancelling unsaved sidebar navigation retains the room', new URL(page.url()).pathname === '/english');
      page.on('dialog', dialog => dialog.accept());
    }
    holdRead = true;
    await page.getByRole('button').filter({ hasText: 'An invitation with a purpose' }).click();
    await page.waitForFunction(() => document.querySelector('#english-response')?.disabled);
    check('Opening another attempt locks old response against data loss', await page.getByLabel('Bài viết của bạn', { exact: true }).isDisabled());
    releaseRead();
    await page.waitForFunction(value => document.querySelector('#english-response')?.value === value, text);
    check('Reopen same attempt loads newer server version', await page.getByLabel('Bài viết của bạn', { exact: true }).inputValue() === text);
    await page.getByRole('button', { name: 'Nộp bài luyện', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận nộp', exact: true }).click();
    await page.getByRole('heading', { name: 'Nhìn lại bài luyện' }).waitFor();
    check('Submitted writing read-only', await page.getByLabel('Bài viết của bạn', { exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Nói', exact: true }).click();
    await page.getByRole('button', { name: 'Mở bài Your everyday world', exact: true }).click();
    await page.evaluate(() => {
      window.__realEnglishMicrophone = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => new Promise(resolve => { window.__lateEnglishMicrophone = resolve; }) });
    });
    await page.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true }).click();
    await page.getByRole('button', { name: 'Huỷ mở micro', exact: true }).click();
    await page.evaluate(async () => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: window.__realEnglishMicrophone });
      const stream = await window.__realEnglishMicrophone({ audio: true });
      window.__lateEnglishTracks = stream.getTracks(); window.__lateEnglishMicrophone(stream);
    });
    await page.waitForFunction(() => window.__lateEnglishTracks.every(track => track.readyState === 'ended'));
    check('Cancelled permission request stops a late microphone stream', true);
    check('Recorder recovers after cancelled permission request', await page.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true }).isEnabled());
    await page.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true }).click();
    await page.getByRole('button', { name: /Dừng ghi/ }).waitFor();
    await page.waitForTimeout(800); // Accumulate a real encoded MediaRecorder chunk from the fake microphone.
    await page.getByRole('button', { name: /Dừng ghi/ }).click();
    await page.getByRole('link', { name: 'Tải bản ghi', exact: true }).waitFor();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Tải bản ghi', exact: true }).click();
    const download = await downloadPromise;
    const savedPath = path.join(output, `${device}-recording.webm`); await download.saveAs(savedPath);
    check('Browser recorder creates a nonempty downloadable file', fs.statSync(savedPath).size > 0);
    check('No audio uploaded to API', !writes.some(w => w.body?.audio || w.endpoint.includes('/storage')));
    await page.getByLabel('Tự nhận xét sau khi nghe lại', { exact: true }).fill('I gave examples. Next time I will pause less.');
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await page.getByText(/Đã lưu trên máy chủ/).waitFor();
    await capture('speaking');
    await page.getByRole('button', { name: 'Đọc', exact: true }).click();
    await page.getByRole('button', { name: 'Mở bài The library beyond books', exact: true }).click();
    await page.getByRole('radio').nth(1).check();
    await capture('reading');
    await page.getByRole('button', { name: 'Nộp bài luyện', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận nộp', exact: true }).click();
    await page.getByText('1/1 câu đúng · Không phải điểm VSTEP', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chuyển sang giao diện tối', exact: true }).click();
    await capture('dark-reading');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('heading', { name: 'Review your practice' }).waitFor();
    check('English UI translation works', await page.getByRole('button', { name: 'Choose another exercise', exact: true }).count() === 1);
    check('Mutation body contains no actor or claimed grade', writes.filter(w => w.endpoint.startsWith('/english/')).every(w => !('userId' in w.body) && !('score' in w.body)));
    await context.close();
  }
  assert.equal(report.errors.length, 0, 'No browser JS errors');
  assert.equal(report.unmatched.length, 0, 'No unmatched API requests');
  assert.equal(report.accessibility.flatMap(a => a.violations).length, 0, 'No WCAG A/AA violations');
  console.log(JSON.stringify({ checks: report.checks.length, screenshots: report.screenshots.length, errors: report.errors, accessibilityViolations: report.accessibility.flatMap(a => a.violations) }, null, 2));
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
