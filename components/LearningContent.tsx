"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLocale } from "./locale";
import { sanitizeAnswerHtml } from "@/lib/sanitize-html";

// Load the small language set only when a reading surface actually has code.
async function codeHighlighter() {
  const [core, java, javascript, typescript, json, sql, python, bash, xml, css] = await Promise.all([
    import("highlight.js/lib/core"), import("highlight.js/lib/languages/java"),
    import("highlight.js/lib/languages/javascript"), import("highlight.js/lib/languages/typescript"),
    import("highlight.js/lib/languages/json"), import("highlight.js/lib/languages/sql"),
    import("highlight.js/lib/languages/python"), import("highlight.js/lib/languages/bash"),
    import("highlight.js/lib/languages/xml"), import("highlight.js/lib/languages/css"),
  ]);
  const hl = core.default;
  for (const [name, language] of Object.entries({ java: java.default, javascript: javascript.default, typescript: typescript.default, json: json.default, sql: sql.default, python: python.default, bash: bash.default, xml: xml.default, css: css.default })) hl.registerLanguage(name, language);
  return hl;
}
let highlighter: ReturnType<typeof codeHighlighter> | undefined;

export function LearningContent({ html, className = "" }: { html: string; className?: string }) {
  const { locale } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const safe = useMemo(() => sanitizeAnswerHtml(html), [html]);
  // A stable prop keeps React from wiping DOM-enhanced code on unrelated renders.
  const markup = useMemo(() => ({ __html: safe }), [safe]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    const codeBlocks = [...root.querySelectorAll("pre")];
    if (!codeBlocks.length) return;
    for (const pre of codeBlocks) {
      pre.tabIndex = 0;
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", locale === "en" ? "Code snippet" : "Đoạn mã nguồn");
    }
    const ready = highlighter ??= codeHighlighter();
    void ready.then(hl => {
      if (cancelled) return;
      for (const pre of codeBlocks) {
        const code = pre.querySelector("code");
        const source = code?.textContent ?? pre.textContent ?? "";
        const language = code?.className.match(/language-([a-z0-9#+-]+)/i)?.[1]?.toLowerCase();
        if (code && language && hl.getLanguage(language) && source.length <= 20000) {
          // highlight.js escapes source text; only its generated span markup is inserted.
          code.innerHTML = sanitizeAnswerHtml(hl.highlight(source, { language, ignoreIllegals: true }).value);
        }
        if (pre.previousElementSibling?.classList.contains("kg-code-toolbar")) pre.previousElementSibling.remove();
        const tools = document.createElement("div"); tools.className = "kg-code-toolbar";
        const caption = document.createElement("span"); caption.textContent = language ?? (locale === "en" ? "Code" : "Mã nguồn");
        const button = document.createElement("button"); button.type = "button";
        button.textContent = locale === "en" ? "Copy code" : "Sao chép code";
        button.setAttribute("aria-live", "polite");
        button.onclick = async event => {
          event.stopPropagation();
          try { await navigator.clipboard.writeText(source); button.textContent = locale === "en" ? "Copied" : "Đã sao chép"; }
          catch { button.textContent = locale === "en" ? "Copy unavailable" : "Không sao chép được"; }
        };
        tools.append(caption, button); pre.before(tools);
      }
    }).catch(() => { /* Plain, sanitized code remains readable if the optional chunk fails. */ });
    return () => { cancelled = true; };
  }, [safe, locale]);
  return <div ref={ref} className={`answer-html ${className}`} dangerouslySetInnerHTML={markup} />;
}
