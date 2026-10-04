"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeading, RequireAdmin } from "@/components/ui";
import { AdminField, adminError, useAdminCopy, useDraftWarning } from "@/components/admin/shared";
import { apiRequest } from "@/lib/api-client";
import { createKnowledgeGoal, changeKnowledgeGoalStatus, queueKnowledgeRun, type KnowledgeGoal } from "@/lib/admin-knowledge";

const initialDraft = { name: "", topic: "", objective: "", domains: "", dailyItemLimit: 20, dailyCostLimitUsd: 10, autoPublish: false };

function KnowledgeWorkspace() {
  const { c, locale } = useAdminCopy();
  const [goals, setGoals] = useState<KnowledgeGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<KnowledgeGoal | null>(null);
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  useDraftWarning(JSON.stringify(draft) !== JSON.stringify(initialDraft));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(undefined);
    apiRequest<KnowledgeGoal[]>("/admin/knowledge/goals", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setGoals(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tick]);

  async function create() {
    if (busy) return;
    setBusy(true); setError(undefined); setMessage("");
    try {
      const goal = await createKnowledgeGoal({ name: draft.name.trim(), topic: draft.topic.trim(), objective: draft.objective.trim(), allowedDomains: draft.domains.split(/[\n,]+/).map(x => x.trim()).filter(Boolean), dailyItemLimit: draft.dailyItemLimit, dailyCostLimitUsd: draft.dailyCostLimitUsd, scheduleCron: null, autoPublish: draft.autoPublish });
      setDraft(initialDraft); setCreating(false); setSelected(goal); setReason(""); setTick(t => t + 1);
      setMessage(c("Đã tạo mục tiêu. Kiểm tra nguồn và ngân sách, sau đó bật mục tiêu để bắt đầu.", "Goal created. Check sources and budget, then activate it to begin."));
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  async function operate(action: "ACTIVE" | "PAUSED" | "ARCHIVED" | "run") {
    if (!selected || !reason.trim() || busy) return;
    if (action === "ARCHIVED" && !window.confirm(c("Lưu trữ mục tiêu này? Mục tiêu sẽ không tiếp tục thu nạp.", "Archive this goal? It will no longer collect material."))) return;
    setBusy(true); setError(undefined); setMessage("");
    try {
      if (action === "run") {
        await queueKnowledgeRun(selected.id, reason);
        setMessage(c("Đã đưa lượt thu nạp vào hàng đợi. Kiểm tra trang duyệt khi pipeline xử lý xong; chưa có nội dung nào được xuất bản.", "Intake queued. Check the review page after processing; no content has been published."));
      } else {
        setSelected(await changeKnowledgeGoalStatus(selected.id, action, reason));
        setTick(t => t + 1);
        setMessage(c("Đã cập nhật trạng thái mục tiêu.", "Goal status updated."));
      }
      setReason("");
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  const statusLabel = (value: string) => ({ DRAFT: c("Chưa bật", "Draft"), ACTIVE: c("Đang hoạt động", "Active"), PAUSED: c("Tạm dừng", "Paused"), ARCHIVED: c("Đã lưu trữ", "Archived") }[value] ?? value);

  return <div>
    <PageHeading title={c("AI thu nạp kiến thức", "AI knowledge intake")} description={c("Chọn kiến thức cần bổ sung, giới hạn nguồn và ngân sách. Nội dung thu thập được đưa vào hàng chờ duyệt trước khi dùng cho người học.", "Choose knowledge to collect, trusted sources and a budget. Collected material goes to review before learners use it.")} action={<Link className="kg-secondary" href="/admin/knowledge/drafts">{c("Duyệt nội dung AI", "Review AI content")}</Link>} />
    {error !== undefined && <p role="alert" className="mb-5">{adminError(error, locale === "en")} <button type="button" disabled={busy} className="underline" onClick={() => setTick(t => t + 1)}>{c("Tải lại danh sách", "Reload list")}</button></p>}
    {message && <p role="status" className="mb-5">{message}</p>}
    <div className={`grid items-start gap-8 ${creating || selected ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}`}>
      <section className="min-w-0" aria-busy={loading}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">{c("Mục tiêu thu nạp", "Intake goals")}</h2><div className="flex gap-2"><button type="button" disabled={busy || loading} className="kg-secondary" onClick={() => setTick(t => t + 1)}>{c("Tải lại", "Reload")}</button><button type="button" disabled={busy} className="kg-button" onClick={() => { setCreating(true); setSelected(null); }}>{c("Tạo mục tiêu", "Create goal")}</button></div></div>
        {loading ? <p role="status">{c("Đang tải mục tiêu…", "Loading goals…")}</p> : !error && !goals.length ? <div className="rounded-xl border border-dashed border-control/60 p-6"><h3 className="text-lg">{c("Bắt đầu với một mục tiêu cụ thể", "Start with a specific goal")}</h3><p className="mt-2 max-w-xl text-sm leading-relaxed text-subtle">{c("Ví dụ: bổ sung câu hỏi về quản lý bộ nhớ JVM từ tài liệu Oracle. Tạo mục tiêu, kiểm tra nguồn rồi bật thu nạp.", "For example, collect JVM memory questions from Oracle documentation. Create a goal, check sources, then activate intake.")}</p></div> : <ul className="divide-y divide-line rounded-xl border border-line bg-surface">{goals.map(goal => <li key={goal.id}><button type="button" disabled={busy} aria-pressed={selected?.id === goal.id} className={`w-full break-words p-5 text-left hover:bg-muted ${selected?.id === goal.id ? "bg-sage" : ""}`} onClick={() => { setSelected(goal); setCreating(false); setReason(""); setMessage(""); }}><span className="block text-lg font-semibold text-strong">{goal.name}</span><span className="mt-1 block text-sm text-subtle">{goal.topic} · {statusLabel(goal.status)}</span><span className="mt-3 block text-sm leading-relaxed">{goal.objective}</span><span className="mt-3 block break-all text-xs text-subtle">{goal.allowedDomains.join(", ")}</span></button></li>)}</ul>}
      </section>
      {creating && <form className="kg-panel min-w-0 space-y-5" onSubmit={e => { e.preventDefault(); void create(); }}>
        <h2 className="text-xl">{c("Tạo mục tiêu", "Create goal")}</h2>
        <p className="text-sm leading-relaxed text-subtle">{c("Mục tiêu mới chưa chạy ngay. Sau khi lưu, bạn kiểm tra cấu hình và bật mục tiêu.", "A new goal does not run immediately. Save it, check its configuration, then activate it.")}</p>
        <fieldset disabled={busy} className="space-y-5">
          <AdminField label={c("Tên mục tiêu", "Goal name")} hint={c("Tên ngắn để phân biệt trong danh sách, ví dụ: Nền tảng JVM.", "A short list label, for example: JVM fundamentals.")}><input required maxLength={120} className="kg-field" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></AdminField>
          <AdminField label={c("Chủ đề kiến thức", "Knowledge topic")} hint={c("Ví dụ: Java, Spring hoặc PostgreSQL.", "For example: Java, Spring or PostgreSQL.")}><input required maxLength={120} className="kg-field" value={draft.topic} onChange={e => setDraft({ ...draft, topic: e.target.value })} /></AdminField>
          <AdminField label={c("Nội dung cần nghiên cứu", "Research objective")} hint={c("Nêu khái niệm cần giải thích và phạm vi. Tránh yêu cầu quá rộng như ‘học tất cả Java’.", "Specify concepts and scope. Avoid broad requests such as ‘learn all of Java’.")}><textarea required maxLength={4000} className="kg-field min-h-28" value={draft.objective} onChange={e => setDraft({ ...draft, objective: e.target.value })} /></AdminField>
          <AdminField label={c("Website nguồn được phép", "Allowed source websites")} hint={c("Chỉ nhập tên miền, ví dụ docs.oracle.com. Mỗi dòng một tên miền hoặc phân tách bằng dấu phẩy. Máy chủ kiểm tra nguồn HTTPS và chặn địa chỉ nội bộ.", "Enter domains only, such as docs.oracle.com. Use one per line or separate with commas. The server checks HTTPS sources and blocks private addresses.")}><textarea required className="kg-field min-h-24" value={draft.domains} onChange={e => setDraft({ ...draft, domains: e.target.value })} /></AdminField>
          <div className="grid gap-4 sm:grid-cols-2"><AdminField label={c("Số nội dung tối đa/ngày", "Daily item limit")}><input required type="number" min={1} max={200} step={1} className="kg-field" value={draft.dailyItemLimit} onChange={e => setDraft({ ...draft, dailyItemLimit: Number(e.target.value) })} /></AdminField><AdminField label={c("Ngân sách tối đa (USD/ngày)", "Budget cap (USD/day)")}><input required type="number" min={0} max={10000} step="0.01" className="kg-field" value={draft.dailyCostLimitUsd} onChange={e => setDraft({ ...draft, dailyCostLimitUsd: Number(e.target.value) })} /></AdminField></div>
          <details className="border-t border-line pt-3"><summary>{c("Xuất bản nâng cao", "Advanced publishing")}</summary><p className="my-3 text-sm text-subtle">{c("Mặc định nội dung phải được duyệt thủ công. Chỉ bật tùy chọn này khi bạn đã kiểm tra chính sách pipeline.", "Manual review is the default. Enable this only after verifying the pipeline policy.")}</p><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={draft.autoPublish} onChange={e => setDraft({ ...draft, autoPublish: e.target.checked })} />{c("Cho phép tự xuất bản nội dung đạt chính sách", "Allow publication of policy-qualified content")}</label></details>
        </fieldset>
        <div className="flex flex-wrap gap-3"><button className="kg-button" disabled={busy || !draft.name.trim() || !draft.topic.trim() || !draft.objective.trim() || !draft.domains.trim()}>{c(busy ? "Đang lưu…" : "Lưu mục tiêu", busy ? "Saving…" : "Save goal")}</button><button type="button" className="kg-secondary" disabled={busy} onClick={() => setCreating(false)}>{c("Đóng form", "Close form")}</button></div>
      </form>}
      {!creating && selected && <section className="kg-panel min-w-0 space-y-5">
        <h2 className="break-words text-xl">{selected.name}</h2><p className="text-sm text-subtle">{statusLabel(selected.status)} · {selected.dailyItemLimit} {c("nội dung/ngày", "items/day")} · ${selected.dailyCostLimitUsd} / {c("ngày", "day")}</p>
        <p className="whitespace-pre-wrap break-words leading-relaxed">{selected.objective}</p>
        <p className="break-all text-sm"><strong>{c("Nguồn được phép", "Allowed sources")}: </strong>{selected.allowedDomains.join(", ")}</p>
        <AdminField label={c("Lý do vận hành", "Operation reason")} hint={c("Bắt buộc để ghi lại người thực hiện và mục đích của thao tác.", "Required to record the purpose of this operation.")}><textarea className="kg-field min-h-24" maxLength={500} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} /></AdminField>
        <div className="flex flex-wrap gap-3">
          {(selected.status === "DRAFT" || selected.status === "PAUSED") && <button className="kg-button" disabled={busy || !reason.trim()} onClick={() => void operate("ACTIVE")}>{c("Bật mục tiêu", "Activate goal")}</button>}
          {selected.status === "ACTIVE" && <><button className="kg-button" disabled={busy || !reason.trim()} onClick={() => void operate("run")}>{c("Chạy ngay", "Run now")}</button><button className="kg-secondary" disabled={busy || !reason.trim()} onClick={() => void operate("PAUSED")}>{c("Tạm dừng", "Pause")}</button></>}
          {selected.status !== "ARCHIVED" && <button className="kg-secondary text-danger" disabled={busy || !reason.trim()} onClick={() => void operate("ARCHIVED")}>{c("Lưu trữ mục tiêu", "Archive goal")}</button>}
        </div>
        <p className="text-sm leading-relaxed text-subtle">{c("Thu nạp không thay đổi tài khoản, quyền hay điểm học. Xem nội dung mới trong hàng chờ duyệt sau khi pipeline hoàn tất.", "Intake does not change accounts, roles or scores. Review new material after the pipeline finishes.")}</p>
      </section>}
    </div>
  </div>;
}
export default function AdminKnowledgePage() { return <RequireAdmin><KnowledgeWorkspace /></RequireAdmin>; }
