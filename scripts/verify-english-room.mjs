/* Original compiled-bank fixtures, intercepted API. Real local MP3 decoding and fake-mic recording.
 * NOT authenticated live backend, production, physical-mobile or human-pedagogy acceptance.
 * NODE_PATH=/tmp/kg-english-browser/node_modules KG_UI_URL=http://127.0.0.1:3226 node scripts/verify-english-room.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://127.0.0.1:3226';
const output = path.resolve('.impeccable/review/english');
fs.mkdirSync(output, { recursive: true });
const parse = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error(`Invalid fixture: ${file}`); } };
const catalog = parse('.fixtures/english/catalog.json');
assert.equal(catalog.length, 47);
const publicCatalog = catalog.map(e => ({ id: e.id, skill: e.skill, title: e.title, focus: e.focus, minutes: e.minutes, minimumWords: e.minimumWords, prompt: e.prompt, passage: e.passage, audioPath: e.audioPath, checklist: e.checklist, parts: e.parts, scope: e.scope, curriculum: e.curriculum, items: e.items.map(q => ({ id: q.id, stem: q.stem, options: q.options })) }));
assert.ok(!JSON.stringify(publicCatalog).includes('"referenceResponse"'));
assert.ok(!JSON.stringify(publicCatalog).includes('"correctIndex"'));
assert.ok(!JSON.stringify(publicCatalog).includes('"transcript"'));
const expansion = parse('content/english/topic-expansion.json');
const vocabulary = parse('content/english/topics.json').map(t => ({ ...t, entries: [...t.entries, ...expansion[t.id]] }));
const captureEnabled = process.env.KG_UI_CAPTURE !== '0';
const captureTargets = new Set((process.env.KG_UI_CAPTURE_TARGETS || '').split(',').filter(Boolean));
const previousVisual = !captureEnabled && fs.existsSync(path.join(output, 'report.json')) ? parse(path.join(output, 'report.json')) : null;
const report = { evidence: '47-entry compiled original authored bank; intercepted API fixtures, local MP3 decoding, fake microphone. NOT live backend/production/physical mobile/human pronunciation or pedagogy.', checks: [], screenshots: previousVisual?.screenshots ?? [], captureMode: captureEnabled ? 'Fresh batched screenshots' : 'Functional/axe confirmation; retained screenshots from preceding complete visual pass (no further visual polishing)', accessibility: [], errors: [], unmatched: [] };
const browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
try {
  const anonymous = await browser.newContext();
  const guest = await anonymous.newPage();
  await guest.goto(`${base}/english`);
  assert.match(new URL(guest.url()).pathname, /login/);
  report.checks.push({ name: 'Anonymous redirects to login', passed: true });
  await anonymous.close();
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['landscape', 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', permissions: ['microphone'], acceptDownloads: true });
    await context.addCookies([{ name: 'kg_session', value: '1', url: base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => report.errors.push({ device, message: e.message }));
    page.on('dialog', dialog => dialog.accept());
    const attempts = new Map(); const writes = [];
    const transcriptReads = [];
    let next = 1, failSave = false, failTranscript = false, holdRead = false, releaseRead, holdTranscript = false, releaseTranscript, transcriptReady;
    const user = { id: '11111111-1111-4111-8111-000000009000', email: 'fixture@example.test', displayName: 'English learner', role: 'USER' };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url')}.fixture`;
    const check = (name, value = true) => { assert.ok(value, `${device}: ${name}`); report.checks.push({ device, name, passed: true }); };
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.replace('/api/v1', ''), method = request.method();
      const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const body = request.postData() ? request.postDataJSON() : null;
      if (method !== 'GET') writes.push({ endpoint, method, body });
      let data;
      if (endpoint === '/auth/refresh') data = { accessToken: token, expiresIn: 3600, user };
      else if (endpoint === '/users/me') data = user;
      else if (endpoint === '/english/exercises') data = publicCatalog;
      else if (/^\/english\/exercises\/[^/]+\/transcript$/.test(endpoint) && method === 'GET') {
        const id = endpoint.split('/')[3], partId = url.searchParams.get('partId') || id;
        transcriptReads.push({ id, partId });
        if (failTranscript) { failTranscript = false; return route.fulfill({ status: 500, headers, json: { detail: 'Synthetic transcript failure' } }); }
        const exercise = catalog.find(e => e.id === id), section = catalog.find(e => e.id === partId);
        if (!exercise || !section) return route.fulfill({ status: 404, headers, json: { detail: 'Unknown exercise' } });
        assert.equal(exercise.skill, 'LISTENING');
        assert.ok(partId === id || exercise.parts.some(p => p.id === partId));
        if (holdTranscript) { holdTranscript = false; await new Promise(resolve => { releaseTranscript = resolve; transcriptReady(); }); }
        data = { exerciseId: id, partId, text: section.transcript };
      }
      else if (endpoint === '/english/attempts' && method === 'POST') {
        data = [...attempts.values()].find(a => a.exerciseId === body.exerciseId && a.status === 'DRAFT');
        if (!data) { const id = `11111111-1111-4111-8111-${String(next++).padStart(12,'0')}`; data = { id, exerciseId: body.exerciseId, status: 'DRAFT', version: 0, answers: {}, response: '', elapsedSeconds: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), feedback: null }; attempts.set(id, data); }
      } else if (endpoint === '/english/attempts' && method === 'GET') {
        const p = Number(url.searchParams.get('page') || 1), size = 10, items = [...attempts.values()].reverse();
        data = { items: items.slice((p-1)*size, p*size), page: p, size, totalElements: items.length };
      } else if (endpoint.startsWith('/english/attempts/')) {
        const id = endpoint.split('/').at(-1); data = attempts.get(id);
        if (!data) return route.fulfill({ status: 404, headers, json: { detail: 'Attempt not found' } });
        if (method === 'GET' && holdRead) { holdRead = false; await new Promise(resolve => { releaseRead = resolve; }); }
        if (method === 'PUT') {
          if (failSave) { failSave = false; return route.fulfill({ status: 500, headers, json: { detail: 'Synthetic save failure' } }); }
          if (body.version !== data.version || data.status !== 'DRAFT') return route.fulfill({ status: 409, headers, json: { detail: 'Synthetic version conflict' } });
          const e = catalog.find(e => e.id === data.exerciseId);
          const feedback = body.submit ? { correct: e.items.length ? e.items.filter(q => body.answers[q.id] === q.correctIndex).length : null, total: e.items.length, transcript: e.transcript, items: e.items.map(q => ({ id: q.id, correctIndex: q.correctIndex, explanation: q.explanation })), referenceResponse: e.referenceResponse } : null;
          data = { ...data, ...body, status: body.submit ? 'SUBMITTED' : 'DRAFT', version: data.version + 1, feedback, updatedAt: new Date().toISOString() }; attempts.set(id, data);
        }
      } else { report.unmatched.push({ device, endpoint, method }); return route.fulfill({ status: 501, headers, json: { detail: 'Unmatched fixture' } }); }
      return route.fulfill({ headers, json: data });
    });
    async function capture(name) {
      await page.evaluate(async () => { document.activeElement?.blur(); window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      if (captureEnabled || captureTargets.has(name)) { await page.screenshot({ path: path.join(output, `${device}-${name}.png`), fullPage: true }); if (!report.screenshots.includes(`${device}-${name}.png`)) report.screenshots.push(`${device}-${name}.png`); }
      check(`${name}: no horizontal overflow`, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      report.accessibility.push({ device, name, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
    }
    async function open(id) { const close = page.getByRole('button', { name: 'Chọn bài khác', exact: true }); if (await close.count()) await close.click(); const e = catalog.find(e => e.id === id); await page.getByRole('button', { name: e.curriculum === 'HCMUS_PREPARATION' && e.skill === 'WRITING' ? 'Ngữ pháp & Viết' : ({ LISTENING: 'Nghe', READING: 'Đọc', WRITING: 'Viết', SPEAKING: 'Nói' })[e.skill], exact: true }).click(); await page.getByRole('button', { name: `Mở bài ${e.title}`, exact: true }).click(); await page.locator('#english-workspace-title').filter({ hasText: e.title }).waitFor(); }
    async function submit() { await page.getByRole('button', { name: 'Nộp bài luyện', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận nộp', exact: true }).click(); await page.getByRole('heading', { name: 'Nhìn lại bài luyện', exact: true }).waitFor(); }
    async function answerVisible(e) { for (const item of e.items) { const inputs = page.locator(`input[type="radio"][name$="-${item.id}"]`); assert.equal(await inputs.count(), 4, `Question ${item.id} must have four visible options`); await inputs.nth(item.correctIndex).check(); } }
    await page.goto(`${base}/english?attempt=11111111-1111-4111-8111-000000999999`);
    await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
    await page.getByRole('button', { name: 'Mở bài A change of plans', exact: true }).waitFor();
    check('Unavailable deep link recovers', !new URL(page.url()).searchParams.has('attempt'));
    await capture('room');
    const beforeVocabulary = writes.filter(w => w.endpoint.startsWith('/english/')).length;
    await page.getByRole('button', { name: 'Từ vựng theo chủ đề', exact: true }).click();
    check('Vocabulary does not display the external-reference note', await page.getByRole('link', { name: 'ForumFlash', exact: true }).count() === 0);
    const phraseText = () => page.locator('#vocabulary-desk p[lang="en"]').first().innerText();
    const firstTerm = await phraseText();
    const first = vocabulary[0].entries.find(e => e.term === firstTerm);
    check('Eight phrases in topic', await page.getByText('0/8 đã nhớ trong chủ đề', { exact: true }).count() === 1);
    check('Meaning/example hidden initially', await page.getByText(first.example, { exact: true }).count() === 0);
    await page.getByRole('button', { name: 'Nhớ nghĩa trước, rồi mở ví dụ', exact: true }).click();
    await page.getByText(first.example, { exact: true }).waitFor();
    await page.getByLabel('Phát âm cụm từ', { exact: true }).evaluate(async el => { await el.play(); el.pause(); });
    check('Neural phrase audio decodes', await page.getByLabel('Phát âm cụm từ', { exact: true }).evaluate(el => el.duration > 0.5));
    await page.getByRole('button', { name: 'Đã nhớ cụm này', exact: true }).click();
    await page.getByText('1/8 đã nhớ trong chủ đề', { exact: true }).waitFor();
    await capture('vocabulary-learn');
    await page.getByLabel('Thử dùng cụm này trong câu của bạn', { exact: true }).fill('My original practice sentence.');
    page.removeAllListeners('dialog'); page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Cụm tiếp', exact: true }).click();
    check('Cancelled move retains private sentence', await page.getByLabel('Thử dùng cụm này trong câu của bạn').inputValue() === 'My original practice sentence.');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Đặt lại', exact: true }).click();
    await page.getByRole('button', { name: 'Nhớ nghĩa trước, rồi mở ví dụ', exact: true }).waitFor();
    check('Confirmed topic reset discards sentence and marks', await page.getByText('0/8 đã nhớ trong chủ đề', { exact: true }).count() === 1);
    await page.getByRole('button', { name: 'Nhớ & viết', exact: true }).click();
    const writeMeaning = await page.locator('#vocabulary-desk p[lang="vi"]').first().innerText();
    const writeEntry = vocabulary[0].entries.find(e => e.meaning === writeMeaning);
    await page.getByLabel('Viết cụm tiếng Anh', { exact: true }).fill('wrong words');
    await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
    await page.getByText(/Chưa khớp. Cụm đã vào lượt cần ôn/).waitFor();
    await page.getByLabel('Viết cụm tiếng Anh', { exact: true }).fill(writeEntry.term.toUpperCase());
    await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
    await page.getByText(/Đã viết đúng sau gợi ý/).waitFor();
    check('Assisted correction stays review, not independently recalled', await page.getByText('0/8 đã nhớ trong chủ đề', { exact: true }).count() === 1);
    await page.getByLabel('Lượt luyện', { exact: true }).selectOption('review');
    check('Short review queue preserves its final item', await page.getByText('Cụm 1/1 trong lượt · 8 cụm trong chủ đề', { exact: true }).count() === 1);
    await capture('vocabulary-write');
    await page.reload();
    await page.getByRole('button', { name: 'Từ vựng theo chủ đề', exact: true }).click();
    await page.getByLabel('Viết cụm tiếng Anh', { exact: true }).waitFor();
    check('Mode and review queue survive account-tab reload', await page.getByLabel('Lượt luyện').inputValue() === 'review');
    await page.getByLabel('Lượt luyện').selectOption('all');
    await page.getByRole('button', { name: 'Nghe & gõ', exact: true }).click();
    await page.getByRole('button', { name: 'Mở cụm từ', exact: true }).click();
    await page.getByLabel('Bạn nghe được cụm gì?', { exact: true }).fill(await phraseText());
    await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
    await page.getByText(/Đã viết đúng sau gợi ý/).waitFor();
    check('Revealed dictation remains assisted');
    await capture('vocabulary-listen');
    await page.getByRole('button', { name: 'Chọn nghĩa', exact: true }).click();
    const quizTerm = await phraseText();
    const quizEntry = vocabulary[0].entries.find(e => e.term === quizTerm);
    const choices = page.locator('#vocabulary-desk button[lang="vi"]');
    await choices.filter({ hasNotText: quizEntry.meaning }).first().click();
    await page.getByText(/Chưa đúng. Cụm đã vào lượt cần ôn/).waitFor();
    check('Wrong multiple choice is locked', await choices.first().isDisabled());
    await capture('vocabulary-quiz');
    await page.getByRole('button', { name: 'Ghép cặp', exact: true }).click();
    const terms = await page.locator('#vocabulary-desk button[lang="en"]').allTextContents();
    const batch = terms.map(term => vocabulary[0].entries.find(e => e.term === term.trim()));
    await page.getByRole('button', { name: batch[0].term, exact: true }).click();
    await page.getByRole('button', { name: batch[1].meaning, exact: true }).click();
    await page.getByText(/Chưa khớp\./).waitFor();
    for (const e of batch) { await page.getByRole('button', { name: e.term, exact: true }).click(); await page.getByRole('button', { name: e.meaning, exact: true }).click(); }
    await page.getByText('Đã ghép 4 cặp. Cụm từng ghép sai vẫn ở lượt cần ôn.', { exact: true }).waitFor();
    await capture('vocabulary-match');
    await page.getByRole('button', { name: 'Lượt ghép tiếp', exact: true }).click();
    const nextTerms = await page.locator('#vocabulary-desk button[lang="en"]').allTextContents();
    check('Next matching batch has no previously seen phrases', nextTerms.every(term => !terms.includes(term)));
    await page.getByLabel('Tìm chủ đề hoặc cụm từ').fill('moi truong');
    if (device === 'desktop') await page.getByRole('button', { name: 'Môi trường Environment & Climate', exact: true }).click();
    else await page.getByLabel('Chọn chủ đề từ vựng').selectOption('environment');
    await page.getByRole('heading', { name: 'Environment & Climate' }).waitFor();
    check('Accent-insensitive topic search', true);
    await page.getByLabel('Tìm chủ đề hoặc cụm từ').fill('unknown-topic');
    await page.getByText('Không thấy chủ đề phù hợp. Thử từ khóa khác.').waitFor();
    check('Empty search is recoverable');
    check('Vocabulary makes no graded-attempt writes', writes.filter(w => w.endpoint.startsWith('/english/')).length === beforeVocabulary);
    await page.getByRole('button', { name: 'Bài luyện 4 kỹ năng', exact: true }).click();
    let failAudio = true;
    await page.route('**/english/audio/announcement-v1.mp3', route => { if (failAudio) { failAudio = false; return route.abort(); } return route.continue(); });
    await open('listening-announcement-v1');
    await page.getByRole('button', { name: 'Tải lại audio', exact: true }).click();
    check('Transcript hidden and not fetched by default', await page.locator('#english-listening-transcript').count() === 0 && transcriptReads.length === 0);
    failTranscript = true; await page.getByRole('button', { name: 'Hiện transcript', exact: true }).click();
    await page.getByText(/Chưa tải được transcript/).waitFor();
    check('Transcript failure leaves listening answers available', await page.getByRole('radio').count() === 12);
    await page.getByRole('button', { name: 'Thử tải transcript lại', exact: true }).click();
    await page.locator('#english-listening-transcript p[lang="en"], #english-listening-transcript div[lang="en"]').waitFor();
    check('Opt-in transcript before submit has the authored script', (await page.locator('#english-listening-transcript').innerText()).includes(catalog.find(e => e.id === 'listening-announcement-v1').transcript.trim().slice(0, 60)));
    await capture('listening-transcript');
    await page.getByRole('button', { name: 'Ẩn transcript', exact: true }).click();
    check('Hide removes transcript from the DOM without changing answers', await page.locator('#english-listening-transcript').count() === 0);
    const cachedReads = transcriptReads.length;
    await page.getByRole('button', { name: 'Hiện transcript', exact: true }).click();
    check('Repeated show uses only this mounted lesson cache', transcriptReads.length === cachedReads);
    await page.getByRole('button', { name: 'Ẩn transcript', exact: true }).click();
    await page.getByLabel('Audio bài nghe').evaluate(async el => { await el.play(); el.pause(); });
    check('Explicit audio retry recovers real playback', await page.getByLabel('Audio bài nghe').evaluate(el => el.duration > 0));
    await page.getByLabel('Tốc độ nghe').selectOption('0.75');
    check('Speed affects native playback', await page.getByLabel('Audio bài nghe').evaluate(el => el.playbackRate === 0.75));
    await page.getByLabel('Audio bài nghe').evaluate(el => { el.currentTime = 12; });
    await page.getByRole('button', { name: 'Lùi 10 giây' }).click();
    check('Rewind clamps safely', await page.getByLabel('Audio bài nghe').evaluate(el => el.currentTime >= 0 && el.currentTime <= 2.1));
    await answerVisible(catalog.find(e => e.id === 'listening-announcement-v1'));
    await submit();
    await page.getByText('3/3 câu đúng · Không phải điểm kỳ thi', { exact: true }).waitFor();
    check('Submitted choices read-only', await page.getByRole('radio').first().isDisabled());
    await page.getByRole('button', { name: 'Hiện transcript', exact: true }).click();
    await capture('listening-feedback');
    await open('writing-email-v1');
    const text = 'Dear Alex, ' + 'practice '.repeat(128);
    check('Writing model absent in draft', await page.getByRole('heading', { name: 'Bài viết mẫu tham khảo' }).count() === 0);
    await page.getByLabel('Bài viết của bạn').fill(text);
    failSave = true; await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await page.getByText(/Chưa xác nhận lưu được bài/).waitFor();
    check('Failed save retains writing', await page.getByLabel('Bài viết của bạn').inputValue() === text);
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click(); await page.getByText(/Đã lưu trên máy chủ/).waitFor();
    const attemptId = new URL(page.url()).searchParams.get('attempt');
    await page.reload(); await page.getByLabel('Bài viết của bạn').waitFor();
    check('Saved writing survives reload', await page.getByLabel('Bài viết của bạn').inputValue() === text);
    await capture('writing');
    const stale = attempts.get(attemptId); attempts.set(attemptId, { ...stale, version: stale.version + 1 });
    await page.getByLabel('Bài viết của bạn').fill(text + 'changed');
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click(); await page.getByText(/Bài đã đổi ở tab khác/).waitFor();
    check('Stale conflict retains local writing', (await page.getByLabel('Bài viết của bạn').inputValue()).endsWith('changed'));
    holdRead = true; await page.getByRole('button').filter({ hasText: 'An invitation with a purpose' }).click();
    await page.waitForFunction(() => document.querySelector('#english-response')?.disabled);
    check('Opening history locks old workspace', await page.getByLabel('Bài viết của bạn').isDisabled());
    releaseRead(); await page.waitForFunction(value => document.querySelector('#english-response')?.value === value, text);
    await submit(); await page.getByRole('heading', { name: 'Bài viết mẫu tham khảo' }).waitFor();
    check('Writing model appears only after immutable submit', await page.getByLabel('Bài viết của bạn').isDisabled());
    await capture('writing-model');
    await open('speaking-interaction-v1');
    await page.evaluate(() => { window.__realMic = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => new Promise(resolve => { window.__lateMic = resolve; }) }); });
    await page.getByRole('button', { name: 'Bắt đầu ghi âm' }).click(); await page.getByRole('button', { name: 'Huỷ mở micro' }).click();
    await page.evaluate(async () => { Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: window.__realMic }); const stream = await window.__realMic({ audio: true }); window.__lateTracks = stream.getTracks(); window.__lateMic(stream); });
    await page.waitForFunction(() => window.__lateTracks.every(t => t.readyState === 'ended'));
    check('Cancelled late mic permission releases tracks');
    await page.getByRole('button', { name: 'Bắt đầu ghi âm' }).click(); await page.getByRole('button', { name: /Dừng ghi/ }).waitFor();
    await page.waitForTimeout(800); // Real MediaRecorder chunk from explicitly fake microphone.
    await page.getByRole('button', { name: /Dừng ghi/ }).click();
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('link', { name: 'Tải bản ghi' }).click();
    const download = await downloadPromise, savedPath = path.join(output, `${device}-recording.webm`); await download.saveAs(savedPath);
    check('Recorder produces nonempty downloadable audio', fs.statSync(savedPath).size > 0);
    await page.getByLabel('Tự nhận xét sau khi nghe lại').fill('I gave examples. I will practise the pauses.');
    check('Speaking model absent before submit', await page.getByRole('heading', { name: 'Câu trả lời mẫu tham khảo' }).count() === 0);
    await submit(); await page.getByRole('heading', { name: 'Câu trả lời mẫu tham khảo' }).waitFor();
    await capture('speaking-model');
    check('No audio upload', !writes.some(w => w.body?.audio || w.endpoint.includes('/storage')));
    await open('reading-complete-practice-v1');
    const reading = catalog.find(e => e.id === 'reading-complete-practice-v1');
    for (let i = 0; i < reading.parts.length; i++) { await page.getByLabel('Chọn phần bài luyện').selectOption(String(i)); check(`Reading section ${i+1}: exactly ten questions`, await page.locator('fieldset').count() === 10); await answerVisible({ items: reading.items.filter(q => reading.parts[i].itemIds.includes(q.id)) }); }
    await page.getByLabel('Chọn phần bài luyện').selectOption('0');
    check('Grouped answers retained across section switches', await page.getByRole('radio', { checked: true }).count() === 10);
    await capture('reading');
    await submit(); await page.getByText('40/40 câu đúng · Không phải điểm kỳ thi', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click(); await capture('dark-reading');
    await page.getByLabel('Bạn đang ôn bài thi nào?').selectOption('HCMUS_PREPARATION');
    await page.getByText('Cấu trúc, nguồn chính thức và cách dùng phòng học', { exact: true }).click();
    await capture('hcmus-guide');
    await open('hcmus-listening-complete-v1');
    const hcmusListening = catalog.find(e => e.id === 'hcmus-listening-complete-v1');
    for (let i = 0; i < 3; i++) {
      await page.getByLabel('Chọn phần bài luyện').selectOption(String(i));
      check(`HCMUS listening section ${i + 1}: correct question count`, await page.locator('fieldset').count() === [10, 5, 5][i]);
      await answerVisible({ items: hcmusListening.items.filter(q => hcmusListening.parts[i].itemIds.includes(q.id)) });
    }
    await page.getByLabel('Chọn phần bài luyện').selectOption('0');
    check('HCMUS listening retains short-conversation answers', await page.getByRole('radio', { checked: true }).count() === 10);
    await page.getByRole('button', { name: 'Hiện transcript', exact: true }).click();
    await page.locator('#english-listening-transcript div[lang="en"]').waitFor();
    check('Grouped transcript matches the selected short-conversation section', (await page.locator('#english-listening-transcript').innerText()).includes('Conversation 10.'));
    await page.getByLabel('Chọn phần bài luyện').selectOption('1');
    check('Switching section resets transcript to hidden', await page.locator('#english-listening-transcript').count() === 0);
    holdTranscript = true; const startedTranscript = new Promise(resolve => { transcriptReady = resolve; });
    await page.getByRole('button', { name: 'Hiện transcript', exact: true }).click();
    await startedTranscript;
    await page.getByLabel('Chọn phần bài luyện').selectOption('2');
    const oldResponse = page.waitForResponse(r => r.url().includes('/transcript?partId=') && r.url().includes(hcmusListening.parts[1].id));
    releaseTranscript(); await oldResponse;
    await page.getByRole('button', { name: 'Hiện transcript', exact: true }).click();
    await page.locator('#english-listening-transcript div[lang="en"]').waitFor();
    const talkScript = catalog.find(e => e.id === hcmusListening.parts[2].id).transcript.trim().slice(0, 60);
    check('Late previous-section response cannot replace the current talk transcript', (await page.locator('#english-listening-transcript').innerText()).includes(talkScript));
    await capture('hcmus-listening'); await submit(); await page.getByText('20/20 câu đúng · Không phải điểm kỳ thi', { exact: true }).waitFor();
    await open('hcmus-grammar-v1'); await answerVisible(catalog.find(e => e.id === 'hcmus-grammar-v1')); await submit();
    await page.getByText('15/15 câu đúng · Không phải điểm kỳ thi', { exact: true }).waitFor();
    check('HCMUS grammar task is objective, not a VSTEP essay');
    await capture('hcmus-grammar');
    await page.reload(); await page.getByText('15/15 câu đúng · Không phải điểm kỳ thi', { exact: true }).waitFor();
    check('HCMUS target survives native-task reload', await page.getByLabel('Bạn đang ôn bài thi nào?').inputValue() === 'HCMUS_PREPARATION');
    await open('listening-study-space-v1');
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click(); await page.getByText(/Đã lưu trên máy chủ/).waitFor();
    await page.reload(); await page.locator('#english-workspace-title').filter({ hasText: catalog.find(e => e.id === 'listening-study-space-v1').title }).waitFor();
    check('HCMUS target survives transfer-task reload and owned deep link', await page.getByLabel('Bạn đang ôn bài thi nào?').inputValue() === 'HCMUS_PREPARATION');
    for (const id of ['hcmus-grammar-study-v1','hcmus-grammar-community-v1','hcmus-cloze-garden-v1','hcmus-cloze-repair-v1','hcmus-vocabulary-context-v1','hcmus-reading-wetland-v1']) {
      const e = catalog.find(e => e.id === id); await open(id); await answerVisible(e); await submit();
      await page.getByText(`${e.items.length}/${e.items.length} câu đúng · Không phải điểm kỳ thi`, { exact: true }).waitFor();
      check(`${id}: current-format original task submits all valid answers`);
    }
    if (device === 'desktop') {
      for (const e of catalog.filter(e => e.referenceResponse)) {
        await page.getByLabel('Bạn đang ôn bài thi nào?').selectOption(e.curriculum === 'HCMUS_PREPARATION' ? 'HCMUS_PREPARATION' : 'VSTEP');
        await open(e.id);
        if (await page.getByRole('button', { name: 'Nộp bài luyện', exact: true }).count()) {
          check(`${e.id}: no reference before submission`, await page.locator('#english-reference-title').count() === 0);
          await page.locator('#english-response').fill('Original synthetic learner response for browser verification.'); await submit();
        }
        await page.locator('#english-reference-title').waitFor();
        check(`${e.id}: full model and explanatory notes render`, (await page.locator('[aria-labelledby="english-reference-title"]').innerText()).includes(e.referenceResponse.title));
      }
    }
    await page.getByLabel('Bạn đang ôn bài thi nào?').selectOption('HCMUS_PREPARATION');
    await open('hcmus-speaking-v1');
    if (await page.getByRole('button', { name: 'Nộp bài luyện', exact: true }).count()) { await page.locator('#english-response').fill('My own introduction and reflection.'); await submit(); }
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('heading', { name: /Reference (writing|speaking) response/ }).waitFor();
    check('English reference UI and notes', await page.getByText('What to notice in the model', { exact: true }).count() === 1);
    await page.getByRole('button', { name: 'Topic vocabulary', exact: true }).click();
    await capture('dark-vocabulary');
    check('Mutation bodies never supply actor or claimed score', writes.filter(w => w.endpoint.startsWith('/english/')).every(w => !('userId' in w.body) && !('score' in w.body)));
    await page.getByRole('button', { name: 'Learn', exact: true }).click();
    await page.getByRole('button', { name: 'Recall the meaning, then reveal the example', exact: true }).click();
    await page.getByRole('button', { name: 'I recall this phrase', exact: true }).click();
    await page.waitForFunction(() => Object.entries(sessionStorage).some(([k, value]) => k.startsWith('kg.english-vocabulary.v1:') && value.includes('known')));
    // Local user-change event only: not a claim that a JWT/account-switch journey was validated.
    await page.evaluate(() => { const me = JSON.parse(sessionStorage.getItem('kg.user')); sessionStorage.setItem('kg.user', JSON.stringify({ ...me, id: '11111111-1111-4111-8111-000000009001' })); window.dispatchEvent(new Event('kg:user-changed')); });
    await page.waitForFunction(() => !sessionStorage.getItem('kg.english-vocabulary.v1:11111111-1111-4111-8111-000000009000'));
    await page.getByText('0/8 recalled in this topic', { exact: true }).waitFor();
    check('Fixture user-change event isolates and clears former account metadata');
    await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key.startsWith('kg.english-vocabulary.v1:')) throw new DOMException('Fixture progress storage denial', 'SecurityError'); return original.call(this, key, value); }; });
    await page.getByRole('button', { name: 'Recall the meaning, then reveal the example', exact: true }).click();
    await page.getByRole('button', { name: 'I recall this phrase', exact: true }).click();
    await page.getByText(/This browser cannot retain the practice session/).waitFor();
    check('Progress-storage denial keeps in-memory practice usable', await page.getByText('1/8 recalled in this topic', { exact: true }).count() === 1);
    // A generation fence must clear account metadata without pretending to revoke a server session.
    await page.evaluate(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'kg.logout-intent', newValue: '1' })); });
    await page.waitForFunction(() => !Object.keys(sessionStorage).some(k => k.startsWith('kg.english-vocabulary.v1:')));
    check('Cross-tab logout intent event clears account-scoped tab metadata');
    await context.close();
  }
  assert.equal(report.errors.length, 0, 'No browser JS errors');
  assert.equal(report.unmatched.length, 0, 'No unmatched requests');
  assert.equal(report.accessibility.flatMap(a => a.violations).length, 0, 'No WCAG A/AA violations');
  console.log(JSON.stringify({ checks: report.checks.length, screenshots: report.screenshots.length, errors: report.errors, accessibilityViolations: report.accessibility.flatMap(a => a.violations) }, null, 2));
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
