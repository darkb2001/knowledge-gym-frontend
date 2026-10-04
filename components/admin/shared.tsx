"use client";

import { Children, cloneElement, isValidElement, useEffect, useId, useState, type ReactNode } from "react";
import { useLocale } from "../locale";
import { ApiError } from "@/lib/api-client";

export function useAdminCopy() {
  const locale = useLocale();
  return { ...locale, c: (vi: string, en: string) => locale.locale === "en" ? en : vi };
}
export function adminError(error: unknown, english: boolean) {
  if (error instanceof ApiError) {
    if (error.status === 404) return english ? "This resource or endpoint is unavailable. Check backend rollout and retry." : "Dữ liệu hoặc endpoint chưa có. Kiểm tra backend rồi thử lại.";
    if (error.status === 403) return english ? "Your account cannot perform this action." : "Tài khoản không có quyền thực hiện thao tác này.";
    return error.message;
  }
  return english ? "Could not connect. Check your connection and retry." : "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.";
}
export function AdminField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const generatedId = useId();
  const fields = Children.toArray(children);
  const control = fields.find(child => isValidElement(child) && typeof child.type === "string" && ["input", "select", "textarea"].includes(child.type));
  const editable = isValidElement<{ id?: string; "aria-describedby"?: string }>(control) ? control : null;
  const id = editable?.props.id ?? generatedId;
  const description = [editable?.props["aria-describedby"], hint ? `${id}-hint` : undefined].filter(Boolean).join(" ") || undefined;
  return <div className="text-sm font-medium text-strong"><label htmlFor={id} className="mb-2 block">{label}</label>{fields.map(child => child === editable && editable ? cloneElement(editable, { id, "aria-describedby": description }) : child)}{hint && <p id={`${id}-hint`} className="mt-2 text-xs font-normal leading-relaxed text-subtle">{hint}</p>}</div>;
}
export function PendingBackend({ children }: { children: ReactNode }) {
  const { c } = useAdminCopy();
  return <div className="kg-notice border-warning/30 bg-[#faf0e4]"><p className="font-semibold text-warning">{c("Chờ API backend", "Waiting for backend API")}</p><div className="mt-1 text-body">{children}</div></div>;
}
let approvedNavigation: Event | undefined;
export function useDraftWarning(dirty: boolean) {
  const { locale } = useLocale();
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || approvedNavigation === event || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.protocol === "blob:") return;
      if (anchor.origin === location.origin && anchor.pathname === location.pathname && anchor.search === location.search) return;
      if (window.confirm(locale === "en" ? "Leave this page and discard unsaved changes?" : "Rời trang và bỏ những thay đổi chưa lưu?")) approvedNavigation = event;
      else { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [dirty, locale]);
}
export function downloadDraft(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = `${name}.json`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DeleteConfirmation({ name, busy, onDelete, onCancel }: { name: string; busy: boolean; onDelete: () => void; onCancel: () => void }) {
  const { c } = useAdminCopy();
  const id = useId();
  const [confirmation, setConfirmation] = useState("");
  return <div className="mt-5 space-y-3 rounded-xl border border-danger/30 bg-[#fbefea] p-4">
    <p className="text-sm font-semibold text-danger">{c("Xóa dữ liệu này? Thao tác không thể hoàn tác.", "Delete this content? This cannot be undone.")}</p>
    <label htmlFor={id} className="block text-sm">{c("Nhập tên để xác nhận", "Type the name to confirm")}: <strong className="break-words">{name}</strong></label>
    <input id={id} autoFocus className="kg-field" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" />
    <div className="flex flex-wrap gap-2"><button type="button" className="kg-secondary text-danger" disabled={busy || confirmation !== name} onClick={onDelete}>{c("Xóa vĩnh viễn", "Delete permanently")}</button><button type="button" className="kg-secondary" disabled={busy} onClick={onCancel}>{c("Giữ lại", "Keep content")}</button></div>
  </div>;
}
