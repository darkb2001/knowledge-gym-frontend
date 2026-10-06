import type { Metadata } from "next";
import localFont from "next/font/local";
import { LocaleProvider } from "@/components/locale";
import { ThemeProvider } from "@/components/theme";
import { MountainScene } from "@/components/MountainScene";
import UtilityBubble from "@/components/UtilityBubble";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { MOTION_INIT_SCRIPT } from "@/lib/motion";
import "./globals.css";
import "./scenic.css";

// Geist chính thức (variable, đầy đủ tiếng Việt: 90/90 ký tự U+1EA0–U+1EF9). Bản nhúng
// trước đây là subset 645 glyph chỉ có 6/90 ký tự vùng dấu tiếng Việt, nên chữ có dấu rơi
// xuống font hệ thống và trộn hai font trong cùng một dòng.
const geist = localFont({ src: "./fonts/Geist-Variable.woff2", variable: "--font-geist", weight: "100 900", display: "swap" });
const geistMono = localFont({ src: "./fonts/GeistMono-Variable.woff2", variable: "--font-geist-mono", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: "Knowledge Gym",
  description: "Choose a topic, practise IT knowledge and build lasting understanding with Knowledge Gym.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /><script dangerouslySetInnerHTML={{ __html: MOTION_INIT_SCRIPT }} /></head>
      <body className={`${geist.variable} ${geistMono.variable} min-h-[100dvh] antialiased`}><MountainScene /><LocaleProvider><ThemeProvider>{children}<UtilityBubble /></ThemeProvider></LocaleProvider></body>
    </html>
  );
}
