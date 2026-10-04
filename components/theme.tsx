"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MoonStarsIcon, SunIcon } from "@phosphor-icons/react";
import { THEME_KEY, readTheme, validTheme, type Theme } from "@/lib/theme";
import { useLocale } from "./locale";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    setTheme(validTheme(document.documentElement.dataset.theme));
    const sync = (event: StorageEvent) => {
      if (event.key !== THEME_KEY && event.key !== null) return;
      const next = readTheme(window.localStorage);
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch { /* Theme still works when storage is unavailable. */ }
  };
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() {
  const context = useContext(ThemeContext);
  const { locale } = useLocale();
  if (!context) throw new Error("ThemeToggle must be used within ThemeProvider");
  const dark = context.theme === "dark";
  const label = locale === "en" ? dark ? "Switch to light theme" : "Switch to dark theme" : dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  return <button type="button" className="theme-toggle" onClick={context.toggle} aria-label={label} title={label} aria-pressed={dark}>{dark ? <SunIcon size={19} aria-hidden /> : <MoonStarsIcon size={19} aria-hidden />}</button>;
}
