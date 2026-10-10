# Admin architecture & authentication atlas

Route: `/admin/architecture`, linked under the admin System navigation group. Main implementation: `components/admin/ArchitectureWorkspace.tsx`; bilingual educational content: `lib/architecture.ts`.

## Scope and source authority

This is read-only educational documentation, not a runtime configuration editor, live production health dashboard, or security certification. Existing authentication behavior and backend policy were not changed.

- Backend snapshot: `b1d6c34af8438edcd60ad3f44b4858d56555ea5a` (knowledge-gym).
- Frontend snapshot: `f41399e8c5dbc0ad968ffb7b1f992f63f89a43a5` (knowledge-gym-frontend, before adding this documentation).
- Source links use immutable GitHub blob revisions. Dependency versions come from `gradle/libs.versions.toml`, `package.json` and production compose, not the older backend README.
- Domain/table inventory follows migrations through V038. It is not a column-level ERD or proof every schema-backed feature is deployed.

Seven Archify diagrams: deployment, Gradle modules, outbox/search, password login, Google OAuth2, refresh rotation, and browser-session families. Diagram annotations are Vietnamese; Archify viewer controls remain English. The surrounding workspace is VI/EN.

## Session conclusions verified in source

- Access JWT: 15 minutes; browser module memory, not localStorage; lost on reload. Claims include sub, role, jti, iat, exp and iatMs, but no fid.
- Refresh JWT: 7 days from each issuance; API-host HttpOnly cookie. Production flags: Secure, SameSite=Strict, Path=/, no Domain attribute.
- Successful refresh issues a new 7-day JWT/cookie within the same family. No absolute family lifetime is implemented in the inspected use case. Regular successful refresh can therefore keep a session alive beyond a week. This does not prove the owner's actual production session history.
- Refresh hashes, not raw JWTs, are held in PostgreSQL and Redis. Redis miss recovery uses PostgreSQL but still requires Redis to work; miss and outage are not equivalent.
- Google authorization-request cookie: AES-GCM, 300 seconds, HttpOnly/Secure/Lax, context path. The repository preserves Spring-provided attributes; that alone does not prove PKCE is always enabled.
- Browser “device” identity is a refresh family UUID, not hardware fingerprint. IP/UA are descriptive metadata. Tabs usually share a cookie but have separate memory state.
- Refresh revocation is family-level; access invalidation uses a user-level cutoff. Other devices can need fresh access without losing their refresh family.
- Active-row MIN/MAX(created_at) in the session query does not necessarily preserve original login time; lastSeen measures refresh issuance, not every interaction.
- `refreshInFlight` coalesces requests within one tab, not across tabs.
- Reuse branches call revokeFamily and throw an unchecked AuthException in a transaction. Durable revocation after rollback needs a dedicated integration test; this page does not assert a security guarantee.
- Password reset revokes all sessions. ChangePasswordUseCase keeps the current family when its cookie hash is identifiable and revokes other families.

## Privacy / access boundaries

The workspace uses existing `RequireAdmin` / server-verified `/users/me` behavior. Guest redirects and USER rejection (even with forged sessionStorage ADMIN role) are browser-fixture tested.

The checked standalone diagram assets intentionally live at `/blog/architecture-diagrams/*.html` under the existing public blog namespace. They contain only public-repository documentation, no credentials, tokens, user records or private host secrets. They are independently accessible: the UI guard is **not** a confidentiality boundary. If future documentation needs confidential infrastructure facts, do not put those facts in client bundles/public assets; add an authenticated server delivery boundary instead.

Only the selected iframe is mounted. The standalone HTML payloads total approximately 5.3 MB across seven artifacts; a selection loads about 0.75 MB, not all seven. The iframe permits scripts/downloads/popups, omits same-origin permission, and supports fullscreen. No runtime diagram dependency was added.

## Reproduction and evidence

Original candidate/HTML/Archify receipts are in the sibling backend folder:

`.archify/architecture-knowledge-gym-20261010-223040/`

Reviewed sources for sessions/async use fresh receipt directories `sessions-source-review` and `async-source-review`. Published copies preserve HTML bytes; `diagrams/*.json`, `*.finalize-summary.json`, `*.browser-check.json` and `diagram-manifest.json` retain the authored specifications and checks. All seven passed Archify `validate`, `deliver`, strict `check`, and real-browser `browser-check` at showcase quality. Archify's own perceptual capture mode was not invoked; separate embedded-workspace screenshots were inspected manually.

To republish the checked artifacts from frontend cwd:

```sh
node scripts/publish-architecture-diagrams.mjs ../knowledge-gym/.archify/architecture-knowledge-gym-20261010-223040
```

The publisher rejects failed gates or changed artifact/specification hashes before copying. When updating the architecture, trace changed source, update the pinned revisions and content, edit the candidate, and rerun complete Archify finalize with a fresh evidence directory. Do not hand-edit generated HTML.

Project verification:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Final result: typecheck/lint/build pass; 39 test files, 715 tests pass. New tests check artifact hashes/gates, source revisions, storage claims, protected route classification, rendered documentation, and the rolling-session examples. Node 26 reports existing experimental localStorage warnings in tests; these are non-fatal.

Browser QA uses Playwright + axe from an external existing test-tools installation, not a new project dependency:

```sh
NODE_PATH=/private/tmp/kg-english-browser/node_modules \
KG_UI_URL=http://localhost:3217 node scripts/verify-architecture.mjs
```

Final result: 40 browser assertions; zero page exceptions; zero workspace axe WCAG A/AA violations on desktop 1440×1000 light and mobile 390×844 dark. Seven diagrams render at both sizes; no document horizontal overflow; guest/USER guards, forged cached-role rejection, VI/EN switching, and both lifetime scenarios pass. Auth/API responses are synthetic fixtures; no live-backend or OAuth-provider integration is claimed.

Screenshots/report: `.impeccable/review/architecture/` (development evidence, not public assets). Five focused screenshots were inspected in each of two bounded rounds. On a narrow phone the full-system diagram is an overview and labels require zoom/fullscreen or a wider view; the upstream viewer's bottom toolbar can locally clip at that width even though the document has no horizontal overflow. This is a known viewer limitation, not a claim of perfect mobile diagram controls. Mechanical Impeccable detector returned `[]` for the new page/workspace.

Earlier verification issues were resolved: a test file initially used a suffix excluded by the existing Vitest config; then a rendered-copy assertion and React createElement children lint error were corrected. The first browser fixture scripts also executed inside opaque sandbox frames and raised storage exceptions; fixture initialization now runs only in the top frame, preserving the safer iframe sandbox. An incomplete `/tmp/kg-browser-check` installation was replaced by the existing complete test-tools path above. No failures were suppressed.

## Direction contract

Mode: Read. Audience: the owner learning backend system design while operating a real product.

THESIS: trace this application's real data/control boundaries and explain rolling authentication without treating token TTL as session TTL.

OWN-WORLD: inherit Alpine Commons semantic tokens, Geist typography and existing admin shell; retain light/dark and VI/EN controls. Archify diagrams remain their independently validated visual artifacts.

STORY: start from the one-week question, explore seven focused diagrams, then inspect technology ownership, domain storage, auth details and source limitations.

FIRST VIEWPORT: task heading and concise session answer, followed by anchor contents and a diagram selector; the full-view link sits next to selection rather than hiding behind a modal.

FORM: code-led local admin extension; no new visual identity or concept seed. Signature interaction is switching a single mounted diagram, paired with a two-scenario rolling-lifetime timeline.

FINISH: parent visual/source review completed; preserve existing DESIGN.md rather than rewriting the global identity. This does not claim an independent subagent review.
