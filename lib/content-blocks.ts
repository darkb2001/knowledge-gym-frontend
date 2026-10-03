export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export function codeBlock(source: string, language: string) {
  const safeLanguage = /^[a-z0-9#+-]{1,24}$/i.test(language) ? language : "plaintext";
  return `<pre><code class="language-${safeLanguage}">${escapeHtml(source)}</code></pre>`;
}
export function flowBlock(labels: string[]) {
  return `<div class="flow-diagram"><div class="flow-row">${labels.map(label => `<div class="flow-node">${escapeHtml(label)}</div>`).join('<span class="flow-arrow">→</span>')}</div></div>`;
}
