import { describe, expect, it } from "vitest";
import { isPublicPath, isStaticAssetPath, loginRedirectTarget, requiresAuth } from "./route-guard";

describe("route guard", () => {
  it("cho qua các route công khai", () => {
    for (const path of ["/login", "/register", "/forgot-password", "/verify-email", "/blog", "/blog/rss", "/blog/bai-viet-x", "/auth/oauth2/success", "/feed.xml"]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });

  it("chặn mọi trang nội bộ", () => {
    for (const path of ["/", "/learn", "/questions", "/questions/abc", "/flashcard/abc", "/quiz/abc", "/mock-interview", "/dashboard", "/mindmap", "/notes", "/profile", "/admin", "/admin/users"]) {
      expect(requiresAuth(path)).toBe(true);
    }
  });

  it("không nhầm route có tiền tố giống route công khai", () => {
    // "/blogging" hay "/logins" không được coi là công khai chỉ vì bắt đầu giống.
    expect(isPublicPath("/blogging")).toBe(false);
    expect(isPublicPath("/logins")).toBe(false);
    expect(isPublicPath("/authz")).toBe(false);
  });

  it("giữ nguyên đích đến trong ?next=", () => {
    expect(loginRedirectTarget("/notes", "")).toBe("/login?next=%2Fnotes");
    expect(loginRedirectTarget("/questions", "?page=2")).toBe("/login?next=%2Fquestions%3Fpage%3D2");
    expect(loginRedirectTarget("/", "")).toBe("/login");
  });

  it("?next= luôn là đường dẫn nội bộ (không thành open redirect)", () => {
    const target = loginRedirectTarget("//evil.example.com", "");
    expect(target.startsWith("/login?next=%2F%2Fevil.example.com")).toBe(true);
    expect(target.includes("http")).toBe(false);
  });
});

describe("static assets in front of the auth gate", () => {
  it("cho tài sản tĩnh đi qua, kể cả nhạc nền và font", () => {
    for (const path of [
      "/lofi/lofi-dayum.mp3", "/lofi/vanilla-lofi-beat.mp3", "/lofi/CREDITS.txt",
      "/_next/static/chunks/main.js", "/fonts/x.woff2", "/icon.svg", "/apple-icon.png",
      "/LOFI/DAYUM.MP3",
    ]) {
      expect(isStaticAssetPath(path)).toBe(true);
    }
  });

  it("không nhầm trang thật thành tài sản tĩnh", () => {
    for (const path of ["/", "/learn", "/questions", "/questions/12", "/dashboard", "/blog", "/notes", "/questions/v1.2/notes", "/api/health"]) {
      expect(isStaticAssetPath(path)).toBe(false);
    }
  });
});
