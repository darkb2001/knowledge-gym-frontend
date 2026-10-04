import { describe, expect, it } from "vitest";
import { MAX_KEY_CHARS, extractKeyAnswer, htmlToPlainText } from "./flashcard-summary";

/** Mẫu thật của prod: khối `ans-block` (nhãn What) rồi mới tới phần mở rộng dài dòng. */
const REAL_ANSWER = [
  '<div class="ans-block">',
  ' <div class="ans-label">',
  "  What",
  " </div>",
  " <p><strong>@Transactional</strong> khai báo transaction boundary trên method/class. "
    + "Spring tạo <strong>AOP proxy</strong> bọc bean: proxy mở TX trước method, commit/rollback sau.</p>",
  "</div>",
  '<div class="flow-diagram"><div class="flow-step">Caller</div><div class="flow-step">Proxy</div></div>',
  '<table class="feature-table"><thead><tr><th>REQUIRES_NEW</th></tr></thead>'
    + "<tbody><tr><td>EnableTransactionManagement tắt TX ngoài</td></tr></tbody></table>",
  '<div class="ans-block"><div class="ans-label">Why</div><p>Vì proxy kiểm soát ranh giới giao dịch.</p></div>',
].join("\n");

describe("htmlToPlainText", () => {
  it("bỏ thẻ và gộp khoảng trắng", () => {
    expect(htmlToPlainText("<p>Bộ nhớ đệm   <strong>đọc</strong> nhanh hơn</p>")).toBe(
      "Bộ nhớ đệm đọc nhanh hơn",
    );
  });

  it("bỏ script/style và giải mã entity", () => {
    const html = '<style>.a{color:red}</style><p>A &amp; B &lt;tag&gt; &quot;x&quot;</p><script>hack()</script>';
    expect(htmlToPlainText(html)).toBe('A & B <tag> "x"');
  });
});

describe("extractKeyAnswer", () => {
  it("lấy nguyên đoạn trả lời trong khối ans-block, không lấy sơ đồ/bảng phía sau", () => {
    const out = extractKeyAnswer(REAL_ANSWER);
    expect(out).toBe(
      "@Transactional khai báo transaction boundary trên method/class. "
        + "Spring tạo AOP proxy bọc bean: proxy mở TX trước method, commit/rollback sau.",
    );
    expect(out).not.toContain("REQUIRES_NEW");
    expect(out).not.toContain("EnableTransactionManagement");
    expect(out).not.toContain("Caller");
    expect(out.endsWith("…")).toBe(false);
  });

  it("đọc được cả biến thể nhãn <span> và bỏ nhãn khỏi đáp án", () => {
    const html = '<div class="ans-block"><span class="ans-label">What</span>'
      + "<p>URL Shortener nhận URL dài, sinh short code, redirect 301/302.</p></div><p>Đào sâu…</p>";
    const out = extractKeyAnswer(html);
    expect(out).toBe("URL Shortener nhận URL dài, sinh short code, redirect 301/302.");
    expect(out).not.toContain("What");
  });

  it("bỏ qua nhãn khi nhãn cũng là thẻ <p>", () => {
    const html = '<div class="ans-block"><p class="ans-label">Trả lời ngắn</p>'
      + "<p>Nến tảng của flashcard là câu trả lời trọng tâm.</p></div>";
    expect(extractKeyAnswer(html)).toBe("Nến tảng của flashcard là câu trả lời trọng tâm.");
  });

  it("không có ans-block thì lấy đoạn đầu tiên của bài", () => {
    const html = "<p>Đoạn mở đầu trả lời thẳng câu hỏi.</p><p>Phần mở rộng rất dài ở đây.</p>";
    expect(extractKeyAnswer(html)).toBe("Đoạn mở đầu trả lời thẳng câu hỏi.");
  });

  it("giữ trọn đáp án dài (600+ ký tự) mà không cắt — đây là ca bị coi là 'cắt nửa vời'", () => {
    const long = `Nội dung ${"chi tiết đầy đủ của câu trả lời ".repeat(18)}`.trim();
    const html = `<div class="ans-block"><div class="ans-label">What</div><p>${long}</p></div><p>Đào sâu.</p>`;
    const out = extractKeyAnswer(html);
    expect(out).toBe(long);
    expect(out.length).toBeGreaterThan(400);
    expect(out.length).toBeLessThanOrEqual(MAX_KEY_CHARS);
    expect(out.endsWith("…")).toBe(false);
  });

  it("chỉ cắt ở ranh giới câu khi vượt trần an toàn", () => {
    const monster = `${"Một câu dài về JVM và bộ nhớ heap. ".repeat(60)}`.trim();
    const out = extractKeyAnswer(`<p>${monster}</p>`);
    expect(out.length).toBeLessThanOrEqual(MAX_KEY_CHARS + 2);
    expect(out.endsWith("…")).toBe(true);
    expect(out.startsWith("Một câu dài")).toBe(true);
  });

  it("đáp án một dòng, không dính xuống dòng của khối khác", () => {
    const out = extractKeyAnswer(REAL_ANSWER);
    expect(out).not.toContain("\n");
  });

  it("an toàn với đầu vào rỗng", () => {
    expect(extractKeyAnswer(null)).toBe("");
    expect(extractKeyAnswer("")).toBe("");
    expect(extractKeyAnswer(undefined)).toBe("");
  });
});
