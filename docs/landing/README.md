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

Hero entrance is one finite staggered typographic/diagram moment. Playback advances through four discrete stages, stops at the result, pauses when requested, when the document is hidden, or when the demo leaves view. Opening the enlarged reader pauses the source demo; the enlarged lesson starts from its scenario/step and has independent, disposable controls. Reduced motion disables entrance/trace animations and playback; manual scenario, step and keyboard node controls remain usable.

The motion follow-up adds a native-cursor-preserving follower on fine mouse pointers, bounded hero tilt, a subtle magnetic primary CTA, hover/focus node feedback, finite intersection entrances and scroll-linked artwork/reading progress. `useLandingMotion` batches event-driven CSS-variable updates with requestAnimationFrame, not React state or a perpetual frame loop. Preferences, hidden tabs, listener/observer cleanup and dynamic article insertion are handled. Touch does not get the follower or mouse tilt. No animation library or scroll hijack was introduced. Cache scenario foreground/background colors switch together rather than crossfading through a low-contrast intermediate state.

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

The current enlarged reader is a native `<dialog>` portaled to the document body, with the page-owned interactive demo rather than the heavy viewer. It is outside the hero layout; a bounded scrolling content region keeps the close action reachable. Close, Escape and backdrop dismissal restore focus and scroll; forward/backward Tab wrap within the reader. The source demo is paused on opening. Dialog content mounts only while open. The `DiagramReader` module inherits the client boundary from `CacheDemo`; its client callback is not misrepresented as a Server Action.

The unchanged Archify artifact remains a separate new-tab link (English viewer). During the follow-up, an Axe scan of the previously embedded viewer found `nested-interactive` on its generated SVG. Its immutable bytes were not hand-patched and this standalone accessibility finding is not claimed resolved. The landing no longer embeds it; the page-owned reader passes its own automated accessibility checks. The original artifact finalizer checks above are not an Axe accessibility verdict.

## Verification

### Initial landing release

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

### Diagram-layout and motion follow-up

Current scoped checks:

- `npm run lint`: passed, no warnings.
- `npm run typecheck`: passed.
- `npm test`: **738 tests / 41 files passed**; the existing Node experimental-localStorage warnings remain non-failing.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `npm run build`: passed.
- `NODE_PATH=/tmp/kg-english-browser/node_modules KG_UI_URL=http://127.0.0.1:3236 node scripts/verify-landing.mjs`: **150 checks passed / 0 failed / 15 captures / 0 uncaught JS errors**.

The browser regression suite now measures unchanged hero height and next-section position while opening the reader, background scroll locking/restoration, reachable close action, repeated close/Escape/backdrop dismissal, keyboard focus containment, native node interaction, English reader/scenario controls, mouse tilt/follower shape, scroll feedback and touch/reduced-motion fallbacks. It also checks accessibility with the native reader open in each viewport. Existing published-only transport, protected destinations, error/empty/long-text cases, finite playback and no-JS introduction checks remain. Capture names distinguish the native `desktop-diagram-reader` and `mobile-diagram-reader` from the historical embedded Archify captures.

Current durable report: `docs/landing/browser-verification.json`; local captures remain ignored. These remain fixture-based local production-build checks, not a live deployment or physical-device acceptance. The motion/layout follow-up has not been committed, pushed or deployed at this documentation checkpoint.

## Tooling/review boundaries

OpenDesign's official workflow was researched, but its daemon at `127.0.0.1:7456` was unavailable. No OpenDesign-generated prototype or fidelity claim is made. No image model was available; this is code-led work and a typed, checked diagram, not an image-to-code reproduction.

The executable agent catalog does not contain the shipped Impeccable finish-reviewer/documenter. No other agent was silently substituted and no independent-review verdict is claimed. Implementation/browser review and this scoped documentation were performed by the parent. This tooling gate remains distinct from the passing code/browser checks.

At the implementation checkpoint, no commit, push or deployment had been performed. The owner subsequently authorized the scoped landing commit, push to `main` and exact-SHA CI/deployment monitoring. Release revalidation also reran the 75 browser checks against a fresh local production server on port 3230. The ignored browser report is copied to `docs/landing/browser-verification.json` as durable fixture-based evidence; screenshots and local `.archify/` authoring files remain outside the release commit. Deployment status must be read from the exact commit's GitHub Actions run rather than inferred from this pre-commit document.

Existing learning/auth/English/content-sanitizer implementations were not redesigned. The remote auth-storage fix was preserved by fast-forward, not replaced. Human design approval and deployed acceptance remain separate follow-up work.
