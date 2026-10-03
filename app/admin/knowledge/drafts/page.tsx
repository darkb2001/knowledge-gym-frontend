"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeading, RequireAdmin } from "@/components/ui";
import { AdminField, adminError, useAdminCopy } from "@/components/admin/shared";
import { useAdminCatalog } from "@/components/admin/use-catalog";
import { Pagination } from "@/components/Pagination";
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
  return <div>
    <PageHeading title={c("Duyệt nội dung học AI", "Review AI learning content")} description={c("Duyệt, tạo câu hỏi nháp và thu hồi nội dung mà không xóa lịch sử học.", "Review, create draft questions and withdraw content without deleting learning history.")} />
    {error !== undefined && <p role="alert" className="mb-4 text-danger">{String(adminError(error, locale === "en"))} <button className="underline" disabled={busy} onClick={() => setTick(t => t + 1)}>{c("Tải lại danh sách", "Reload list")}</button></p>}
    {message && <p role="status" className="mb-4 text-positive">{message} {questionId && <Link className="underline" href={`/admin/content?questionId=${questionId}`}>{c("Mở thư viện quản trị", "Open content administration")}</Link>}</p>}
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
      <section className="min-w-0" aria-busy={loading}>
        <AdminField label={c("Trạng thái", "Status")}><select className="kg-field" value={status} disabled={busy} onChange={e => { setStatus(e.target.value as LearningDraft["status"]); setPage(1); setSelected(null); }}>
          <option value="REVIEW">{c("Chờ duyệt", "Pending review")}</option><option value="APPROVED">{c("Đã duyệt", "Approved")}</option><option value="REJECTED">{c("Đã từ chối", "Rejected")}</option>
        </select></AdminField>
        {loading ? <p role="status" className="mt-5">{c("Đang tải draft…", "Loading drafts…")}</p> : <>
          <ul className="mt-5 divide-y divide-line">{items.map(item => <li key={item.id}><button disabled={busy} aria-pressed={selected?.id === item.id} className={`w-full break-words p-4 text-left hover:bg-muted ${selected?.id === item.id ? "bg-sage" : ""}`} onClick={() => { setSelected(item); setReason(""); setConfirmed(false); setMessage(""); setQuestionId(""); }}>
            <strong className="block text-lg">{item.title}</strong><span className="block text-sm text-subtle">{item.kind} · {item.status} · {item.model || "AI"}</span><span className="text-sm text-subtle">{item.sourceIds.length} {c("nguồn", "sources")} · {item.tokensUsed} tokens</span>
          </button></li>)}</ul>
          {!items.length && <p className="mt-5 text-subtle">{c("Không có draft ở trạng thái này.", "No drafts with this status.")}</p>}
          <Pagination page={page} totalPages={pages} onChange={next => { setPage(next); setSelected(null); }} disabled={busy || loading} />
        </>}
      </section>
      {selected && <section className="min-w-0 space-y-5 border-t border-line pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <h2 className="break-words text-xl">{selected.title}</h2>
        <p className="text-sm text-subtle">{c("Payload AI chưa được coi là nội dung chính thức. Materialize chỉ tạo DRAFT; publish là thao tác riêng.", "AI payload is not official content. Materialization creates a DRAFT; publication is separate.")}</p>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-4 text-sm">{selected.payloadJson}</pre>
        {selected.sourceIds.length > 0 && <details><summary>{c("ID nguồn để đối chiếu", "Source IDs for verification")}</summary><ul className="space-y-2 pt-3 text-sm">{selected.sourceIds.map(id => <li key={id} className="break-all">{id}</li>)}</ul></details>}
        <AdminField label={c("Lý do thao tác", "Operation reason")}><textarea className="kg-field min-h-24" disabled={busy} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></AdminField>
        {selected.status === "APPROVED" && <AdminField label={c("Module đích", "Target module")}><select className="kg-field" value={moduleId} disabled={busy || catalog.loading} onChange={e => setModuleId(e.target.value)}><option value="">{c("Chọn module", "Choose module")}</option>{catalog.modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>{Boolean(catalog.error) && <p role="alert" className="text-danger">{c("Không tải được module.", "Could not load modules.")} <button className="underline" onClick={catalog.reload}>{c("Thử lại", "Retry")}</button></p>}</AdminField>}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{c("Tôi đã kiểm tra nội dung và xác nhận thao tác bên dưới.", "I have checked the content and confirm the action below.")}</label>
        <div className="flex flex-wrap gap-3">
          {selected.status === "REVIEW" && <><button className="kg-button" disabled={!ready} onClick={() => void act("APPROVED")}>{c("Duyệt", "Approve")}</button><button className="kg-secondary text-danger" disabled={!ready} onClick={() => void act("REJECTED")}>{c("Từ chối", "Reject")}</button></>}
          {selected.status === "APPROVED" && <><button className="kg-button" disabled={!ready || !moduleId} onClick={() => void act("materialize")}>{c("Tạo câu hỏi nháp", "Create draft question")}</button><button className="kg-secondary text-danger" disabled={!ready} onClick={() => void act("rollback")}>{c("Thu hồi bằng cách ẩn", "Withdraw by hiding")}</button></>}
        </div>
        {busy && <p role="status">{c("Đang lưu thao tác…", "Saving action…")}</p>}
      </section>}
    </div>
  </div>;
}
export default function AdminLearningDraftsPage() { return <RequireAdmin><Drafts /></RequireAdmin>; }
