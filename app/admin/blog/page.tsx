"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NotebookIcon, TextAlignLeftIcon } from "@phosphor-icons/react";
import { RequireAdmin, PageHeading } from "@/components/ui";
import { PostsWorkspace } from "@/components/admin/PostsWorkspace";
import { WriterWorkspace } from "@/components/admin/WriterWorkspace";
import { useAdminCopy } from "@/components/admin/shared";

type BlogTab = "posts" | "writer";

function BlogHub() {
  const { c } = useAdminCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get("questionId") ?? "";
  const requested = searchParams.get("tab");
  const tab: BlogTab = requested === "posts" || requested === "writer" ? requested : questionId ? "writer" : "posts";
  const select = (next: BlogTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/admin/blog?${params.toString()}`, { scroll: false });
  };
  const sections = [
    { id: "posts" as const, label: c("Bài viết", "Articles"), icon: NotebookIcon },
    { id: "writer" as const, label: c("Hàng chờ AI", "AI queue"), icon: TextAlignLeftIcon },
  ];
  return <div className="kg-page">
    <PageHeading title={c("Quản trị bài viết", "Blog administration")} description={c("Biên tập bài viết thủ công và duyệt nội dung do AI tạo trong cùng một nơi.", "Edit manual articles and review AI-generated content in one place.")} />
    <div role="tablist" aria-label={c("Các khu vực quản trị bài viết", "Blog workspace sections")} className="mb-7 flex flex-wrap gap-2 border-b border-line pb-4">{sections.map(({ id, label, icon: Icon }) => <button type="button" key={id} role="tab" id={`blog-tab-${id}`} aria-selected={tab === id} aria-controls={`blog-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => select(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${tab === id ? "bg-accent text-on-accent" : "text-body hover:bg-muted"}`}><Icon size={19} aria-hidden />{label}</button>)}</div>
    <div id="blog-panel-posts" role="tabpanel" aria-labelledby="blog-tab-posts" hidden={tab !== "posts"} className={tab === "posts" ? "kg-page" : undefined}><PostsWorkspace /></div>
    <div id="blog-panel-writer" role="tabpanel" aria-labelledby="blog-tab-writer" hidden={tab !== "writer"}><WriterWorkspace questionId={questionId || undefined} /></div>
  </div>;
}

export default function AdminBlogPage() {
  // `useSearchParams` opts the route into client-side rendering — Next requires a Suspense
  // boundary so the shell can still be prerendered.
  return <RequireAdmin><Suspense fallback={null}><BlogHub /></Suspense></RequireAdmin>;
}
