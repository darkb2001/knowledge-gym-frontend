import assert from 'node:assert/strict';

// Public GET-only smoke checks. No credentials or API writes go to the app.
const base = process.argv[2];
if (!base) throw new Error('Pass a deployment origin to verify.');
let origin;
try { origin = new URL(base).origin; }
catch { throw new Error('Deployment URL is invalid.'); }
const checks = [
  ['/login', 'text/html'],
  ['/icon.svg', 'image/svg+xml'],
  ['/favicon.ico', 'image/'],
  ['/apple-icon.png', 'image/png'],
];
for (const [path, contentType] of checks) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path}: expected HTTP 200, got ${response.status}. Check domain/deployment protection.`);
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
