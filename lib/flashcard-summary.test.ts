import { describe, expect, it } from "vitest";
import { DEFAULT_SUMMARY_CHARS, htmlToPlainText, summarizeAnswer } from "./flashcard-summary";

describe("htmlToPlainText", () => {
  it("bỏ thẻ và gộp khoảng trắng", () => {
    const html = "<p>Bộ nhớ đệm   <strong>đọc</strong> nhanh hơn</p>\n<p>nhờ dữ liệu nằm gần CPU.</p>";
    expect(htmlToPlainText(html)).toBe("Bộ nhớ đệm đọc nhanh hơn\nnhờ dữ liệu nằm gần CPU.");
  });

  it("bỏ script/style và giải mã entity", () => {
    const html = '<style>.a{color:red}</style><p>A &amp; B &lt;tag&gt; &quot;x&quot;</p><script>hack()</script>';
    expect(htmlToPlainText(html)).toBe('A & B <tag> "x"');
  });

  it("giữ xuống dòng giữa các mục danh sách", () => {
    expect(htmlToPlainText("<ul><li>Một</li><li>Hai</li></ul>")).toBe("Một\nHai");
  });
});

describe("summarizeAnswer", () => {
  it("trả nguyên văn khi đã ngắn", () => {
    expect(summarizeAnswer("<p>Index B-tree giúp tìm kiếm O(log n).</p>")).toBe(
      "Index B-tree giúp tìm kiếm O(log n).",
    );
  });

  it("cắt ở ranh giới câu khi có thể", () => {
    const long = `<p>${"Câu một rất dài về bộ nhớ đệm và CPU cache. ".repeat(12)}</p>`;
    const out = summarizeAnswer(long, 200);
    expect(out.length).toBeLessThanOrEqual(206);
    expect(out.endsWith("…")).toBe(true);
    expect(out.includes("Câu một rất dài")).toBe(true);
  });

  it("cắt ở ranh giới từ khi không có dấu câu", () => {
    const long = "<p>" + "từ ".repeat(200) + "</p>";
    const out = summarizeAnswer(long, 100);
    expect(out.length).toBeLessThanOrEqual(101);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("  ");
  });

  it("không trả về khối nhiều dòng dù đáp án có nhiều đoạn", () => {
    const html = Array.from({ length: 40 }, (_, i) => `<p>Đoạn ${i} nội dung dài dòng.</p>`).join("");
    const out = summarizeAnswer(html);
    expect(out).not.toContain("\n");
    expect(out.length).toBeLessThanOrEqual(DEFAULT_SUMMARY_CHARS + 3);
  });

  it("an toàn với đầu vào rỗng", () => {
    expect(summarizeAnswer(null)).toBe("");
    expect(summarizeAnswer("")).toBe("");
  });
});
