import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scripts = fileURLToPath(new URL("../scripts/", import.meta.url));

describe("production deployment guards", () => {
  it.each([
    ["https://api.example.test/api/v1", 0],
    ["", 1],
    ["http://api.example.test/api/v1", 1],
    ["https://localhost/api/v1", 1],
    ["https://[::1]/api/v1", 1],
    ["https://user:fixture-password@example.test/api/v1", 1],
    ["not-a-url", 1],
  ])("validates public API configuration %s", (value, status) => {
    const cwd = mkdtempSync(join(tmpdir(), "kg-env-test-"));
    try {
      mkdirSync(join(cwd, ".vercel"));
      writeFileSync(join(cwd, ".vercel/.env.production.local"), `NEXT_PUBLIC_API_BASE="${value}"\n`);
      const result = spawnSync(process.execPath, [join(scripts, "verify-production-env.mjs")], { cwd, encoding: "utf8" });
      expect(result.status).toBe(status);
      expect(result.stdout + result.stderr).not.toContain("fixture-password");
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it.each([true, false])("binds production alias resolution to the configured project (matching=%s)", matching => {
    const cwd = mkdtempSync(join(tmpdir(), "kg-alias-test-"));
    try {
      const mock = join(cwd, "fetch.mjs");
      writeFileSync(mock, `
        import assert from 'node:assert/strict';
        globalThis.fetch = async (url, options) => {
          assert.equal(url.origin, 'https://api.vercel.com');
          assert.equal(url.searchParams.get('teamId'), 'team_fixture');
          assert.equal(options.headers.Authorization, 'Bearer fixture-token');
          return Response.json({projectId: '${matching ? "prj_fixture" : "prj_other"}',
            readyState: 'READY', target: 'production',
            alias: ['app-git-main-team.vercel.app', 'app.vercel.app']});
        };
      `);
      const result = spawnSync(process.execPath, ["--import", mock, join(scripts, "production-url.mjs")], {
        cwd, encoding: "utf8",
        env: { ...process.env, VERCEL_TOKEN: "fixture-token", VERCEL_ORG_ID: "team_fixture", VERCEL_PROJECT_ID: "prj_fixture", DEPLOYMENT_URL: "https://fixture.vercel.app" },
      });
      expect(result.status).toBe(matching ? 0 : 1);
      if (matching) expect(result.stdout.trim()).toBe("https://app.vercel.app");
      else expect(result.stderr).toContain("different Vercel project");
      expect(result.stdout + result.stderr).not.toContain("fixture-token");
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
});
