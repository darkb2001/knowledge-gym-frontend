"use client";

import { PageHeading, RequireAdmin } from "@/components/ui";
import { useAdminCopy } from "@/components/admin/shared";
import { ArchitectureWorkspace } from "@/components/admin/ArchitectureWorkspace";

export default function AdminArchitecturePage() {
  const { c } = useAdminCopy();
  return <RequireAdmin><div className="kg-page">
    <PageHeading title={c("Kiến trúc & luồng xác thực", "Architecture & authentication flows")} description={c("Bản đồ kỹ thuật của Knowledge Gym: vì sao thiết kế như vậy, dữ liệu đi đâu, quyền được kiểm tra thế nào và phiên đăng nhập thực sự sống bao lâu.", "Knowledge Gym's technical map: design decisions, data paths, permission checks and the actual lifetime of a login session.")} />
    <ArchitectureWorkspace />
  </div></RequireAdmin>;
}
