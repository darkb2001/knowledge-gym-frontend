/* Build/test-only original authored bank. NEVER import this fixture into application code or serve it as the exercise API. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const source = path.resolve(process.env.KG_ENGLISH_CATALOG_SNAPSHOT || '../knowledge-gym/kg-presentation/build/reports/english/catalog-fixture.json');
const text = fs.readFileSync(source, 'utf8');
let rows;
try { rows = JSON.parse(text); } catch { throw new Error('Compiled English catalog fixture is not valid JSON'); }
if (rows.length !== 47 || new Set(rows.map(e => e.id)).size !== 47) throw new Error('Expected the compiled 47-entry original catalog');
const output = '.fixtures/english/catalog.json';
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(rows, null, 2) + '\n');
fs.writeFileSync('.fixtures/english/provenance.json', JSON.stringify({ source: 'Compiled backend EnglishCatalogEvidenceTest; original Knowledge Gym content; not an official exam bank. Test/authoring only; includes keys/models that must never be exposed in draft/catalog HTTP fixtures.', sha256: createHash('sha256').update(fs.readFileSync(output)).digest('hex'), entries: rows.length }, null, 2) + '\n');
console.log(`Synced ${rows.length} authored test entries to ${output}`);
