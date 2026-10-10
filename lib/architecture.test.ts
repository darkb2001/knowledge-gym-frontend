import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { LocaleProvider } from "@/components/locale";
import { ArchitectureWorkspace } from "@/components/admin/ArchitectureWorkspace";
import { AUTH_SNAPSHOT, BACKEND_REVISION, diagrams, diagramUrl, domains, rollingSessionExample, sourceUrl, storage } from "./architecture";
import { isPublicPath, requiresAuth } from "./route-guard";

const digest = (data: Buffer) => crypto.createHash("sha256").update(data).digest("hex");
describe("architecture documentation snapshot", () => {
  it("ships only immutable, checked diagrams whose published bytes match receipts", () => {
    const manifest = JSON.parse(fs.readFileSync("docs/architecture/diagram-manifest.json", "utf8"));
    expect(diagrams).toHaveLength(7);
    expect(new Set(diagrams.map(item => item.id)).size).toBe(7);
    for (const item of diagrams) {
      const receipt = JSON.parse(fs.readFileSync(`docs/architecture/diagrams/${item.id}.finalize-summary.json`, "utf8"));
      const spec = JSON.parse(fs.readFileSync(`docs/architecture/diagrams/${item.id}.json`, "utf8"));
      const bytes = fs.readFileSync(path.join("public", diagramUrl(item.id)));
      expect(receipt.ok).toBe(true);
      expect(Object.values(receipt.gates)).toEqual(["pass", "pass", "pass", "pass"]);
      expect(spec.meta.repository.revision).toBe(BACKEND_REVISION);
      expect(digest(bytes)).toBe(receipt.artifact.sha256);
      expect(manifest.artifacts.find((a: { slug: string }) => a.slug === item.id).sha256).toBe(digest(bytes));
    }
  });

  it("preserves existing route protection; public diagrams contain documentation only", () => {
    expect(requiresAuth("/admin/architecture")).toBe(true);
    for (const diagram of diagrams) expect(isPublicPath(diagramUrl(diagram.id))).toBe(true);
    expect(sourceUrl("lib/api-client.ts", true)).toContain("knowledge-gym-frontend/blob/");
    expect(sourceUrl("gradle/libs.versions.toml")).toContain(BACKEND_REVISION);
  });

  it("documents actual storage and includes all domains", () => {
    expect(AUTH_SNAPSHOT).toEqual({ accessMinutes: 15, refreshDays: 7, oauthRequestSeconds: 300 });
    expect(storage.find(item => item.name === "Access JWT")?.location[1]).toContain("memory");
    expect(storage.find(item => item.name === "Refresh JWT")?.location[1]).toContain("HttpOnly");
    expect(domains.map(item => item.name)).toContain("challenge schema");
    expect(domains.find(item => item.name === "content")?.tables).toContain("content_tracks");
  });

  it("renders the educational sections without accessing user tokens or fetching data", () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ArchitectureWorkspace)));
    for (const id of ["system-diagrams", "technical-roles", "domain-map", "token-storage", "session-lifetime", "device-sessions", "source-evidence"]) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('sandbox="allow-scripts allow-downloads allow-popups"');
    expect(html).toContain("không có cross-tab lock");
    expect(html).toContain("absolute family expiry");
  });
});

describe("rolling session teaching example", () => {
  it("explains a session lasting longer than the original token's week", () => {
    expect(rollingSessionExample([6, 12, 18], 20)).toEqual({ lastIssuedDay: 18, expiresDay: 25, expired: false });
  });
  it("requires reauthentication when no rotation happens before expiry", () => {
    expect(rollingSessionExample([], 20)).toEqual({ lastIssuedDay: 0, expiresDay: 7, expired: true });
    expect(rollingSessionExample([8, 12], 20)).toEqual({ lastIssuedDay: 0, expiresDay: 7, expired: true });
  });
  it("ignores future refreshes and does not resurrect a token at its expiry", () => {
    expect(rollingSessionExample([6, 12, 18], 10)).toEqual({ lastIssuedDay: 6, expiresDay: 13, expired: false });
    expect(rollingSessionExample([7], 7).expired).toBe(true);
  });
});
