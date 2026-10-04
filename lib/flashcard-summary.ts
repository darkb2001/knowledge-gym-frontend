/**
 * Rút gọn đáp án dài thành mặt sau flashcard.
 *
 * Flashcard dùng để tự kiểm tra trí nhớ: dán nguyên bài giảng vào mặt sau thì người học đọc lại tài
 * liệu thay vì tự nhớ. Vì vậy mặt sau chỉ giữ phần tóm tắt, còn nội dung đầy đủ để ở link mở tab mới.
 */

/** Thẻ mở/đóng khối → xuống dòng để không dính chữ của hai đoạn khác nhau. */
const BLOCK_BOUNDARY = /<\/(p|div|li|h[1-6]|tr|section|article|blockquote|pre|table|ul|ol)\s*>/gi;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
};

/** HTML (đã sanitize ở BE) → chữ thuần, gộp khoảng trắng. */
export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(BLOCK_BOUNDARY, "\n")
    .replace(/<[^>]*>/g, " ");
  text = text.replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity);
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

export const DEFAULT_SUMMARY_CHARS = 220;

/**
 * Tóm tắt `answerHtml`: ưu tiên cắt ở ranh giới câu cho dễ đọc; nếu không có thì cắt ở ranh giới từ.
 * Kết quả luôn ≤ `maxChars` ký tự (chưa tính dấu "…" báo hiệu còn nội dung).
 */
export function summarizeAnswer(
  html: string | null | undefined,
  maxChars = DEFAULT_SUMMARY_CHARS,
): string {
  const text = htmlToPlainText(html ?? "").replace(/\n/g, " ");
  if (text.length <= maxChars) return text;

  const window = text.slice(0, maxChars + 1);
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  if (sentenceEnd >= maxChars * 0.5) {
    return `${window.slice(0, sentenceEnd + 1).trim()} …`;
  }
  const lastSpace = window.lastIndexOf(" ");
  const end = lastSpace > maxChars * 0.5 ? lastSpace : maxChars;
  return `${window.slice(0, end).trim().replace(/[,;:.]+$/, "")}…`;
}
