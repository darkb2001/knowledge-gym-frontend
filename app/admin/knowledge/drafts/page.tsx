"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeading, RequireAdmin } from "@/components/ui";
import { AdminField, adminError, useAdminCopy } from "@/components/admin/shared";
import { useAdminCatalog } from "@/components/admin/use-catalog";
import { Pagination } from "@/components/Pagination";
import { LearningContent } from "@/components/LearningContent";
import { learningDraftPreview } from "@/lib/learning-draft-preview";
import { listLearningDrafts, reviewLearningDraft, materializeLearningDraft, rollbackLearningDraft, type LearningDraft } from "@/lib/admin-knowledge";

function Drafts() {
  const { c, locale } = useAdminCopy();
  const catalog = useAdminCatalog();
  const [items, setItems] = useState<LearningDraft[]>([]);
  const [selected, setSelected] = useState<LearningDraft | null>(null);
  const [status, setStatus] = useState<LearningDraft["status"]>("REVIEW");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [tick, setTick] = useState(0);
  const [reason, setReason] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(undefined);
    listLearningDrafts(status, page, controller.signal).then(result => {
      if (!controller.signal.aborted) { setItems(result.items); setPages(result.totalPages); }
    }).catch(e => { if (!controller.signal.aborted) setError(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, page, tick]);

  async function act(action: "APPROVED" | "REJECTED" | "materialize" | "rollback") {
    if (!selected || !reason.trim() || !confirmed || lock.current) return;
    lock.current = true; setBusy(true); setError(undefined); setMessage("");
    try {
      if (action === "materialize" || action === "rollback") {
        const result = action === "materialize"
          ? await materializeLearningDraft(selected.id, moduleId, reason)
          : await rollbackLearningDraft(selected.id, reason);
        setQuestionId(result.questionId);
        setMessage(action === "materialize"
          ? c("Đã tạo câu hỏi NHÁP. Chưa hiển thị cho người học.", "Draft question created. Not visible to learners yet.")
          : c("Đã ẩn câu hỏi. Lịch sử học được giữ nguyên.", "Question hidden. Learning history preserved."));
      } else {
        const updated = await reviewLearningDraft(selected.id, action, reason);
        setSelected(updated);
        setMessage(c("Đã lưu quyết định duyệt.", "Review decision saved."));
      }
      setReason(""); setConfirmed(false); setTick(t => t + 1);
    } catch (e) { setError(e); }
    finally { lock.current = false; setBusy(false); }
  }
  const ready = !busy && reason.trim().length > 0 && confirmed;
  const preview = selected ? learningDraftPreview(selected.payloadJson) : null;
  return <div className="flex min-h-0 flex-1 flex-col">
    <PageHeading title={c("Duyệt nội dung học AI", "Review AI learning content")} description={c("Duyệt, tạo câu hỏi nháp và thu hồi nội dung mà không xóa lịch sử học.", "Review, create draft questions and withdraw content without deleting learning history.")} />
    {error !== undefined && <p role="alert" className="mb-4 text-danger">{String(adminError(error, locale === "en"))} <button className="underline" disabled={busy} onClick={() => setTick(t => t + 1)}>{c("Tải lại danh sách", "Reload list")}</button></p>}
    {message && <p role="status" className="mb-4 text-positive">{message} {questionId && <Link className="underline" href={`/admin/content?questionId=${questionId}`}>{c("Mở thư viện quản trị", "Open content administration")}</Link>}</p>}
    <div className={`grid items-start gap-8 ${selected ? "xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]" : ""}`}>
      <section className="flex min-h-0 min-w-0 flex-col" aria-busy={loading}>
        <AdminField label={c("Trạng thái", "Status")}><select className="kg-field max-w-sm" value={status} disabled={busy} onChange={e => { setStatus(e.target.value as LearningDraft["status"]); setPage(1); setSelected(null); }}>
          <option value="REVIEW">{c("Chờ duyệt", "Pending review")}</option><option value="APPROVED">{c("Đã duyệt", "Approved")}</option><option value="REJECTED">{c("Đã từ chối", "Rejected")}</option>
        </select></AdminField>
        {loading ? <p role="status" className="mt-5">{c("Đang tải draft…", "Loading drafts…")}</p> : <>
          <ul className="mt-5 divide-y divide-line">{items.map(item => <li key={item.id}><button disabled={busy} aria-pressed={selected?.id === item.id} className={`w-full break-words p-4 text-left hover:bg-muted ${selected?.id === item.id ? "bg-sage" : ""}`} onClick={() => { setSelected(item); setModuleId(""); setReason(""); setConfirmed(false); setMessage(""); setQuestionId(""); }}>
            <strong className="block text-lg">{item.title}</strong><span className="block text-sm text-subtle">{item.kind} · {item.status} · {item.model || "AI"}</span><span className="text-sm text-subtle">{item.sourceIds.length} {c("nguồn", "sources")} · {item.tokensUsed} tokens</span>
          </button></li>)}</ul>
          {!items.length && <div className="mt-5 rounded-xl border border-dashed border-control/60 p-6"><p className="font-medium text-strong">{c("Không có draft ở trạng thái này.", "No drafts with this status.")}</p><p className="mt-2 max-w-xl text-sm text-subtle">{c("Chọn trạng thái khác để xem nội dung đã xử lý, hoặc tạo mục tiêu thu nạp để bổ sung nội dung mới.", "Choose another status to see reviewed content, or create an intake goal to collect new material.")}</p><Link className="kg-secondary mt-4" href="/admin/knowledge">{c("Quản lý mục tiêu thu nạp", "Manage intake goals")}</Link></div>}
        </>}
      </section>
      {selected && <section className="min-w-0 space-y-5 border-t border-line pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <div className="flex items-start justify-between gap-4"><h2 className="break-words text-xl">{selected.title}</h2><button type="button" className="kg-secondary shrink-0" disabled={busy} onClick={() => setSelected(null)}>{c("Đóng", "Close")}</button></div>
        <p className="text-sm leading-relaxed text-subtle">{c("Đọc đáp án và đối chiếu nguồn trước khi duyệt. Duyệt không đồng nghĩa với xuất bản; nội dung chỉ đến người học sau bước xuất bản trong thư viện.", "Read the answer and check sources before approving. Approval is not publication; content reaches learners only after publication in the library.")}</p>
        {preview?.html ? <LearningContent html={preview.html} /> : preview?.text ? <p className="whitespace-pre-wrap break-words leading-relaxed">{preview.text}</p> : <p className="kg-notice">{c("Chưa có bản đọc cho định dạng này. Mở dữ liệu gốc bên dưới để kiểm tra; không duyệt nếu chưa xác minh được nội dung.", "No readable preview for this format. Inspect the original data below; do not approve unverified content.")}</p>}
        <details><summary>{c("Xem dữ liệu gốc (JSON)", "View original data (JSON)")}</summary><pre tabIndex={0} aria-label={c("Dữ liệu nội dung gốc", "Original content data")} className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-xs">{selected.payloadJson}</pre></details>
        {selected.sourceIds.length > 0 && <details><summary>{c("ID nguồn để đối chiếu", "Source IDs for verification")}</summary><ul className="space-y-2 pt-3 text-sm">{selected.sourceIds.map(id => <li key={id} className="break-all">{id}</li>)}</ul></details>}
        <AdminField label={c("Lý do thao tác", "Operation reason")} hint={c("Ghi nhận xét về độ chính xác, nguồn và lý do duyệt hoặc từ chối. Nội dung này được lưu để đối chiếu.", "Record accuracy, sources and your approval or rejection reason for later review.")}> <textarea className="kg-field min-h-24" disabled={busy} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></AdminField>
        {selected.status === "APPROVED" && <AdminField label={c("Module đích", "Target module")}><select className="kg-field" value={moduleId} disabled={busy || catalog.loading} onChange={e => setModuleId(e.target.value)}><option value="">{c("Chọn module", "Choose module")}</option>{catalog.modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>{Boolean(catalog.error) && <p role="alert" className="text-danger">{c("Không tải được module.", "Could not load modules.")} <button className="underline" onClick={catalog.reload}>{c("Thử lại", "Retry")}</button></p>}</AdminField>}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{c("Tôi đã kiểm tra nội dung và xác nhận thao tác bên dưới.", "I have checked the content and confirm the action below.")}</label>
        <div className="flex flex-wrap gap-3">
          {selected.status === "REVIEW" && <><button className="kg-button" disabled={!ready} onClick={() => void act("APPROVED")}>{c("Duyệt", "Approve")}</button><button className="kg-secondary text-danger" disabled={!ready} onClick={() => void act("REJECTED")}>{c("Từ chối", "Reject")}</button></>}
          {selected.status === "APPROVED" && <><button className="kg-button" disabled={!ready || !moduleId} onClick={() => void act("materialize")}>{c("Tạo câu hỏi nháp", "Create draft question")}</button><button className="kg-secondary text-danger" disabled={!ready} onClick={() => void act("rollback")}>{c("Thu hồi bằng cách ẩn", "Withdraw by hiding")}</button></>}
        </div>
        {busy && <p role="status">{c("Đang lưu thao tác…", "Saving action…")}</p>}
      </section>}
    </div>
    <Pagination page={page} totalPages={pages} onChange={next => { setPage(next); setSelected(null); }} disabled={busy || loading || error !== undefined} />
  </div>;
}
export default function AdminLearningDraftsPage() { return <RequireAdmin><Drafts /></RequireAdmin>; }
