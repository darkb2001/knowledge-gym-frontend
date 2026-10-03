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
