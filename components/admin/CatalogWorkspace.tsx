import { useEffect, useState } from "react";
import { DownloadSimpleIcon, FloppyDiskIcon, FolderOpenIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { Module, Topic } from "@/lib/types";
import { catalogWriteEnabled, deleteCatalog, saveCatalog, type CatalogInput } from "@/lib/admin-content";
import { AdminField, adminError, DeleteConfirmation, downloadDraft, PendingBackend, useAdminCopy, useDraftWarning } from "./shared";

export function CatalogWorkspace({ topics, modules, reload }: { topics: Topic[]; modules: Module[]; reload: () => void }) {
  const { c, locale } = useAdminCopy();
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [kind, setKind] = useState<"topics" | "modules">("topics");
  const [editing, setEditing] = useState<Topic | Module | null>(null);
  const empty = { name: "", slug: "", description: "", displayOrder: 1, topicId };
  const [draft, setDraft] = useState<CatalogInput>(empty);
  const [baseline, setBaseline] = useState(JSON.stringify(empty));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const dirty = JSON.stringify(draft) !== baseline;
  useDraftWarning(dirty);
  useEffect(() => { if (!topics.some(topic => topic.id === topicId)) setTopicId(topics[0]?.id ?? ""); }, [topics, topicId]);
  function open(nextKind: "topics" | "modules", item: Topic | Module | null) {
    if (dirty && !window.confirm(c("Bỏ bản nháp chưa lưu?", "Discard unsaved draft?"))) return;
    const next = { name: item?.name ?? "", slug: item?.slug ?? "", description: item?.description ?? "", displayOrder: item?.displayOrder ?? 1, topicId: item && "topicId" in item ? item.topicId : topicId };
    setKind(nextKind); setEditing(item); setDraft(next); setBaseline(JSON.stringify(next)); setError(null); setMessage(""); setDeleting(false);
  }
  async function save() {
    if (!catalogWriteEnabled || busy) return;
    setBusy(true); setError(null);
    try {
      const payload = { name: draft.name.trim(), slug: draft.slug.trim(), description: draft.description.trim(), displayOrder: draft.displayOrder, ...(kind === "modules" ? { topicId: draft.topicId } : {}) };
      const saved = await saveCatalog(kind, editing?.id ?? null, payload);
      const next = { name: saved.name, slug: saved.slug, description: saved.description ?? "", displayOrder: saved.displayOrder, topicId: "topicId" in saved ? saved.topicId : saved.id };
      setEditing(saved); setDraft(next); setBaseline(JSON.stringify(next)); setMessage(c("Đã lưu danh mục.", "Catalog saved.")); reload();
    } catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  async function remove() {
    if (!editing || !catalogWriteEnabled || busy) return;
    setBusy(true); setError(null);
    try { await deleteCatalog(kind, editing.id); setEditing(null); setDraft(empty); setBaseline(JSON.stringify(empty)); setDeleting(false); setMessage(c("Đã xóa danh mục rỗng.", "Empty category deleted.")); reload(); }
    catch (reason) { setError(reason); } finally { setBusy(false); }
  }
  const children = modules.filter(module => module.topicId === topicId);
  const nonempty = editing && ("moduleCount" in editing ? editing.moduleCount > 0 : editing.questionCount > 0);
  return <div className="space-y-6">
    {!catalogWriteEnabled && <PendingBackend>{c("Chủ đề và module hiện chỉ có API đọc. Bạn có thể soạn thông tin và tải bản nháp JSON; lưu/xóa sẽ mở khi backend hỗ trợ.", "Topics and modules currently have read-only APIs. Prepare and download a JSON draft; saving/deleting will unlock when the backend supports it.")}</PendingBackend>}
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
      <div className="min-w-0 space-y-6">
        <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">{c("Chủ đề", "Topics")}</h2><button type="button" className="kg-secondary" onClick={() => open("topics", null)}><PlusIcon size={17} aria-hidden />{c("Chủ đề mới", "New topic")}</button></div>
          {!topics.length && <p className="text-sm leading-relaxed text-subtle">{c("Chưa có chủ đề. Nhập dữ liệu từ nguồn backend đã cấu hình hoặc chuẩn bị bản nháp mới.", "No topics yet. Import from the configured backend source or prepare a new draft.")}</p>}
          <ul className="space-y-1">{topics.map(topic => <li key={topic.id}><div className={`flex items-center gap-2 rounded-xl px-2 ${topicId === topic.id ? "bg-sage" : "hover:bg-muted"}`}><button type="button" className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 text-left" aria-pressed={topicId === topic.id} onClick={() => setTopicId(topic.id)}><FolderOpenIcon size={21} className="shrink-0 text-accent" aria-hidden /><span className="min-w-0"><span className="block break-words font-medium text-strong">{topic.name}</span><span className="text-xs text-subtle">{topic.moduleCount} module</span></span></button><button type="button" className="kg-secondary !px-3" onClick={() => open("topics", topic)} aria-label={`${c("Sửa chủ đề", "Edit topic")}: ${topic.name}`}>{c("Sửa", "Edit")}</button></div></li>)}</ul>
        </section>
        <section className="border-t border-line pt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">{c("Module", "Modules")}</h2><button type="button" className="kg-secondary" disabled={!topics.length} onClick={() => open("modules", null)}><PlusIcon size={17} aria-hidden />{c("Module mới", "New module")}</button></div>
          {!children.length && <p className="text-sm text-subtle">{c("Chủ đề này chưa có module.", "This topic has no modules yet.")}</p>}
          <ul className="space-y-2">{children.map(module => <li key={module.id}><button type="button" onClick={() => open("modules", module)} className="w-full rounded-xl border border-line bg-surface p-4 text-left hover:bg-muted"><span className="block font-medium text-strong">{module.name}</span>{module.description && <span className="mt-1 block text-sm leading-relaxed text-subtle">{module.description}</span>}<span className="mt-3 block text-xs tabular-nums text-accent">{module.questionCount} {c("câu hỏi", "questions")}</span></button></li>)}</ul>
        </section>
      </div>
      <section className="kg-panel min-w-0 self-start">
        <h2 className="mb-5 text-xl">{kind === "topics" ? c("Biên tập chủ đề", "Topic editor") : c("Biên tập module", "Module editor")}</h2>
        <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}>
          <fieldset disabled={busy} className="!bg-transparent space-y-5">
            {kind === "modules" && <AdminField label={c("Thuộc chủ đề", "Parent topic")}><select className="kg-field" required value={draft.topicId ?? ""} onChange={event => setDraft(previous => ({ ...previous, topicId: event.target.value }))}><option value="">{c("Chọn chủ đề", "Select topic")}</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></AdminField>}
            <AdminField label={c("Tên", "Name")}><input className="kg-field" required value={draft.name} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value }))} /></AdminField>
            <AdminField label="Slug" hint={c("Dùng chữ thường, số và dấu gạch nối. Thay đổi slug có thể ảnh hưởng liên kết cũ.", "Use lowercase letters, numbers and hyphens. Changing a slug can affect existing links.")}><input className="kg-field" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => setDraft(previous => ({ ...previous, slug: event.target.value }))} /></AdminField>
            <AdminField label={c("Mô tả", "Description")}><textarea className="kg-field min-h-32" value={draft.description} onChange={event => setDraft(previous => ({ ...previous, description: event.target.value }))} /></AdminField>
            <AdminField label={c("Thứ tự hiển thị", "Display order")}><input className="kg-field" type="number" min={0} step={1} required value={draft.displayOrder} onChange={event => setDraft(previous => ({ ...previous, displayOrder: Number(event.target.value) }))} /></AdminField>
          </fieldset>
          <div className="flex flex-wrap gap-2"><button className="kg-button" disabled={!catalogWriteEnabled || busy}><FloppyDiskIcon size={17} aria-hidden />{c("Lưu dữ liệu", "Save content")}</button><button type="button" className="kg-secondary" disabled={busy} onClick={() => downloadDraft(`${kind}-draft`, { ...draft, ...(kind === "topics" ? { topicId: undefined } : {}) })}><DownloadSimpleIcon size={17} aria-hidden />{c("Tải bản nháp JSON", "Download JSON draft")}</button></div>
        </form>
        {Boolean(error) && <p role="alert" className="mt-4">{adminError(error, locale === "en")}</p>}{message && <p role="status" className="mt-4">{message}</p>}
        {editing && <div className="mt-6 border-t border-line pt-5"><button type="button" className="kg-secondary text-danger" disabled={!catalogWriteEnabled || busy || !!nonempty} onClick={() => setDeleting(true)}><TrashIcon size={17} aria-hidden />{c("Xóa", "Delete")}</button>{nonempty && <p className="mt-2 text-xs text-subtle">{c("Chỉ xóa danh mục rỗng để tránh mất dữ liệu học.", "Only empty categories can be deleted to protect learning data.")}</p>}{deleting && <DeleteConfirmation name={editing.name} busy={busy} onDelete={() => void remove()} onCancel={() => setDeleting(false)} />}</div>}
      </section>
    </div>
  </div>;
}
