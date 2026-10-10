/* Public reference inventory only; raw CSVs/examples stay outside the repository.
 * NODE_PATH supplies authoring-only Playwright. Parse downloaded JS with the
 * project's TypeScript AST; never eval/require the remote application bundle.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { chromium } = require('playwright');
const origin = 'https://forumflash.vercel.app';
const output = process.env.KG_REFERENCE_OUTPUT ? path.resolve(process.env.KG_REFERENCE_OUTPUT) : fs.mkdtempSync(path.join(os.tmpdir(), 'kg-forumflash-'));
fs.mkdirSync(output, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
async function publicText(url) {
  let target;
  try { target = new URL(url); } catch { throw new Error('Invalid public reference URL; inspection stopped'); }
  if (target.origin !== origin) throw new Error('Reference fetch must remain on the requested public origin');
  const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Public reference returned ${response.status}; stop rather than bypass protection`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing public response body');
  const chunks = []; let bytes = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 1_000_000) { await reader.cancel(); throw new Error('Reference resource exceeds the inspection budget'); }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
function literal(node, depth = 0) {
  if (depth > 10) throw new Error('AST data nesting exceeds the inspection budget');
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return ts.isStringLiteral(node) ? node.text : Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(n => literal(n, depth + 1));
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) throw new Error('Not static object data');
    return [p.name.text, literal(p.initializer, depth + 1)];
  }));
  throw new Error('Not static literal data');
}
function csv(body) {
  const rows = []; let row = [], field = '', quoted = false;
  body = body.replace(/^\uFEFF/, '');
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"') { if (quoted && body[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === ',') { row.push(field); field = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) { if (c === '\r' && body[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV field');
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift(); assert.deepEqual(header, ['Term', 'Definition', 'Example', 'Topic']);
  return rows.map(values => { assert.equal(values.length, header.length); return Object.fromEntries(header.map((key, i) => [key, values[i]])); });
}
const html = await publicText(origin + '/');
fs.writeFileSync(path.join(output, 'index.html'), html);
const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]))].filter(p => p.startsWith('/_next/static/'));
assert.ok(scripts.length > 0 && scripts.length <= 30, 'Expected a bounded public Next.js resource list');
let topics, phones, appHash, appUrl;
for (const resource of scripts) {
  const body = await publicText(origin + resource);
  const ast = ts.createSourceFile(resource, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrayLiteralExpression(node.initializer) || ts.isObjectLiteralExpression(node.initializer))) {
      try {
        const value = literal(node.initializer);
        if (Array.isArray(value) && value.length === 20 && value.every(t => t && typeof t.id === 'string' && typeof t.title === 'string' && Array.isArray(t.concepts) && t.concepts.length === 20)) topics = value;
        if (value && !Array.isArray(value) && typeof value.early === 'string' && typeof value.education === 'string') phones = value;
      } catch { /* Functions and computed expressions are not data and are never executed. */ }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (topics && phones) { appHash = sha(body); appUrl = origin + resource; fs.writeFileSync(path.join(output, 'app.js'), body); break; }
}
assert.ok(topics && phones, 'Could not identify the public static taxonomy/phoneme dictionary; inspect rather than guess');
fs.writeFileSync(path.join(output, 'topics.json'), JSON.stringify(topics, null, 2));
const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
const all = [], exports = [], network = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.method() !== 'GET') network.push({ method: r.method(), url: r.url() }); });
  const response = await page.goto(origin, { waitUntil: 'networkidle', timeout: 20000 });
  assert.equal(response.status(), 200, 'Public UI must be available without bypassing protection');
  for (const topic of topics) {
    assert.match(topic.id, /^[a-z][a-z-]+$/);
    await page.getByRole('button', { name: new RegExp(topic.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
    await page.getByRole('button', { name: /Tải bộ từ/ }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: /Excel \/ Google Sheets/ }).click();
    const download = await pending;
    const filename = `forumflash-${topic.id}.csv`; await download.saveAs(path.join(output, filename));
    const bytes = fs.readFileSync(path.join(output, filename)); const rows = csv(bytes.toString('utf8'));
    assert.equal(rows.length, 200); assert.ok(rows.every(r => r.Topic === topic.title));
    exports.push({ topic: topic.id, title: topic.title, filename, rows: rows.length, sha256: sha(bytes) });
    all.push(...rows);
  }
} finally { await browser.close(); }
const normalise = term => term.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
const terms = new Map();
for (const row of all) {
  const tokens = row.Term.toLowerCase().split(/[\s\-–]+/).map(w => w.replace(/[^a-z']/g, '')).filter(Boolean);
  row.Phonetic = tokens.every(w => phones[w]) ? tokens.map(w => phones[w]).join(' ') : '';
  const key = normalise(row.Term); const item = terms.get(key) ?? { term: row.Term, definitions: new Set(), examples: new Set(), topics: new Set(), rows: 0 };
  item.definitions.add(row.Definition); item.examples.add(row.Example); item.topics.add(row.Topic); item.rows++; terms.set(key, item);
}
const stats = {
  source: origin + '/', appUrl, appSha256: appHash, inspectedAt: new Date().toISOString(), topicCount: topics.length,
  rows: all.length, distinctNormalisedTerms: terms.size, repeatedRowsAcrossDecks: all.length - terms.size,
  blankDefinitions: all.filter(r => !r.Definition.trim()).length, blankExamples: all.filter(r => !r.Example.trim()).length,
  uniqueExamples: new Set(all.map(r => r.Example)).size, termsWithMultipleDefinitionStrings: [...terms.values()].filter(t => t.definitions.size > 1).map(t => ({ term: t.term, definitionVariants: t.definitions.size })),
  termsInEveryDeck: [...terms.values()].filter(t => t.topics.size === topics.length).length,
  phonetics: { dictionaryTokens: Object.keys(phones).length, blankPhoneticRows: all.filter(r => !r.Phonetic).length, method: 'Reproduced token-dictionary joining; coverage, NOT pronunciation validation' },
  exports, pageErrors: errors, nonGetRequests: network,
  boundary: 'Complete current public CSV inventory, not licence clearance or teacher validation. Raw definitions/examples/IPA are research artifacts only; no production import.'
};
fs.writeFileSync(path.join(output, 'all-rows.json'), JSON.stringify(all, null, 2));
fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(stats, null, 2) + '\n');
console.log(JSON.stringify({ output, ...stats }, null, 2));
