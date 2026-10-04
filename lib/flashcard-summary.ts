/**
 * Lấy **đáp án trọng tâm** cho mặt sau flashcard.
 *
 * `answer_html` là cả bài giảng (sơ đồ luồng, bảng so sánh, ví dụ code, phần đào sâu) dài
 * 3.500–9.200 ký tự. Dán hết vào mặt sau thì người học đọc lại tài liệu thay vì tự nhớ — nhưng cắt
 * ngang theo số ký tự cũng sai: mặt sau phải là **câu trả lời thật**, chỉ là bản ngắn.
 *
 * Trong dữ liệu, mỗi bài mở đầu bằng khối `<div class="ans-block">` (nhãn What/Why + một đoạn `<p>`
 * trả lời thẳng câu hỏi), rồi mới tới phần mở rộng. Đo trên 289 câu prod: đoạn đó dài trung vị 173
 * ký tự (p90 = 360, dài nhất 664) — đúng độ dài một flashcard. Nên lấy trọn đoạn đầu của khối
 * `ans-block`; chỉ cắt ở ranh giới câu khi gặp nội dung bất thường vượt `MAX_KEY_CHARS`.
 */

/** Trần an toàn — nội dung hiện tại (dài nhất 664 ký tự) không bao giờ chạm mức này. */
export const MAX_KEY_CHARS = 900;

const ANS_BLOCK = /class="ans-block"/i;
const ALL_PARAS = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
/** Cửa sổ đủ rộng để chứa nhãn (What/Why/How) rồi tới đoạn trả lời ngay sau khối `ans-block`. */
const WINDOW = 4000;

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
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/[a-z][^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  text = text.replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity);
  return text.replace(/[^\S\n]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Đoạn `<p>` đầu tiên không phải nhãn (`ans-label`) và không rỗng. */
function firstParagraph(scope: string): string | null {
  ALL_PARAS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ALL_PARAS.exec(scope)) !== null) {
    if (/ans-label/i.test(match[1])) continue;
    const text = htmlToPlainText(match[2]);
    if (text) return text;
  }
  return null;
}

/** Chỉ dùng khi đoạn trả lời vượt trần: cắt ở ranh giới câu, không cắt giữa câu. */
function cutAtSentence(text: string, maxChars: number): string {
  const window = text.slice(0, maxChars + 1);
  const boundary = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf("; "),
  );
  if (boundary >= maxChars * 0.6) return `${window.slice(0, boundary + 1).trim()} …`;
  const space = window.lastIndexOf(" ");
  return `${window.slice(0, space > 0 ? space : maxChars).trim()}…`;
}

/**
 * Câu trả lời trọng tâm: đoạn đầu của khối `ans-block` (nhãn có thể là `div` hoặc `span`).
 * Không có khối đó → đoạn `<p>` đầu tiên của bài → toàn bộ text.
 */
export function extractKeyAnswer(
  html: string | null | undefined,
  maxChars: number = MAX_KEY_CHARS,
): string {
  if (!html) return "";
  const start = html.search(ANS_BLOCK);
  const scope = start >= 0 ? html.slice(start, start + WINDOW) : html;
  const answer = firstParagraph(scope) ?? firstParagraph(html) ?? htmlToPlainText(html);
  if (answer.length <= maxChars) return answer;
  return cutAtSentence(answer, maxChars);
}
