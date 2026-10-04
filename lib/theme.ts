export const THEME_KEY = "kg.theme";
export type Theme = "light" | "dark";
export function validTheme(value: unknown): Theme { return value === "dark" ? "dark" : "light"; }
export function readTheme(storage?: Pick<Storage, "getItem">): Theme {
  try { return validTheme(storage?.getItem(THEME_KEY)); } catch { return "light"; }
}
/** These semantic colors also provide deterministic contrast tests for both scenic themes. */
export const themeColors = {
  light: { canvas: "#bfd1d8", surface: "#eff5f5", sand: "#cddde0", muted: "#dce8eb", line: "#aabfc5", control: "#55717b", strong: "#193642", body: "#304f5b", subtle: "#3f5965", accent: "#12657a", "accent-hover": "#0e5366", "accent-soft": "#d2e7ed", sage: "#cfe1dd", positive: "#27624f", warning: "#874821", danger: "#a63844", "on-accent": "#f4fbfb" },
  dark: { canvas: "#09141e", surface: "#111f2a", sand: "#142732", muted: "#1a2f3c", line: "#354c59", control: "#718995", strong: "#edf5f8", body: "#cad9df", subtle: "#a7bdc7", accent: "#8bd6dc", "accent-hover": "#b1e9ed", "accent-soft": "#173c48", sage: "#1d3d3c", positive: "#97d9b7", warning: "#f4c593", danger: "#ffb5be", "on-accent": "#102b34" },
} as const;
/** Runs before paint; no cookies, tokens or authentication data are read. */
export const THEME_INIT_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem("${THEME_KEY}")==="dark"?"dark":"light"}catch{document.documentElement.dataset.theme="light"}`;
