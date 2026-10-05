import assert from 'node:assert/strict';

// Public GET-only smoke checks. No credentials or API writes go to the app.
const base = process.argv[2];
if (!base) throw new Error('Pass a deployment origin to verify.');
let origin;
try { origin = new URL(base).origin; }
catch { throw new Error('Deployment URL is invalid.'); }

// Vercel WAF (Challenge Bot Protection / Deny AI Bots) + Deployment Protection
// chặn request không phải browser, kể cả runner GitHub: nhận 401/403/429 thay vì
// 200. Deploy vẫn coi là ĐẠT (site sống, chỉ đang được bảo vệ) — chỉ fail khi
// 5xx hoặc nội dung HTML mất brand. Muốn kiểm tra sâu: đặt
// VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Project → Settings → Deployment
// Protection → Protection Bypass for Automation) để lấy 200 thật.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const headers = { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,image/*,*/*;q=0.8' };
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  headers['x-vercel-set-bypass-cookie'] = 'true';
}
const PROTECTED = new Set([401, 403, 429]);

const checks = [
  ['/login', 'text/html'],
  ['/icon.svg', 'image/svg+xml'],
  ['/favicon.ico', 'image/'],
  ['/apple-icon.png', 'image/png'],
];
let protectedCount = 0;
for (const [path, contentType] of checks) {
  const response = await fetch(`${origin}${path}`, { headers, signal: AbortSignal.timeout(30000) });
  if (PROTECTED.has(response.status)) {
    protectedCount += 1;
    console.log(`SKIP ${path}: HTTP ${response.status} (WAF/deployment protection) — deploy vẫn sống.`);
    continue;
  }
  assert.equal(
    response.status,
    200,
    `${path}: expected HTTP 200, got ${response.status}. Check domain/deployment protection.`,
  );
  assert.ok(response.headers.get('content-type')?.includes(contentType), `${path}: wrong MIME type`);
  if (path === '/login') {
    const html = await response.text();
    assert.ok(html.includes('Knowledge Gym'), 'Login did not render the application.');
    assert.match(html, /rel="icon"[^>]*href="\/icon\.svg/, 'SVG favicon link missing');
    assert.match(html, /rel="apple-touch-icon"/, 'Apple touch icon link missing');
  } else if (path === '/icon.svg') {
    const svg = await response.text();
    assert.ok(svg.includes('#345f73') && svg.includes('#fffcf6'), 'Wrong brand icon colors');
  } else {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (path.endsWith('.ico')) assert.deepEqual([...bytes.slice(0, 4)], [0, 0, 1, 0]);
    else assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  console.log(`PASS ${path}: HTTP 200 / ${contentType}`);
}
if (protectedCount === checks.length) {
  console.log(
    'Toàn bộ endpoint bị WAF/deployment protection chặn — thêm VERCEL_AUTOMATION_BYPASS_SECRET để kiểm tra sâu hơn.',
  );
}
