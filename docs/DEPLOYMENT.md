# Frontend deployment

## GitHub Actions → Vercel

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch. Node 22 runs a clean `npm ci`, ESLint, TypeScript, Vitest, a **production-dependency** audit, Next's production build, and HTTP smoke checks for the login and icon routes.

The deploy job requires CI success and `main`. It binds the GitHub environment **`production`**, reading these environment secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

PR jobs never receive these deployment credentials. Checkout does not persist GitHub credentials. Vercel CLI is pinned to 62.2.0 and the official GitHub actions are pinned to commit SHAs. Production deployments are serialized; commits already superseded on `main` are skipped.

Deployment uses `vercel pull --environment=production`, `vercel build --prod`, then `vercel deploy --prebuilt --prod`. Vercel's production alias is resolved through its authenticated API, checked against the configured project, and smoke-tested with public GET requests. The deployment URL appears in the GitHub environment and workflow summary. Secrets and pulled environment files are never committed or printed.

`vercel.json` disables automatic **Git integration** deployments, preventing a second deploy that bypasses CI. CLI deployments remain enabled. The install command is `npm ci`. After a push, confirm that Vercel did not launch an extra automatic Git build; dashboard-level Git integration settings can also be disabled if necessary.

## Required Vercel production configuration

In **Project Settings → Environment Variables**, set:

```text
NEXT_PUBLIC_API_BASE=https://YOUR_BACKEND_HOST/api/v1
```

Select **Production**, and deploy again after changing this build-time variable. This is a public URL, not a secret. No access tokens, database credentials, or Vercel tokens belong in `NEXT_PUBLIC_*`.

The deploy validator rejects a missing URL, HTTP, localhost, and embedded credentials. It does not prove backend availability. Configure the backend separately:

- Reachable HTTPS API and exact frontend-origin CORS with credentials enabled.
- Correct secure/httpOnly refresh-cookie settings for your domain arrangement.
- Production Google OAuth callback/redirect origins.

The smoke checks do **not** log in, submit practice, upload files, write backend data, or bypass deployment protection. Login HTML plus correctly served icons is not proof of backend/auth functionality. A protected production domain will fail the public smoke check; configure the intended public domain rather than weakening authentication to hide the failure.

## Favicon assets

- `app/icon.svg`: self-contained cream stack on the existing blue accent.
- `app/favicon.ico`: matching 16, 32, 48 and 64px fallback, replacing Next's starter icon.
- `app/apple-icon.png`: 180px opaque PNG for iOS/Safari.

Next's file-based metadata conventions generate the icon links automatically. The stack geometry reuses the existing Phosphor bold stack mark; Phosphor is MIT-licensed. No favicon text is squeezed into a tiny icon.

## Local verification (2026-10-03)

| Command | Result |
| --- | --- |
| `npm ci` | 447 packages installed; legacy tooling warnings and 7 high development-dependency findings |
| `npm run lint` | Exit 0, no warnings |
| `npm run typecheck` | Exit 0 |
| `npm run test` | 6 files / 31 tests passed, including icon assets and deployment guards |
| `npm audit --omit=dev` | `found 0 vulnerabilities` |
| `npm run build` | Next 15.5.24 compiled; 21 static pages/resources generated |
| `node scripts/verify-deployment.mjs http://localhost:3100` | Login, SVG, ICO and Apple PNG: HTTP 200, correct MIME type/content and metadata links |
| `git diff --check` | Exit 0 |
| Workflow YAML parsing | Passed; deploy requires CI and binds `production` |
| Chrome/Playwright local `/login` | Title `Knowledge Gym`; ICO, SVG and Apple links present; zero page exceptions |

The first install attempt failed with `ENOSPC`; after the owner freed disk space, a clean install and the gates above succeeded. A startup readiness probe initially received connection refused before the local server became ready; all four actual smoke checks passed.

A full `npm audit` now reports **7 high development/tooling findings** through `braces`, `micromatch`, `fast-glob`, `chokidar`, Tailwind and Next ESLint tooling. The advertised automatic fixes involve disruptive major-version changes; no `npm audit fix --force`, audit suppression, or unsupported override was applied. Production audit is clean; this does **not** mean the complete dependency tree is vulnerability-free. Tooling remediation needs a separate scoped change.

Hosted CI/deploy status must be checked for the actual pushed commit; local success does not imply a completed Vercel deployment.
