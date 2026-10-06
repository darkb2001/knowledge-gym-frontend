import DOMPurify from "isomorphic-dompurify";

/**
 * Defense-in-depth for `answerHtml` rendered via `dangerouslySetInnerHTML`.
 * Server already runs Jsoup Safelist; this strips anything that slipped through
 * (legacy rows, bug in sanitizer, admin bypass). Keep tags/classes that FE styles.
 */
const ALLOWED_TAGS = [
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "code", "pre",
  "ul", "ol", "li", "blockquote", "small", "sup", "sub",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "dl", "dt", "dd", "span", "div", "figure", "figcaption", "a", "img",
];

const ALLOWED_ATTR = ["class", "href", "title", "colspan", "rowspan", "src", "alt", "loading"];

/**
 * Tables become unreadable on a phone once they have 4-5 columns, so mark them for a
 * label/value card layout (`app/globals.css`, <=639px): every body cell gets the text
 * of its column header as `data-label`, the first cell of a row becomes the card
 * title. Runs on the sanitized DOM, so the labels are sanitized text too.
 */
function decorateTables(root: HTMLElement) {
  for (const table of Array.from(root.querySelectorAll("table"))) {
    table.setAttribute("data-kg-table", "");
    let headRow: Element | null = table.querySelector("thead tr");
    if (!headRow) {
      // No <thead>: a leading row made only of <th> is the header row.
      const first = table.querySelector("tr");
      if (first && first.querySelector("th") && !first.querySelector("td")) {
        headRow = first;
        first.setAttribute("data-kg-head-row", "");
      }
    }
    const labels = headRow
      ? Array.from(headRow.children).map(cell => (cell.textContent ?? "").replace(/\s+/g, " ").trim())
      : [];
    for (const row of Array.from(table.querySelectorAll("tr"))) {
      if (row === headRow) continue;
      // Column cursor honours colspan so labels stay aligned with their column.
      let column = 0;
      for (const cell of Array.from(row.children)) {
        const span = Math.max(1, Number(cell.getAttribute("colspan") ?? 1) || 1);
        if (cell.tagName === "TD") {
          const label = labels.slice(column, column + span).filter(Boolean).join(" \u00b7 ");
          if (label) cell.setAttribute("data-label", label);
        }
        column += span;
      }
      row.children[0]?.setAttribute("data-kg-title", "");
    }
  }
}

export function sanitizeAnswerHtml(html: string): string {
  if (!html) return "";
  // RETURN_DOM_FRAGMENT (not RETURN_DOM, which hands back the wrapper <body>) keeps the
  // returned markup wrapper-free, which matters for React's dangerouslySetInnerHTML.
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    RETURN_DOM_FRAGMENT: true,
  }) as unknown as DocumentFragment;
  const doc = fragment?.ownerDocument;
  if (!doc) return html;
  const holder = doc.createElement("div");
  holder.appendChild(fragment);
  decorateTables(holder);
  return holder.innerHTML;
}
