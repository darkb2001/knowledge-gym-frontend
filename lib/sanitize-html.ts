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
  // Inline SVG diagrams. Without these the whole <svg> is dropped and the figure
  // renders as an empty frame, which is how the Archify diagrams used to disappear.
  "svg", "g", "defs", "title", "desc", "rect", "circle", "ellipse", "line",
  "polyline", "polygon", "path", "text", "tspan", "marker", "pattern",
];

/**
 * Presentation/data attributes the inlined diagrams need. `class` drives every
 * colour rule and the `data-*` names are read by the reader toolbar. SVG geometry
 * attributes stay camelCase exactly as authored (`viewBox`, `refX`, `markerWidth`).
 *
 * `style` needs special handling: it is added to `ALLOWED_ATTR` so DOMPurify keeps it, then
 * `sanitizeDiagramStyles` strips it back off every element except the SVG geometry tags that
 * carry Archify's `style="--step:N"` stagger delay. Setting a fixed-position `style` on a
 * `<div>` is a deface vector, so it must not survive.
 *
 * `<style>` is deliberately not allowed: a stylesheet inside answer HTML could
 * restyle the whole page, so diagram colours come from `app/globals.css` instead.
 */
const DIAGRAM_ATTR = [
  "id", "role", "lang", "tabindex", "style",
  "aria-hidden", "aria-label", "aria-labelledby", "aria-pressed",
  "viewBox", "transform", "fill", "stroke", "stroke-width", "stroke-linecap",
  "stroke-linejoin", "stroke-dasharray", "marker-end", "pointer-events",
  "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "x1", "y1", "x2", "y2",
  "d", "points", "font-size", "font-weight", "text-anchor", "writing-mode",
  "markerWidth", "markerHeight", "refX", "refY", "orient", "patternUnits",
  "data-preset", "data-quality-profile", "data-reader-fit", "data-reader-min-text",
  "data-reader-primary-text", "data-sequence-column-fit", "data-layout-contract",
  "data-detail", "data-detail-anchor", "data-node-label", "data-node-id",
  "data-node-kind", "data-node-context", "data-node-sublabel", "data-node-tag",
  "data-edge-from", "data-edge-to", "data-edge-key", "data-edge-id",
  "data-edge-label", "data-edge-role", "data-graph-role",
  "data-composition-points", "data-composition-crossover",
  "data-composition-independent", "data-composition-routing",
  "data-composition-frame-kind", "data-composition-frame-id",
  "data-composition-frame-label", "data-composition-edge-from",
  "data-composition-edge-to", "data-composition-edge-id",
  "data-legend", "data-legend-kind", "data-legend-label", "data-legend-x",
  "data-legend-width", "data-legend-baseline", "data-legend-semantic-kind",
  "data-legend-bridge", "data-segment-id", "data-lifecycle-initial-marker",
  "data-boundary-label",
];

/** SVG geometry tags allowed to keep `style` (Archify's `--step:N` stagger delay). */
const DIAGRAM_STYLE_TAGS = new Set(["g", "rect", "circle", "ellipse", "line", "polygon", "path"]);

const ALLOWED_ATTR = ["class", "href", "title", "colspan", "rowspan", "src", "alt", "loading", ...DIAGRAM_ATTR];

/**
 * Narrow `style` back to the one construct the diagrams use. Runs on the sanitized DOM, so
 * every other `style` (a fixed-position `<div>`, `color`, `background-image`, …) is removed
 * even though it passed DOMPurify's attribute allowlist.
 */
function sanitizeDiagramStyles(root: HTMLElement) {
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    const tag = element.tagName.toLowerCase().replace(/^svg:/, "");
    const value = (element.getAttribute("style") ?? "").trim();
    // Only the exact stagger declaration survives; anything else is dropped.
    if (DIAGRAM_STYLE_TAGS.has(tag) && /^--step\s*:\s*\d+$/.test(value)) continue;
    element.removeAttribute("style");
  }
}

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
  // Article images must be externally verifiable HTTPS resources; drop relative,
  // data:, blob: and protocol-relative image URLs.
  for (const image of Array.from(holder.querySelectorAll("img"))) {
    const src = image.getAttribute("src") ?? "";
    if (!/^https:\/\//i.test(src)) image.remove();
  }
  decorateTables(holder);
  sanitizeDiagramStyles(holder);
  return holder.innerHTML;
}
