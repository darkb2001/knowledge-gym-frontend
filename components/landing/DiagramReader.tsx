import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRightIcon, XIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import { LANDING_DIAGRAM_URL } from "@/lib/landing";

/** The reader owns focus while open, never participates in the hero's layout. */
export function DiagramReader({ children, onOpen }: { children: ReactNode; onOpen?: () => void }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useId();
  const containFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    const stops = Array.from(event.currentTarget.querySelectorAll<HTMLElement | SVGElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0);
    const first = stops[0]; const last = stops.at(-1);
    if (!first || !last) return;
    if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  };
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const returnFocus = trigger.current;
    const previousOverflow = document.body.style.overflow;
    const position = { left: window.scrollX, top: window.scrollY };
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      window.scrollTo({ ...position, behavior: "instant" });
      returnFocus?.focus({ preventScroll: true });
    };
  }, [open]);
  return <div className="landing-archify">
    <button ref={trigger} type="button" className="landing-reader-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => { onOpen?.(); setOpen(true); }}>{en ? "Open a larger diagram" : "Mở diagram lớn"}<ArrowUpRightIcon size={18} aria-hidden /></button>
    <noscript><a href={LANDING_DIAGRAM_URL}>{en ? "Open the diagram" : "Mở diagram"}</a></noscript>
    {open && createPortal(<dialog ref={dialog} className="landing-reader-dialog" aria-labelledby={title} onKeyDown={containFocus} onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      {open && <div className="landing-reader-window">
        <header className="landing-reader-header"><div><h2 id={title}>{en ? "Explore cache-aside" : "Khám phá cache-aside"}</h2><p>{en ? "Interactive teaching example · no learning data is saved" : "Minh họa tương tác · không lưu dữ liệu học"}</p></div><button type="button" autoFocus className="landing-reader-close" onClick={() => setOpen(false)} aria-label={en ? "Close diagram" : "Đóng diagram"}><XIcon size={22} aria-hidden /><span>{en ? "Close" : "Đóng"}</span></button></header>
        <div className="landing-archify-reader">{children}</div>
        <footer className="landing-reader-footer"><span>{en ? "Select a node to explore. Close above or press Escape to return." : "Chọn node để khám phá. Dùng nút Đóng phía trên hoặc Escape để quay lại."}</span><a href={LANDING_DIAGRAM_URL} target="_blank" rel="noopener noreferrer">{en ? "Open Archify in a new tab" : "Mở Archify trong tab mới"}<ArrowUpRightIcon size={17} aria-hidden /></a></footer>
      </div>}
    </dialog>, document.body)}
  </div>;
}
