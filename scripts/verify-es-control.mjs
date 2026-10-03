// D11 browser regression: every API request/write is intercepted; never uses a live bridge.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://localhost:3210';
const output = path.resolve('.impeccable/review/es-control');
fs.mkdirSync(output, { recursive: true });
const report = { notice: 'Synthetic browser fixtures; no real backend or Elasticsearch operations.', checks: [], errors: [], unmatched: [], accessibility: [] };
const generic = 'ES control không phản hồi, xem log server';
const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
try {
  for (const [device, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.errors.push(error.message));
    const user = { id: 'fixture-admin', role: 'ADMIN', email: 'fixture@example.test', displayName: 'Fixture Admin' };
    await page.addInitScript(user => sessionStorage.setItem('kg.user', JSON.stringify(user)), user);
    let scenario = 'false', statusCalls = 0, settingsCalls = 0;
    const settings = { mode: 'AUTO', version: 1, updatedAt: null, updatedBy: null, elasticsearchConfigured: true };
    await page.route('**/api/v1/**', async route => {
      const endpoint = new URL(route.request().url()).pathname.replace('/api/v1', '');
      const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (endpoint === '/auth/refresh') return route.fulfill({ headers, json: { accessToken: 'fixture-only-token', user } });
      if (endpoint === '/admin/search/settings') { settingsCalls++; return route.fulfill({ headers, json: settings }); }
      if (endpoint === '/admin/search/elasticsearch/status') {
        statusCalls++;
        if (scenario === 'html') return route.fulfill({ status: 502, headers, contentType: 'text/html', body: '<html>Cloudflare error code: 502 — raw proxy page</html>' });
        if (scenario === 'json') return route.fulfill({ status: 502, headers, json: { detail: 'Internal bridge diagnostics should not be displayed' } });
        if (scenario === 'prototype') return route.fulfill({ headers, json: { success: true, exitCode: 0, output: 'constructor' } });
        return route.fulfill({ headers, json: { success: scenario === 'ok', exitCode: scenario === 'ok' ? 0 : 1, output: scenario === 'ok' ? 'Fixture ES running' : 'Private bridge failure output' } });
      }
      if (endpoint === '/admin/search/elasticsearch/start') return route.fulfill({ headers, json: { success: true, exitCode: 0, output: { state: 'Fixture started' }, settings: null } });
      if (endpoint === '/admin/search/elasticsearch/stop') { settings.mode = 'POSTGRES'; settings.version++; return route.fulfill({ headers, json: { success: true, exitCode: 0, output: { state: 'Fixture stopped' }, settings } }); }
      report.unmatched.push(endpoint); return route.fulfill({ status: 501, headers, json: { detail: 'Unmatched fixture' } });
    });
    const check = (name, condition) => { assert.ok(condition, name); report.checks.push({ device, name, passed: true }); };
    const status = () => page.getByRole('button', { name: 'Trạng thái ES', exact: true });
    const waitForStatus = () => page.waitForResponse(response => response.url().endsWith('/elasticsearch/status'));
    async function failedStatus(retry = false) {
      await Promise.all([waitForStatus(), (retry ? page.getByRole('alert').getByRole('button') : status()).click()]);
      await page.getByRole('alert').filter({ hasText: generic }).waitFor();
      check(`${scenario}: error, not successful lifecycle message`, await page.getByRole('status').filter({ hasText: /Đã lấy trạng thái|Fixture ES running/ }).count() === 0);
      check(`${scenario}: no raw bridge/proxy/parser output`, !(await page.locator('main').innerText()).match(/Private bridge|Cloudflare|Internal bridge diagnostics|Unexpected token/));
    }
    await page.goto(`${base}/admin/search`); await status().waitFor(); await page.waitForFunction(() => !document.querySelector('fieldset[disabled]'));
    await failedStatus(); check('HTTP 200 success:false rejected', statusCalls === 1);
    const reads = settingsCalls; scenario = 'html'; await failedStatus(true);
    check('retry repeats ES status, not settings-only reload', statusCalls === 2 && settingsCalls === reads);
    scenario = 'json'; await failedStatus();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'ES control is not responding; check server logs.' }).waitFor(); check('existing error switches language immediately', true);
    await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    report.accessibility.push({ device, violations: axe.violations.map(item => item.id) });
    await page.screenshot({ path: path.join(output, `${device}-502.png`), fullPage: true });
    scenario = 'ok'; await Promise.all([waitForStatus(), status().click()]);
    await page.getByRole('status').filter({ hasText: 'Fixture ES running' }).waitFor();
    check('successful retry clears failure alert', await page.locator('main').getByRole('alert').count() === 0);
    await page.getByRole('button', { name: 'English', exact: true }).click(); scenario = 'prototype';
    await Promise.all([waitForStatus(), page.getByRole('button', { name: 'Elasticsearch status', exact: true }).click()]);
    await page.getByRole('status').filter({ hasText: /^constructor$/ }).waitFor(); check('raw backend output is not treated as an i18n key', true);
    await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
    await page.getByRole('button', { name: 'Bật ES', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Fixture started' }).waitFor(); check('structured start output renders safely as text', true);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Tắt ES', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Elasticsearch đã dừng' }).waitFor();
    check('stop applies authoritative envelope settings', await page.locator('input[value="POSTGRES"]').isChecked());
    check('no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await context.close();
  }
  assert.equal(report.errors.length, 0); assert.equal(report.unmatched.length, 0);
  assert.equal(report.accessibility.reduce((sum, item) => sum + item.violations.length, 0), 0);
} finally { await browser.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ checks: report.checks.length, errors: report.errors.length, unmatched: report.unmatched.length, accessibility: report.accessibility }, null, 2));
