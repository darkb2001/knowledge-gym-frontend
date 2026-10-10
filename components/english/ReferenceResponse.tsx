import { useLocale } from "@/components/locale";
import { countEnglishWords, type EnglishReferenceResponse, type EnglishSkill } from "@/lib/english";

/** Render plain text, never HTML/markdown; mounted only inside submitted feedback. */
export function ReferenceResponse({ value, skill }: { value: EnglishReferenceResponse; skill: EnglishSkill }) {
  const { locale } = useLocale();
  const c = (vi: string, en: string) => locale === "vi" ? vi : en;
  return <section className="space-y-5 border-t border-line pt-5" aria-labelledby="english-reference-title">
    <div><h4 id="english-reference-title" className="text-xl font-semibold text-strong">{skill === "WRITING" ? c("Bài viết mẫu tham khảo", "Reference writing response") : c("Câu trả lời mẫu tham khảo", "Reference speaking response")}</h4><p className="mt-2 max-w-prose text-sm leading-relaxed text-subtle">{c("Bài mẫu do Knowledge Gym biên soạn để đối chiếu cách triển khai. Không phải đáp án chính thức hoặc bài đã được giám khảo xác nhận mức điểm. Có nhiều cách trả lời tốt.", "An original Knowledge Gym model for comparing how ideas are developed. Not an official answer or an examiner-certified score. Other good responses are possible.")}</p></div>
    <div className="max-w-prose space-y-4 text-base leading-loose text-body" lang="en"><p className="font-semibold text-strong">{value.title}</p>{value.text.trim().split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>
    {skill === "WRITING" && <p className="text-sm text-subtle">{countEnglishWords(value.text)} {c("từ trong bài mẫu", "words in the reference response")}</p>}
    {value.notes.length > 0 && <div className="max-w-prose space-y-3 border-t border-line pt-4"><h5 className="font-semibold text-strong">{c("Đọc mẫu để học điều gì?", "What to notice in the model")}</h5><ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-body">{value.notes.map((note, index) => <li key={index}>{locale === "vi" ? note.vi : note.en}</li>)}</ul></div>}
    <p className="max-w-prose text-sm leading-relaxed text-subtle">{skill === "WRITING" ? c("So với bài của bạn: có đủ yêu cầu đề không, mỗi đoạn có ý chính không, ví dụ có hỗ trợ lập luận không? Chọn một đoạn để viết lại bằng cách diễn đạt của riêng bạn.", "Compare your response: are all task points covered, does each paragraph have a main idea, and do examples support the argument? Rewrite one paragraph in your own words.") : c("Nghe lại bản ghi của bạn: đã trả lời trực tiếp, đưa lý do và ví dụ chưa? Dùng dàn ý ngắn để nói lại; đừng đọc thuộc bài mẫu.", "Replay your recording: did you answer directly and add reasons and examples? Speak again from short notes rather than memorising the model.")}</p>
  </section>;
}
