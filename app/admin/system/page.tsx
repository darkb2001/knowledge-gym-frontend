"use client";

import { PageHeading, RequireAdmin } from "@/components/ui";
import { useAdminCopy } from "@/components/admin/shared";
import { SearchWorkspace } from "@/components/admin/SearchWorkspace";

/**
 * Trang /admin/system (trước đây là /admin/search): cấu hình tìm kiếm + vòng đời Elasticsearch.
 * Toàn bộ nội dung nằm trong SearchWorkspace.
 */
export default function AdminSystemPage() {
  const { c } = useAdminCopy();
  return <RequireAdmin><div className="kg-page">
    <PageHeading title={c("Quản trị hệ thống", "System administration")} description={c("Cấu hình backend tìm kiếm và vòng đời Elasticsearch.", "Configure the search backend and Elasticsearch lifecycle.")} />
    <SearchWorkspace />
  </div></RequireAdmin>;
}
