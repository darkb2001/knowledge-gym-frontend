import { useEffect, useState } from "react";
import { ArrowsClockwiseIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { generateOptions, importJob, isUuid, submitImport, type ImportJob } from "@/lib/admin-content";
import { AdminField, adminError, useAdminCopy } from "./shared";

export function ImportWorkspace() {
  const { c, locale, formatLocale } = useAdminCopy();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(false);
  const [importConsent, setImportConsent] = useState(false);
  const [optionConsent, setOptionConsent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [generated, setGenerated] = useState<{ questions: number; eligible: number; options: number } | null>(null);
  const active = job && ["QUEUED", "RUNNING"].includes(job.status);
  useEffect(() => {
    if (!watching || !job || !["QUEUED", "RUNNING"].includes(job.status)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      importJob(job.jobId, controller.signal).then(next => { if (!controller.signal.aborted) { setJob(next); setError(null); } }).catch(reason => { if (!controller.signal.aborted) { setError(reason); setWatching(false); } });
    }, 2500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [watching, job]);
  async function runImport() {
    if (busy || active || !importConsent) return;
    setBusy(true); setError(null);
    try { const next = await submitImport(); setJob(next); setJobId(next.jobId); setWatching(true); setImportConsent(false); }
    catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  async function inspect() {
    if (busy || !isUuid(jobId.trim())) return;
    setBusy(true); setError(null);
    try { setJob(await importJob(jobId.trim())); setWatching(true); }
    catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  async function regenerate() {
    if (busy || active || !optionConsent) return;
    setBusy(true); setError(null); setGenerated(null);
    try { setGenerated(await generateOptions()); setOptionConsent(false); }
    catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  return <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
    <div className="space-y-7">
      <section className="kg-panel space-y-5"><h2 className="text-xl">{c("Nhập từ nguồn có sẵn", "Import configured content")}</h2><p className="text-sm leading-relaxed text-subtle">{c("Backend đọc các file HTML ở nguồn đã cấu hình trên server. Đây không phải chức năng tải file từ máy của bạn.", "The backend reads HTML files from its configured server source. This is not a local file upload.")}</p><label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1" checked={importConsent} disabled={busy || !!active} onChange={event => setImportConsent(event.target.checked)} />{c("Tôi đã kiểm tra nguồn nhập và đồng ý cập nhật dữ liệu thư viện.", "I checked the import source and approve updating library data.")}</label><button type="button" className="kg-button" disabled={busy || !!active || !importConsent} onClick={() => void runImport()}><UploadSimpleIcon size={18} aria-hidden />{c("Bắt đầu import", "Start import")}</button></section>
      <section className="kg-panel space-y-5"><h2 className="text-xl">{c("Sinh lựa chọn trắc nghiệm", "Generate quiz choices")}</h2><p className="text-sm leading-relaxed text-warning">{c("Thao tác áp dụng cho toàn bộ thư viện. Backend hiện có thể sinh lại lựa chọn và ảnh hưởng liên kết với lịch sử quiz. Chỉ chạy khi bạn đã kiểm tra dữ liệu và có bản sao lưu.", "This affects the entire library. The current backend can regenerate choices and affect quiz history references. Run only after reviewing the data and creating a backup.")}</p><label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1" disabled={busy || !!active} checked={optionConsent} onChange={event => setOptionConsent(event.target.checked)} />{c("Tôi hiểu tác động và muốn sinh lại lựa chọn.", "I understand the impact and want to regenerate choices.")}</label><button type="button" className="kg-secondary" disabled={busy || !!active || !optionConsent} onClick={() => void regenerate()}><ArrowsClockwiseIcon size={18} aria-hidden />{c("Sinh lựa chọn", "Generate choices")}</button>{generated && <p role="status">{generated.questions} {c("câu hỏi đã xử lý;", "questions processed;")} {generated.eligible} {c("câu đủ điều kiện quiz;", "quiz-eligible questions;")} {generated.options} {c("lựa chọn.", "choices.")}</p>}</section>
    </div>
    <section className="kg-panel min-w-0 self-start space-y-5"><h2 className="text-xl">{c("Theo dõi tác vụ", "Track an import job")}</h2><form onSubmit={event => { event.preventDefault(); void inspect(); }} className="space-y-3"><AdminField label={c("Mã tác vụ import", "Import job ID")} hint={c("Dán UUID để tiếp tục theo dõi sau khi tải lại trang.", "Paste the UUID to resume tracking after a reload.")}><input className="kg-field font-mono text-sm" value={jobId} onChange={event => setJobId(event.target.value)} required /></AdminField><button className="kg-secondary" disabled={busy || !isUuid(jobId.trim())}>{c("Kiểm tra trạng thái", "Check status")}</button></form>
      {Boolean(error) && <p role="alert">{adminError(error, locale === "en")}</p>}
      {job ? <div className="space-y-4 border-t border-line pt-5"><p className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{c("Trạng thái", "Status")}</span><strong className="rounded-md bg-muted px-3 py-1 text-strong">{job.status}</strong></p>{job.startedAt && <p className="text-xs text-subtle">{c("Bắt đầu", "Started")}: {new Date(job.startedAt).toLocaleString(formatLocale)}</p>}{job.finishedAt && <p className="text-xs text-subtle">{c("Hoàn thành", "Finished")}: {new Date(job.finishedAt).toLocaleString(formatLocale)}</p>}{job.result && <dl className="space-y-2 text-sm">{Object.entries(job.result).map(([name, value]) => <div className="flex flex-wrap justify-between gap-2" key={name}><dt>{name}</dt><dd className="font-medium tabular-nums">{typeof value === "number" ? value : JSON.stringify(value)}</dd></div>)}</dl>}{job.errorMessage && <p role="alert">{job.errorMessage}</p>}{active && <><p className="text-xs text-subtle">{watching ? c("Tự cập nhật mỗi 2,5 giây.", "Refreshes every 2.5 seconds.") : c("Đã dừng theo dõi. Tác vụ vẫn chạy trên server.", "Tracking paused. The server job continues.")}</p><button type="button" className="kg-secondary" onClick={() => setWatching(value => !value)}>{watching ? c("Dừng theo dõi", "Pause tracking") : c("Tiếp tục theo dõi", "Resume tracking")}</button></>}</div> : <p className="text-sm leading-relaxed text-subtle">{c("Chạy import hoặc nhập mã tác vụ để xem tiến trình và kết quả thật từ backend.", "Start an import or enter a job ID to see real backend progress and results.")}</p>}
    </section>
  </div>;
}
