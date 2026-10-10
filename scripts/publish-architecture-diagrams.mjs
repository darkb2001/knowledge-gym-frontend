/* Copy only fully checked Archify artifacts; preserve their bytes and receipts. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/publish-architecture-diagrams.mjs <Archify output folder>");
const slugs = ["deployment", "layers", "async", "password", "google", "refresh", "sessions"];
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const publicDir = "public/blog/architecture-diagrams";
const evidenceDir = "docs/architecture/diagrams";
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(evidenceDir, { recursive: true });
const manifest = { generatedAt: new Date().toISOString(), evidence: "Repository snapshot; not live production telemetry", artifacts: [] };
// Preflight every receipt before publishing any artifact.
const artifacts = slugs.map(slug => {
  const reviewDir = path.join(input, `${slug}-source-review`);
  const receiptDir = fs.existsSync(reviewDir) ? reviewDir : input;
  const receipt = JSON.parse(fs.readFileSync(path.join(receiptDir, `${slug}.finalize-summary.json`), "utf8"));
  if (!receipt.ok || Object.values(receipt.gates).some(value => value !== "pass")) throw new Error(`${slug}: Archify gates did not all pass`);
  const html = fs.readFileSync(path.join(input, `${slug}.html`));
  const spec = fs.readFileSync(path.join(input, slug, "candidate.json"));
  if (digest(html) !== receipt.artifact.sha256 || digest(spec) !== receipt.specification.sha256) throw new Error(`${slug}: artifact/specification hash mismatch`);
  return { slug, receipt, receiptDir, html, spec };
});
for (const { slug, receipt, receiptDir, html, spec } of artifacts) {
  fs.writeFileSync(path.join(publicDir, `${slug}.html`), html);
  fs.writeFileSync(path.join(evidenceDir, `${slug}.json`), spec);
  fs.copyFileSync(path.join(receiptDir, `${slug}.finalize-summary.json`), path.join(evidenceDir, `${slug}.finalize-summary.json`));
  fs.copyFileSync(path.join(receiptDir, `${slug}.browser-check.json`), path.join(evidenceDir, `${slug}.browser-check.json`));
  manifest.artifacts.push({ slug, sha256: digest(html), bytes: html.length, gates: receipt.gates });
}
fs.writeFileSync("docs/architecture/diagram-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Published ${artifacts.length} checked diagrams (${artifacts.reduce((sum, a) => sum + a.html.length, 0)} bytes).`);
