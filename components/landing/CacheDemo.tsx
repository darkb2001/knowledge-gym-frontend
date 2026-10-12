"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRightIcon, BrowserIcon, DatabaseIcon, HardDrivesIcon, PauseIcon, PlayIcon, StackIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import { CACHE_STEPS, LANDING_DIAGRAM_URL, type CacheMode } from "@/lib/landing";

/** A local, finite teaching interaction. No API requests, scoring or saved learning state. */
export function CacheDemo() {
  const { locale } = useLocale();
  const lang = locale === "en" ? 1 : 0;
  const [mode, setMode] = useState<CacheMode>("miss");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const marker = `cache-arrow-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReduced(query.matches); if (query.matches) setPlaying(false); };
    const hide = () => { if (document.hidden) setPlaying(false); };
    sync(); query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", hide);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) setPlaying(false); });
    if (root.current) observer?.observe(root.current);
    return () => { query.removeEventListener("change", sync); document.removeEventListener("visibilitychange", hide); observer?.disconnect(); };
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setTimeout(() => {
      if (step === CACHE_STEPS.length - 1) setPlaying(false);
      else setStep(value => value + 1);
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [playing, reduced, step]);

  const nodes = [
    { id: "client", x: 34, y: 118, name: "Client", sub: lang ? "The request" : "Nơi gửi request", Icon: BrowserIcon, active: step === 0 || step === 3 },
    { id: "api", x: 238, y: 118, name: "API", sub: lang ? "The coordinator" : "Điều phối dữ liệu", Icon: StackIcon, active: true },
    { id: "cache", x: 442, y: 118, name: "Cache", sub: lang ? "A temporary copy" : "Bản sao tạm thời", Icon: HardDrivesIcon, active: step === 1 || step === 2 },
    { id: "database", x: 238, y: 304, name: "Database", sub: lang ? "Source of truth" : "Nguồn dữ liệu gốc", Icon: DatabaseIcon, active: mode === "miss" && step === 2 },
  ];

  return <div ref={root} className="landing-demo" id="diagram-demo" data-step={step} data-mode={mode} data-playing={playing}>
    <div className="landing-demo-bar"><span>{lang ? "Try a small lesson" : "Thử một bài học nhỏ"}</span><div className="landing-mode" role="group" aria-label={lang ? "Cache scenario" : "Tình huống cache"}>{(["miss", "hit"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setStep(0); setPlaying(false); }}>Cache {value}</button>)}</div></div>
    <svg className="landing-graph" viewBox="0 0 610 414" role="img" aria-label={lang ? `Cache-aside illustration, cache ${mode}. ${CACHE_STEPS[step].label[1]}.` : `Minh họa cache-aside, cache ${mode}. ${CACHE_STEPS[step].label[0]}.`}>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 8 5 0 9" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker></defs>
      <g className="landing-graph-grid" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 40} 20V400`} />)}{Array.from({ length: 10 }, (_, i) => <path key={i} d={`M15 ${i * 40 + 20}H600`} />)}</g>
      <text x="34" y="63" className="landing-graph-title">{lang ? "What happens after a request?" : "Sau một request là gì?"}</text>
      <path d="M166 154H231" className={`landing-edge ${step === 0 ? "is-active" : ""}`} markerEnd={`url(#${marker})`} />
      <text x="198" y="140" className="landing-edge-label" textAnchor="middle">GET</text>
      <path d="M370 154H435" className={`landing-edge ${step === 1 || (mode === "miss" && step === 2) ? "is-active" : ""}`} markerEnd={`url(#${marker})`} />
      <text x="402" y="140" className="landing-edge-label" textAnchor="middle">{mode === "miss" && step === 2 ? "store" : "lookup"}</text>
      <path d="M442 179H378" className={`landing-edge landing-return ${mode === "miss" && step === 1 || mode === "hit" && step === 2 ? "is-active" : ""}`} markerEnd={`url(#${marker})`} />
      <text x="403" y="210" className="landing-edge-label" textAnchor="middle">{mode}</text>
      <path d="M304 193V297" className={`landing-edge landing-db-edge ${mode === "miss" && step === 2 ? "is-active" : ""}`} markerEnd={`url(#${marker})`} />
      <path d="M284 304V201" className={`landing-edge landing-db-edge landing-return ${mode === "miss" && step === 2 ? "is-active" : ""}`} markerEnd={`url(#${marker})`} />
      <text x="324" y="255" className="landing-edge-label">{mode === "miss" ? "miss → read" : lang ? "not queried" : "không truy vấn"}</text>
      <path d="M239 179H174" className={`landing-edge landing-return ${step === 3 ? "is-active" : ""}`} markerEnd={`url(#${marker})`} />
      <text x="201" y="210" className="landing-edge-label" textAnchor="middle">response</text>
      {nodes.map(({ id, x, y, name, sub, Icon, active }) => <g key={id} transform={`translate(${x} ${y})`} className={`landing-node ${active ? "is-active" : ""} ${id === "database" && mode === "hit" ? "is-unused" : ""}`}><rect width="132" height="75" rx="12" /><Icon x={13} y={15} size={21} aria-hidden /><text x="42" y="32" className="landing-node-name">{name}</text><text x="13" y="56" className="landing-node-sub">{sub}</text></g>)}
    </svg>
    <div className="landing-demo-controls"><div className="landing-demo-steps" role="group" aria-label={lang ? "Explore each step" : "Khám phá từng bước"}>{CACHE_STEPS.map((item, index) => <button type="button" key={index} aria-pressed={step === index} aria-label={`${index + 1}. ${item.label[lang]}`} onClick={() => { setPlaying(false); setStep(index); }}>{index + 1}</button>)}</div><button type="button" className="landing-play" disabled={reduced} onClick={() => { if (playing) setPlaying(false); else { if (step === 3) setStep(0); setPlaying(true); } }}>{playing ? <PauseIcon size={16} aria-hidden /> : <PlayIcon size={16} weight="fill" aria-hidden />}{reduced ? lang ? "Motion reduced" : "Giảm chuyển động" : playing ? lang ? "Pause" : "Tạm dừng" : lang ? "Play the flow" : "Chạy luồng"}</button></div>
    <div className="landing-demo-caption" aria-live="polite" aria-atomic="true"><strong>{CACHE_STEPS[step].label[lang]}</strong><p>{CACHE_STEPS[step][mode][lang]}</p></div>
    <p className="landing-demo-note">{lang ? "Illustrative cache-aside, not a live request or this app’s topology." : "Minh họa cache-aside, không phải request thật hay topology của ứng dụng."}</p>
    <details className="landing-archify" onToggle={event => setExpanded(event.currentTarget.open)}><summary>{lang ? "Explore the full Archify diagram" : "Khám phá diagram Archify đầy đủ"}<ArrowRightIcon size={17} aria-hidden /></summary>{expanded && <div className="landing-archify-reader"><p>{lang ? "English diagram. Focus nodes, follow relationships, or export a copy. No account needed." : "Diagram dùng tiếng Anh. Chọn node, theo dõi quan hệ hoặc xuất bản sao. Không cần tài khoản."}</p><iframe title={lang ? "Interactive cache-aside sequence" : "Sequence cache-aside tương tác"} src={LANDING_DIAGRAM_URL} loading="lazy" sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer" /><a href={LANDING_DIAGRAM_URL} target="_blank" rel="noopener noreferrer">{lang ? "Open full size in a new tab" : "Mở kích thước đầy đủ trong tab mới"}</a></div>}</details>
  </div>;
}
