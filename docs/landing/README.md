# Public Knowledge Gym landing

## Scope and authority

`/` now introduces Knowledge Gym publicly rather than redirecting to `/learn`. The exact root is public; it is **not** a public prefix that opens all routes. `/learn`, `/english`, notes, progress and admin remain protected. Ordinary links enter the existing auth gate, retaining `?next=` and English track deep links. No session restoration, learner-data request or practice mutation is introduced by the landing.

The existing Alpine Commons palette, locally hosted Geist fonts, VI/EN providers and theme preference remain authoritative. `DESIGN.md` and `.impeccable/design.json` are intentionally unchanged. This is a new **Persuade** surface, not a redesign of the learning shell.

## Surface direction, grounded in the implemented build

- **Thesis:** “Tập cho kiến thức thành phản xạ.” Show the difference between reading and being able to explain.
- **Own world:** Alpine Commons mist/teal and navy/aqua, brought forward through wide typography and flat editorial sections. No invented metrics, testimonials, official-exam claims or automatic AI promises.
- **First viewport:** a clear learning CTA and a genuinely explorable local cache-aside lesson. Visitors can understand the product without signing in.
- **Story:** introduction → understand/try/review → separate IT and English paths → published articles → a specific invitation to learn.
- **Signature interaction:** finite, user-controlled cache-hit/cache-miss playback with individual steps. The demo saves nothing and is explicitly illustrative, not Knowledge Gym telemetry or deployment topology.

### Route-local rules

`app/landing.css` owns this surface only. Its display ramp intentionally differs from the 26px task-heading ramp in the existing app: the desktop hero uses `clamp(48px, 5.6vw, 81px)`, section headings `clamp(36px, 4.2vw, 58px)`, and mobile uses its own fluid display sizes. Text and control radii are local to these editorial/diagram roles; they do not replace global tokens. The mechanical detector reported **40 advisory** font-size/radius differences and **zero non-advisory findings**. No detector suppression or global design-token rewrite was applied.

The root figure is a teaching interaction, not a fabricated screenshot. The shared scenic backdrop is hidden only while `.kg-landing` exists. An idle study utility is also hidden on this public surface to avoid obscuring the diagram; a utility already playing music remains available so the user can pause it. On other routes the utility and landscape retain their existing behavior.

Hero entrance is one finite staggered typographic/diagram moment. Playback advances through four discrete stages, stops at the result, pauses when requested, when the document is hidden, or when the demo leaves view. Reduced motion disables entrance/trace animations and playback; manual scenario and step controls remain usable. No new animation library, scroll hijack or pointer/scroll-driven React rendering was added.

## Public content boundary

`PublishedArticles` fetches only `GET /blog/posts?page=0&size=3`, with `credentials: "omit"`; it never uses authenticated transport or an admin fallback. Backend published-only queries remain the authority. Frontend normalization additionally rejects explicit non-PUBLISHED status, malformed required fields and dates, deduplicates IDs, limits previews to three, encodes slugs and renders article text through React rather than HTML insertion.

Loading, empty, error/retry and long-text states are included. Abort cleanup fences late responses. VI/EN translates the interface, not the original article content.

## Archify artifact

- Published HTML: `public/blog/demos/cache-aside.html`
- Public URL: `/blog/demos/cache-aside.html`
- Frozen source copy: `docs/landing/cache-aside.json`
- Acceptance receipt: `docs/landing/cache-aside.finalize-summary.json`
- Local authoring/evidence directory: `.archify/sequence-cache-aside-demo-20261011-215627/`
- Type: sequence; `quality_profile: showcase`; opt-in trace motion.
- Final HTML SHA-256: `432a2dfff1697b11be0400c71373a6d25aa9272e0c41806f8c1b84345aec8bab`

The initial candidate failed for legend clearance; the second failed for desktop viewport proportions. The same candidate was repaired without changing its semantics. The final candidate passed **validate, deliver, strict check and browser-check** with no diagnostics. The published bytes are checked against the receipt in unit tests. The finalizer itself reports visual review “not-requested”; separate browser captures of the embedded viewer were inspected.

The heavy standalone viewer loads only after disclosure and unloads when closed. Its sandbox grants scripts and downloads, not same-origin privileges. The diagram and viewer use English, disclosed in the host UI. The compact embedded view has a full-size new-tab link; the local step demo is the mobile-first interaction.

## Verification

Commands run from this repository:

```sh
npm run lint
npm run typecheck
npm test
npm audit --omit=dev
npm run build
NODE_PATH=/tmp/kg-english-browser/node_modules \
  KG_UI_URL=http://127.0.0.1:3228 node scripts/verify-landing.mjs
```

Release revalidation after fast-forwarding the existing auth-storage fix `5b44b634b3d462110802c8a268de0266c0cf41d8`: lint/typecheck/build passed; **735 tests in 41 files passed**; production dependency audit found **0 vulnerabilities**. Tests printed Node's existing experimental-localStorage warnings, not test failures. Active primary-LSP checks on seven changed TS/TSX files returned **0 diagnostics**.

Formatting caveat: `git diff --cached --check` reports 15 trailing-whitespace lines in the generated `public/blog/demos/cache-aside.html`. Its finalized bytes and receipt SHA are deliberately preserved; hand-trimming would invalidate that provenance. No CI/lint/test gate or whitespace policy was disabled. This formatting check is not claimed as passing.

Browser report: `.impeccable/review/landing/report.json`, **75 checks passed**, **14 captures**, **0 uncaught JavaScript errors**. Covers 1440×900 desktop, 1280×800 laptop, 390×844 mobile, 320px narrow mobile, 844×390 landscape/dark, reduced motion, English UI, public request boundaries, opt-in viewer loading/unloading, finite pauseable playback, empty/error/retry/draft filtering/long text, anonymous learning redirects and no-JS introduction/CTA. Automated WCAG checks reported no violations in the checked viewports. First-pass contrast failures were fixed; the final confirmation passed. Captures start at document top; the lazy reader is captured separately in its visible region to avoid offscreen-compositor artifacts.

These are **local production-build checks with intercepted public API fixtures**, not authenticated live-backend, OAuth, physical-device or deployed-production acceptance. Fixture article titles/content exist only in the verification script and are never imported into the app. Captures use fixtures; the running landing reads its real configured public API and shows its error/empty state when appropriate.

## Tooling/review boundaries

OpenDesign's official workflow was researched, but its daemon at `127.0.0.1:7456` was unavailable. No OpenDesign-generated prototype or fidelity claim is made. No image model was available; this is code-led work and a typed, checked diagram, not an image-to-code reproduction.

The executable agent catalog does not contain the shipped Impeccable finish-reviewer/documenter. No other agent was silently substituted and no independent-review verdict is claimed. Implementation/browser review and this scoped documentation were performed by the parent. This tooling gate remains distinct from the passing code/browser checks.

At the implementation checkpoint, no commit, push or deployment had been performed. The owner subsequently authorized the scoped landing commit, push to `main` and exact-SHA CI/deployment monitoring. Release revalidation also reran the 75 browser checks against a fresh local production server on port 3230. The ignored browser report is copied to `docs/landing/browser-verification.json` as durable fixture-based evidence; screenshots and local `.archify/` authoring files remain outside the release commit. Deployment status must be read from the exact commit's GitHub Actions run rather than inferred from this pre-commit document.

Existing learning/auth/English/content-sanitizer implementations were not redesigned. The remote auth-storage fix was preserved by fast-forward, not replaced. Human design approval and deployed acceptance remain separate follow-up work.
