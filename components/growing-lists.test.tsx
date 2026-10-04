import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChoicePicker } from "./ChoicePicker";
import { HistoryControls } from "./HistoryControls";
import Leaderboard from "./Leaderboard";
vi.mock("./locale", () => ({ useLocale: () => ({ locale: "vi", t: (v: string) => v, formatLocale: "vi-VN" }) }));
const choices = Array.from({ length: 30 }, (_, i) => ({ value: String(i), label: `Topic ${i}` }));
describe("scalable collection controls", () => {
  it("keeps small catalogs as accessible chips", () => {
    const html = renderToStaticMarkup(<ChoicePicker choices={choices.slice(0,3)} value="1" onChange={() => {}} allLabel="All" label="Topic" />);
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("<select");
  });
  it("replaces a large chip wall with labelled native selection and search", () => {
    const html = renderToStaticMarkup(<ChoicePicker choices={choices} value="29" onChange={() => {}} allLabel="All" label="Topic" />);
    expect(html).toContain("<select");
    expect(html).toContain('type="search"');
    expect(html).toContain('value="29" selected=""');
    expect(html).not.toContain("<button");
  });
  it("shows a bounded history size control and the actual range", () => {
    const html = renderToStaticMarkup(<HistoryControls size={5} count={5} total={500} page={3} loading={false} onSizeChange={() => {}} />);
    expect(html).toContain("11–15 / 500");
    expect(html.match(/<option/g)).toHaveLength(3);
    expect(html).toContain("Xem thêm phiên");
  });
  it("shows five leaderboard entries by default regardless of input volume", () => {
    const html = renderToStaticMarkup(<Leaderboard users={Array.from({ length: 100 }, (_, i) => ({ userId: String(i), rank: i + 1, displayName: `Learner ${i + 1}`, xp: 100 - i }))} />);
    expect(html.match(/<li /g)).toHaveLength(5);
    expect(html).toContain("Xem top 10");
    expect(html).not.toContain("Learner 11");
  });
});
