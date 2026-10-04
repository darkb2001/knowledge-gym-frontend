"use client";

import { useEffect, useState } from "react";
import { DatabaseIcon as Database, MagnifyingGlassIcon as MagnifyingGlass, ArrowsClockwiseIcon as ArrowsClockwise } from "@phosphor-icons/react";
import { DeleteConfirmation, useAdminCopy } from "@/components/admin/shared";
import { apiRequest } from "@/lib/api-client";
import { esControlErrorMessage, requestEsControl, type EsAction, type SearchSettings } from "@/lib/es-control";

type Mode = "POSTGRES" | "ELASTICSEARCH" | "AUTO";
type Settings = SearchSettings;
const needsElasticsearch = (mode: Mode) => mode !== "POSTGRES";
const STOP_CONFIRM = "TAT ES";
const options = [
  { mode: "POSTGRES" as const, name: "PostgreSQL", icon: Database, description: "Ổn định nhất, không phụ thuộc Elasticsearch." },
  { mode: "AUTO" as const, name: "Tự động", icon: ArrowsClockwise, description: "Ưu tiên ES, tự fallback PostgreSQL khi ES lỗi." },
  { mode: "ELASTICSEARCH" as const, name: "Elasticsearch", icon: MagnifyingGlass, description: "Dùng ranking của Elasticsearch." },
];

/**
 * Nội dung trang /admin/system: cấu hình backend tìm kiếm + vòng đời Elasticsearch.
 * Không còn page shell/heading/guard — app/admin/system/page.tsx cung cấp.
 *
 * Lưu ý: bảng vòng đời ES luôn render kể cả khi tải cấu hình thất bại — nó tự hiển thị
 * lỗi riêng (lifecycleError) thay vì bị ẩn theo trạng thái settings.
 */
export function SearchWorkspace() {
  const { t, c, formatLocale, locale } = useAdminCopy();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState<Mode>("POSTGRES");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lifecycle, setLifecycle] = useState<{ output: string; fallback: string } | null>(null);
  const [lifecycleError, setLifecycleError] = useState<{ reason: unknown } | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<EsAction>("status");
  const [confirmStop, setConfirmStop] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiRequest<Settings>("/admin/search/settings", { signal: controller.signal }).then(next => { if (!controller.signal.aborted) { setSettings(next); setMode(next.mode); setError(""); } }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được cấu hình search"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function run(action: EsAction) {
    if (busy) return;
    setBusy(true); setLifecycleError(null); setLifecycle(null); setLifecycleAction(action);
    try {
      if (action === "stop") {
        const result = await requestEsControl("stop");
        if (result.settings) { setSettings(result.settings); setMode(result.settings.mode); }
        setLifecycle({ output: "", fallback: "Elasticsearch đã dừng; search chuyển về PostgreSQL." });
      } else if (action === "start") {
        const result = await requestEsControl("start");
        setLifecycle({ output: result.output, fallback: "Elasticsearch đã khởi động." });
        setReload(value => value + 1);
      } else {
        const result = await requestEsControl("status");
        setLifecycle({ output: result.output, fallback: "Đã lấy trạng thái Elasticsearch." });
      }
    } catch (reason) {
      setLifecycleError({ reason });
    } finally { setBusy(false); }
  }
  // Mọi thao tác Tắt ES đều phải qua xác nhận gõ tay, kể cả khi bấm "Thử lại".
  function requestLifecycle(action: EsAction) {
    if (busy || loading) return;
    if (action === "stop") { setConfirmStop(true); return; }
    void run(action);
  }
  async function save() {
    if (!settings || busy) return;
    if (needsElasticsearch(mode) && !settings.elasticsearchConfigured) { setError("Elasticsearch chưa được bật ở backend, không thể chọn mode này."); return; }
    if (!window.confirm(t("Chuyển công cụ tìm kiếm sang {mode}?", { mode }))) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await apiRequest<Settings>("/admin/search/settings", { method: "PUT", body: { mode, version: settings.version } });
      setSettings(next); setMode(next.mode); setMessage("Đã cập nhật search backend.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được cấu hình search"); }
    finally { setBusy(false); }
  }
  return <>
    {error && <p role="alert" className="mb-6">{t(error)}<button type="button" onClick={() => setReload(value => value + 1)} className="ml-4 underline">{t("Thử lại")}</button></p>}
    {message && <p role="status" className="mb-6">{t(message)}</p>}
    {loading && <p role="status" className="mb-6">{t("Đang tải cấu hình…")}</p>}
    {settings && <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="kg-panel">
        <fieldset disabled={busy || loading}><legend className="mb-5 text-lg font-semibold text-strong">{t("Công cụ tìm kiếm hiện tại")}</legend><div className="space-y-3">{options.map(({ mode: candidate, name, icon: Icon, description }) => {
          const unavailable = needsElasticsearch(candidate) && !settings.elasticsearchConfigured;
          return <label key={candidate} className={`flex items-start gap-4 rounded-xl border p-5 ${unavailable ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${mode === candidate ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}><input className="mt-1" type="radio" name="search-mode" value={candidate} checked={mode === candidate} disabled={unavailable} onChange={() => setMode(candidate)} /><Icon size={22} aria-hidden className="mt-0.5 shrink-0 text-accent" /><span><strong className="block text-base text-strong">{t(name)}</strong><span className="mt-2 block text-sm leading-relaxed text-body">{t(unavailable ? "ES chưa được bật ở capability/config." : description)}</span></span></label>;
        })}</div></fieldset>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><span className="text-sm text-subtle">Elasticsearch: {t(settings.elasticsearchConfigured ? "Đã cấu hình" : "Chưa bật")}</span><button type="button" disabled={busy || loading || mode === settings.mode} onClick={() => void save()} className="kg-button">{t(busy ? "Đang lưu…" : "Lưu cấu hình")}</button></div>
      </section>
      <aside className="rounded-2xl bg-sand/60 p-6"><h2 className="text-lg">{t("Trước khi thay đổi")}</h2><p className="mt-3 text-sm leading-relaxed text-body">{t("Thay đổi sẽ áp dụng cho các truy vấn mới. Kiểm tra cấu hình trước khi lưu.")}</p><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-subtle">{t("Phiên bản cấu hình")}</dt><dd className="mt-1 font-medium text-strong">{settings.version}</dd></div><div><dt className="text-subtle">{t("Cập nhật gần nhất")}</dt><dd className="mt-1 text-strong">{settings.updatedAt ? new Date(settings.updatedAt).toLocaleString(formatLocale) : t("Chưa có")}</dd></div></dl></aside>
    </div>}
    <section className="kg-panel mt-7" aria-labelledby="kg-es-lifecycle">
      <h2 id="kg-es-lifecycle" className="text-lg font-semibold text-strong">{c("Vòng đời Elasticsearch", "Elasticsearch lifecycle")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-body">{c("Kiểm tra trạng thái hoặc bật Elasticsearch. Thao tác Tắt nằm riêng và cần gõ xác nhận.", "Check status or start Elasticsearch. The stop action sits apart and needs typed confirmation.")}</p>
      {lifecycleError && <p role="alert" className="mt-5 text-danger">{esControlErrorMessage(lifecycleError.reason, locale === "en")}<button type="button" disabled={busy || loading} onClick={() => requestLifecycle(lifecycleAction)} className="ml-4 underline">{t("Thử lại")}</button></p>}
      {lifecycle && <p role="status" className="mt-5 whitespace-pre-wrap break-words">{lifecycle.output || t(lifecycle.fallback)}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={busy || loading} onClick={() => requestLifecycle("status")} className="kg-secondary">{t("Trạng thái ES")}</button>
        <button type="button" disabled={busy || loading} onClick={() => requestLifecycle("start")} className="kg-secondary">{t("Bật ES")}</button>
      </div>
      <div className="mt-7 border-t border-danger/30 pt-5">
        <p className="text-sm font-semibold text-danger">{c("Vùng nguy hiểm", "Danger zone")}</p>
        <p className="mt-2 text-sm text-subtle">{c("Search sẽ chuyển ngay về PostgreSQL cho tới khi bạn bật lại Elasticsearch.", "Search falls back to PostgreSQL until Elasticsearch is started again.")}</p>
        <button type="button" disabled={busy || loading} onClick={() => requestLifecycle("stop")} className="kg-secondary mt-4 text-danger">{t("Tắt ES")}</button>
        {confirmStop && <DeleteConfirmation
          name={STOP_CONFIRM}
          title={c("Tắt Elasticsearch?", "Stop Elasticsearch?")}
          warning={c("Đây là thao tác gián đoạn: mọi truy vấn mới sẽ dùng PostgreSQL. Gõ TAT ES để xác nhận.", "This is disruptive: every new query falls back to PostgreSQL. Type TAT ES to confirm.")}
          confirmLabel={t("Tắt ES")}
          busy={busy}
          onDelete={() => { setConfirmStop(false); void run("stop"); }}
          onCancel={() => setConfirmStop(false)}
        />}
      </div>
    </section>
  </>;
}
