import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminField } from "./shared";

describe("admin field accessibility", () => {
  it("associates labels and hints even with whitespace and adjacent messages", () => {
    const html = renderToStaticMarkup(<AdminField label="Reason" hint="Required"> <textarea id="reason" /><p role="alert">Keep this message</p></AdminField>);
    expect(html).toContain('for="reason"');
    expect(html).toContain('aria-describedby="reason-hint"');
    expect(html).toContain('id="reason-hint"');
    expect(html).toContain("Keep this message");
  });
  it("preserves an existing description and generates a control ID", () => {
    const html = renderToStaticMarkup(<AdminField label="Module" hint="Choose one"><select aria-describedby="existing"><option>Java</option></select></AdminField>);
    const id = html.match(/<label for="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`aria-describedby="existing ${id}-hint"`);
  });
});
