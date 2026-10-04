"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenIcon, FolderOpenIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { RequireAdmin, PageHeading } from "@/components/ui";
import { QuestionsWorkspace } from "@/components/admin/QuestionsWorkspace";
import { CatalogWorkspace } from "@/components/admin/CatalogWorkspace";
import { ImportWorkspace } from "@/components/admin/ImportWorkspace";
import { useAdminCatalog } from "@/components/admin/use-catalog";
import { adminError, useAdminCopy } from "@/components/admin/shared";

function ContentWorkspace() {
  const { c, locale } = useAdminCopy();
  const catalog = useAdminCatalog();
  const [view, setView] = useState("questions");
  const [dirty, setDirty] = useState(false);
  const sections = [
    { id: "questions", label: c("Câu hỏi & đáp án", "Questions & answers"), icon: BookOpenIcon },
    { id: "catalog", label: c("Chủ đề & module", "Topics & modules"), icon: FolderOpenIcon },
    { id: "import", label: c("Import & tác vụ", "Import & jobs"), icon: UploadSimpleIcon },
  ];
  return <div className="kg-page">
    <PageHeading title={c("Quản trị thư viện", "Content library")} description={c("Tổ chức kiến thức, biên tập đáp án và chuẩn bị nội dung cho mỗi buổi học.", "Organize knowledge, edit answers and prepare content for every study session.")} action={<Link href="/admin/blog" className="kg-secondary">{c("Biên tập bài viết", "Blog editor")}</Link>} />
    <nav aria-label={c("Các khu vực quản trị thư viện", "Library workspace sections")} className="mb-7 flex flex-wrap gap-2 border-b border-line pb-4">{sections.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={view === id} aria-controls={`admin-${id}`} onClick={() => setView(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${view === id ? "bg-accent text-on-accent" : "text-body hover:bg-muted"}`}><Icon size={19} aria-hidden />{label}</button>)}</nav>
    {Boolean(catalog.error) && catalog.initialized && <p role="alert" className="mb-5">{adminError(catalog.error, locale === "en")} <button type="button" className="underline" onClick={catalog.reload}>{c("Thử lại", "Retry")}</button></p>}
    {catalog.loading && !catalog.initialized ? <p role="status">{c("Đang mở danh mục…", "Loading the catalog…")}</p> : catalog.error && !catalog.initialized ? <p role="alert">{adminError(catalog.error, locale === "en")} <button type="button" className="underline" onClick={catalog.reload}>{c("Thử lại", "Retry")}</button></p> : <>
      <div id="admin-questions" hidden={view !== "questions"} className={view === "questions" ? "kg-page" : undefined}><QuestionsWorkspace modules={catalog.modules} dirty={dirty} onDirty={setDirty} /></div>
      <div id="admin-catalog" hidden={view !== "catalog"}><CatalogWorkspace topics={catalog.topics} modules={catalog.modules} reload={catalog.reload} /></div>
      <div id="admin-import" hidden={view !== "import"}><ImportWorkspace /></div>
    </>}
  </div>;
}
export default function AdminContentPage() { return <RequireAdmin><ContentWorkspace /></RequireAdmin>; }
