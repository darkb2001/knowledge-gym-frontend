import { useRef, useState } from "react";
import { CodeIcon, FlowArrowIcon, PlusIcon } from "@phosphor-icons/react";
import { LearningContent } from "../LearningContent";
import { AdminField, useAdminCopy } from "./shared";
import { codeBlock, flowBlock } from "@/lib/content-blocks";

export function ContentEditor({ value, onChange, disabled = false, label }: { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }) {
  const { c } = useAdminCopy();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [block, setBlock] = useState<"code" | "diagram" | null>(null);
  const [source, setSource] = useState("");
  const [language, setLanguage] = useState("java");
  const [view, setView] = useState<"edit" | "preview" | "split">("split");
  function insert() {
    if (!source.trim()) return;
    const markup = block === "code" ? codeBlock(source, language) : flowBlock(source.split("\n").map(line => line.trim()).filter(Boolean));
    const start = ref.current?.selectionStart ?? value.length;
    const end = ref.current?.selectionEnd ?? start;
    onChange(`${value.slice(0, start)}\n${markup}\n${value.slice(end)}`);
    setBlock(null); setSource("");
    ref.current?.focus();
  }
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-base">{label ?? c("Nội dung đáp án", "Answer content")}</h3>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" aria-label={c("Chế độ biên tập", "Editor view")}>
        {(["edit", "preview", "split"] as const).map(mode => <button type="button" key={mode} aria-pressed={mode === view} onClick={() => setView(mode)} className={`min-h-11 rounded-md px-3 text-xs font-medium ${mode === view ? "bg-surface text-accent" : "text-subtle hover:text-strong"}`}>{mode === "edit" ? c("Nhập HTML", "Edit HTML") : mode === "preview" ? c("Xem trước", "Preview") : c("Song song", "Side by side")}</button>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled} className="kg-secondary" onClick={() => { setBlock(block === "code" ? null : "code"); setSource(""); }}><CodeIcon size={18} aria-hidden />{c("Chèn code", "Insert code")}</button><button type="button" disabled={disabled} className="kg-secondary" onClick={() => { setBlock(block === "diagram" ? null : "diagram"); setSource(""); }}><FlowArrowIcon size={18} aria-hidden />{c("Chèn sơ đồ", "Insert diagram")}</button></div>
    {block && <div className="space-y-3 rounded-xl border border-line bg-muted/40 p-4">
      {block === "code" && <AdminField label={c("Ngôn ngữ code", "Code language")}><select className="kg-field" value={language} onChange={event => setLanguage(event.target.value)}>{["java", "javascript", "typescript", "python", "sql", "json", "bash", "xml", "css", "plaintext"].map(lang => <option key={lang}>{lang}</option>)}</select></AdminField>}
      <AdminField label={block === "code" ? c("Đoạn code", "Code snippet") : c("Các bước trong sơ đồ", "Diagram steps")} hint={block === "diagram" ? c("Mỗi dòng là một bước. Nội dung được escape an toàn trước khi chèn.", "One step per line. Labels are safely escaped before insertion.") : undefined}><textarea className="kg-field min-h-32 font-mono text-sm" value={source} onChange={event => setSource(event.target.value)} /></AdminField>
      <button type="button" disabled={disabled || !source.trim()} className="kg-secondary" onClick={insert}><PlusIcon size={17} aria-hidden />{c("Chèn vào nội dung", "Insert into content")}</button>
    </div>}
    <div className={`grid min-w-0 gap-5 ${view === "split" ? "xl:grid-cols-2" : ""}`}>
      {view !== "preview" && <AdminField label={c("Mã HTML", "HTML source")} hint={c("HTML được làm sạch khi xem trước và tại backend khi lưu. Code và sơ đồ dùng cùng định dạng với nội dung học.", "Preview and backend saves sanitize HTML. Code and diagrams use the learning content format.")}><textarea ref={ref} disabled={disabled} className="kg-field min-h-80 resize-y font-mono text-sm leading-6" value={value} onChange={event => onChange(event.target.value)} spellCheck={false} /></AdminField>}
      {view !== "edit" && <div className="min-w-0"><p className="mb-2 text-sm font-medium text-strong">{c("Xem trước cho người học", "Learner preview")}</p><div role="region" tabIndex={0} aria-label={c("Bản xem trước đáp án", "Answer preview")} className="max-h-[36rem] min-h-80 overflow-auto rounded-xl border border-line bg-canvas/35 p-5">{value.trim() ? <LearningContent html={value} /> : <p className="py-12 text-center text-sm leading-relaxed text-subtle">{c("Nhập nội dung hoặc chèn một khối code, sơ đồ để xem trước tại đây.", "Write content or insert a code block or diagram to preview it here.")}</p>}</div></div>}
    </div>
  </section>;
}
