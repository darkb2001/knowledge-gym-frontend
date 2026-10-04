import { useId, useState } from "react";
import { useLocale } from "./locale";
import { normalizeSearch } from "@/lib/catalog";

export type Choice = { value: string; label: string };
/** Small catalogs use chips; larger catalogs use native selection without a wall of buttons. */
export function ChoicePicker({ choices, value, onChange, allLabel, label, tone = "topic" }: { choices: Choice[]; value: string; onChange: (value: string) => void; allLabel: string; label: string; tone?: "track" | "topic" }) {
  const { locale } = useLocale();
  const id = useId();
  const [query, setQuery] = useState("");
  if (choices.length > 6) {
    const matches = choices.filter(choice => normalizeSearch(choice.label).includes(normalizeSearch(query)));
    const selected = choices.find(choice => choice.value === value);
    const options = selected && !matches.includes(selected) ? [selected, ...matches] : matches;
    return <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
      {choices.length > 20 && <label className="block text-sm"><span className="mb-2 block">{locale === "en" ? `Search ${label.toLowerCase()}` : `Tìm ${label.toLowerCase()}`}</span><input type="search" className="kg-field" value={query} onChange={e => setQuery(e.target.value)} aria-describedby={`${id}-count`} /></label>}
      <div className="min-w-0"><label className="mb-2 block text-sm" htmlFor={id}>{label}</label><select id={id} className="kg-field" value={value} onChange={e => { onChange(e.target.value); setQuery(""); }}><option value="">{allLabel}</option>{options.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></div>
      {choices.length > 20 && <p id={`${id}-count`} className="text-xs text-subtle sm:col-span-2">{matches.length} / {choices.length} {locale === "en" ? "matches; the current selection stays available." : "lựa chọn khớp; lựa chọn hiện tại luôn được giữ lại."}</p>}
    </div>;
  }
  const button = (active: boolean) => `min-h-11 border px-5 text-sm font-medium transition-colors ${tone === "track" ? "rounded-lg" : "rounded-full"} ${active ? tone === "track" ? "border-strong bg-strong text-on-accent" : "border-accent bg-accent text-on-accent" : "border-line bg-surface text-body hover:bg-muted"}`;
  return <div className="flex flex-wrap gap-2" role="group" aria-label={label}><button type="button" aria-pressed={!value} className={button(!value)} onClick={() => onChange("")}>{allLabel}</button>{choices.map(choice => <button key={choice.value} type="button" aria-pressed={value === choice.value} className={button(value === choice.value)} onClick={() => onChange(choice.value)}>{choice.label}</button>)}</div>;
}
