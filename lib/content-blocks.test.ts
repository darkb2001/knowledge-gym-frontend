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
});
