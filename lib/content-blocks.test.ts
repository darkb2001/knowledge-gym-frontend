import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { codeBlock, flowBlock } from "./content-blocks";
import { sanitizeAnswerHtml } from "./sanitize-html";

describe("safe authoring blocks", () => {
  it("escapes code and limits the language attribute", () => {
    const html = codeBlock('<script>alert("x")</script>', 'java" onclick="alert(1)');
    expect(html).toContain('class="language-plaintext"');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onclick");
    expect(html).toContain("&lt;script&gt;");
  });
  it("keeps code language classes through sanitization", () => {
    expect(sanitizeAnswerHtml(codeBlock("class Demo {}", "java"))).toContain('class="language-java"');
  });
  it("escapes diagram labels instead of injecting markup", () => {
    const html = flowBlock(['<img src=x onerror="alert(1)">', "Queue & Worker"]);
    expect(html).not.toContain("<img");
    expect(html).toContain("Queue &amp; Worker");
    expect(sanitizeAnswerHtml(html)).toContain('class="flow-node"');
  });
  it("strips executable markup while retaining reading blocks", () => {
    const html = sanitizeAnswerHtml('<script>alert(1)</script><p onclick="alert(1)">Text</p><a href="javascript:alert(1)">Link</a><pre><code>safe</code></pre>');
    expect(html).not.toMatch(/<script|onclick|href="javascript:/);
    expect(html).toContain("<pre><code>safe</code></pre>");
  });
});

describe("mobile table cards", () => {
  it("returns wrapper-free markup for dangerouslySetInnerHTML", () => {
    expect(sanitizeAnswerHtml("<p>Text</p>")).toBe("<p>Text</p>");
    expect(sanitizeAnswerHtml("<p>Text</p>")).not.toMatch(/<body|<html/);
  });

  const table = [
    '<table class="feature-table"><thead><tr><th>Method</th><th>Giữ monitor lock?</th></tr></thead>',
    "<tbody><tr><td><code>wait()</code></td><td>Nhả lock khi vào wait-set</td></tr>",
    "<tr><td><code>sleep(ms)</code></td><td>Giữ lock nếu trong synchronized</td></tr></tbody></table>",
  ].join("");

  it("labels every body cell with its column header", () => {
    const html = sanitizeAnswerHtml(table);
    expect(html).toContain('data-kg-table');
    expect(html).toContain('data-label="Method"');
    expect(html).toContain('data-label="Giữ monitor lock?"');
    expect(html).toContain("data-kg-title");
  });

  it("treats a leading all-th row as the header when there is no thead", () => {
    const html = sanitizeAnswerHtml("<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>");
    expect(html).toContain("data-kg-head-row");
    expect(html).toContain('data-label="A"');
    expect(html).toContain('data-label="B"');
  });

  it("keeps labels aligned across colspan and strip markup from label text", () => {
    const html = sanitizeAnswerHtml(
      '<table><thead><tr><th>One</th><th>Two</th><th>Three</th></tr></thead>' +
      '<tbody><tr><td colspan="2"><b>x</b></td><td>y</td></tr></tbody></table>',
    );
    expect(html).toContain('data-label="One \u00b7 Two"');
    expect(html).toContain('data-label="Three"');
  });

  it("collapses markup inside a header into plain label text", () => {
    const html = sanitizeAnswerHtml('<table><thead><tr><th>Two <em>x</em></th></tr></thead><tbody><tr><td>v</td></tr></tbody></table>');
    expect(html).toContain('data-label="Two x"');
  });

  it("omits the label instead of emitting an empty one when a header had only stripped markup", () => {
    const html = sanitizeAnswerHtml('<table><thead><tr><th><img src=x></th></tr></thead><tbody><tr><td>v</td></tr></tbody></table>');
    expect(html).not.toContain("<img");
    expect(html).not.toContain('data-label=""');
  });

  it("ships the card layout that consumes those labels", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(css).toContain("table[data-kg-table]");
    expect(css).toContain("attr(data-label)");
    expect(css).toContain("overflow-wrap: break-word");
  });

  it("wraps long code lines on phones instead of clipping them", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const mobile = css.slice(css.indexOf("@media (max-width: 639px)"));
    // Dòng mã ~60 ký tự không vừa vùng đọc 272px; cuộn ngang giấu mất nửa dòng.
    expect(mobile).toContain("white-space: pre-wrap");
    expect(mobile).toContain("overflow-wrap: break-word");
    expect(mobile).toContain("overflow-x: hidden");
    // Chip code nội dòng không được cao/thấp hơn nhịp dòng của đoạn văn.
    expect(css).toContain("code:not(pre code):not(.code-block code) { @apply rounded bg-muted px-1.5 py-0.5 text-accent; line-height: inherit; }");
  });
});

describe("inline SVG diagrams", () => {
  // Diagram Archify là inline <svg>. Khi thiếu `svg` trong allowlist, DOMPurify xoá cả figure
  // và FE render ra khung rỗng — đo thật 2026-10-11: figure 17.907 ký tự còn 40 ký tự.
  const diagram = `
    <figure class="kg-diagram" id="kg-outbox" data-preset="classic">
      <svg viewBox="0 0 1040 660" role="img" aria-labelledby="t">
        <title id="t">Outbox</title>
        <defs><marker markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" class="m-default"/>
        </marker></defs>
        <rect x="1" y="2" width="40" height="20" rx="4" class="c-backend"/>
        <path d="M0 0 L10 10" marker-end="url(#m)" stroke-width="1.4"/>
        <text x="5" y="30" font-size="12" data-node-label="Outbox">Outbox</text>
        <g style="--step:7" data-node-id="n1"><circle cx="4" cy="4" r="2" style="--step:1"/></g>
      </svg>
      <figcaption>Outbox pattern</figcaption>
    </figure>`;

  it("keeps the SVG, its geometry attributes and its labels", () => {
    const html = sanitizeAnswerHtml(diagram);
    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 1040 660"');
    // camelCase SVG attributes must survive verbatim, not be lower-cased.
    expect(html).toContain("markerWidth");
    expect(html).toContain("refX");
    expect(html).toContain("marker-end");
    expect(html).toContain("c-backend");
    expect(html).toContain('data-node-label="Outbox"');
    expect(html).toContain("Outbox pattern");
  });

  it("keeps the --step stagger delay on SVG shapes only", () => {
    const html = sanitizeAnswerHtml(diagram);
    expect(html).toContain("--step:7");
    expect(html).toContain("--step:1");
  });

  it("strips every style that is not a --step declaration on a shape", () => {
    const html = sanitizeAnswerHtml(`
      <div class="ans-block" style="position:fixed;inset:0;z-index:9999">
        <p style="color:red">deface</p>
        <svg viewBox="0 0 9 9">
          <rect x="1" y="1" width="2" height="2" style="--step:2"/>
          <text style="--step:5">t</text>
        </svg>
      </div>`);
    expect(html).toContain("--step:2");
    expect(html).not.toContain("position:fixed");
    expect(html).not.toContain("z-index");
    expect(html).not.toContain("color:red");
    // `text` is not a recognized geometry tag, so its style is dropped too.
    expect(html).not.toContain("--step:5");
  });

  it("still strips script, iframe and inline event handlers inside SVG", () => {
    const html = sanitizeAnswerHtml(`
      <svg viewBox="0 0 10 10">
        <script>alert("xss")</script>
        <rect x="1" y="1" width="4" height="4" onclick="alert(1)"/>
        <a href="javascript:alert(1)"><text x="1" y="1">click</text></a>
      </svg>`);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<svg");
    expect(html).toContain("<rect");
  });

  it("ships the reader stylesheet that colours those diagrams", () => {
    const css = readFileSync(new URL("../app/archify-diagram.css", import.meta.url), "utf8");
    // Mọi rule phải scoped để nhiều diagram trong một bài không rò style lẫn nhau.
    expect(css).toContain(".answer-html .kg-diagram");
    expect(css).toContain(".answer-html .kg-diagram svg");
    // Token màu đổi sang palette Knowledge Gym, không còn theme sáng của docs/.
    expect(css).toContain("rgb(var(--kg-");
    expect(css).not.toContain("#f4f5f7");
    // Layout import: thiếu import thì CSS không bao giờ tới trang.
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    expect(layout).toContain('import "./archify-diagram.css"');
  });
});
