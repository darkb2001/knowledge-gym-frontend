# Growing collections: bounded Study Commons views

## UX behavior

- `/learn`: preserve the separate content-track and topic regions. Up to six choices remain chips; larger sets use labelled native selects. More than twenty choices additionally get accent-insensitive search. The current selection stays available while searching.
- Module selection buttons have equal heights (224px narrow / 240px from `sm`), fixed title/description slots and two-line previews. Full content is available in the selected practice panel; mobile choices remain inside the selected card, desktop uses the existing sidebar.
- Grouped catalogs initially show four topic groups and three modules per group. Show more reveals four more groups or three more modules, not the entire collection. A selected topic starts with six modules and reveals six more at a time. Search/filter/collapse resets these budgets and clears stale selection. Preview counts explain that more content exists.
- Quiz and interview history request **five records per page initially**. The size selector and Show more explicitly request ten/twenty. Size changes return to page one. Existing server totals drive footer pagination. Requests are aborted on cleanup; loading/error/retry states remain explicit and pagination is disabled while loading.
- Dashboard leaderboard previews five people, expands to ten, and explicitly requests `/dashboard/leaderboard?limit=10`. The adapter also caps legacy top-100 responses to ten in rank order. This is not a new leaderboard statistic or a fabricated rank.
- Knowledge map has accent-insensitive module/slug search, mastery bands (below 40 / 40–74 / 75+), alphabetical/lowest-mastery sorting and twelve directory entries per page. Its expanded diagram only renders nodes and connections on that page, with an explicit scope notice. Empty filtered and empty-source states differ.

## API boundaries and rollout

History already supports real server `page`/`size` pagination; the UI does not fetch every history page. It **does not implement a fake global status/date filter**: those query parameters are not supported by the current history APIs. A future server-filter contract is needed for that capability.

Catalog `/topics`, `/tracks`, `/modules` and `/mindmap` still return their complete payloads. Their new preview/pagination/filter controls bound visible content and SVG rendering, **not network payload or backend query/edge-generation cost**. Server pagination/search is follow-up work before truly large catalogs; this pass does not claim to solve it.

The companion backend change caps leaderboard HTTP responses at ten (default ten, optional smaller limit; numeric limits clamp to 1–10). Redis keeps its existing bounded top-100 shared cache. Deploy that backend change to reduce network payload; the frontend remains bounded with the old backend meanwhile. Auth/logout updates on frontend `60e27d5` and backend `35d6b5b` were preserved. No capability flags were enabled.

## Verification

Commands in `knowledge-gym-frontend`:

- `npm run lint`: pass, zero ESLint warnings.
- `npm run typecheck`: pass.
- `npm test`: **146 passed / 24 files**. Includes bounded requests, map search/mastery boundaries, non-mutating ordering, large-picker semantics and leaderboard previews. Node emitted the existing experimental localStorage warning.
- `npm run build`: pass, production routes generated.
- `NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-growing-lists.mjs`: **150 checks, 39 full-page captures/Axe analyses**, plus three selected-card detail captures; zero viewport overflow, page errors, unmatched fixtures or Axe violations.
- `NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-pagination-layout.mjs`: **75 checks, 69 captures/Axe analyses**, all passing. Progressive expansion selectors were updated to match the deliberately smaller batches.
- `git diff --check`: pass.

Large fixtures: ten tracks, thirty topics, 390 varied-title/description modules, 250 history sessions and a legacy 100-person leaderboard. Viewports: 1440×900, 390×844 and 844×390. VI and EN controls were checked at each viewport. Selected-card images were manually inspected; title clamping was adjusted to eliminate a clipped third-line fragment.

Backend scoped HTTP tests: `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew -Dorg.gradle.java.installations.paths=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home :kg-presentation:test --tests '*DashboardLeaderboardLimitTest' --console=plain` passed (**two tests**, including default, smaller, oversized and negative numeric limits). The initial Gradle run could not discover Homebrew Java 21; explicitly supplying the existing JDK resolved that environment failure. The wrapper also emitted its pre-existing `line 49: : command not found` warning before the successful build.

`docker info --format '{{.ServerVersion}}'` timed out after 15 seconds; container-backed integration tests were not run. Browser evidence uses synthetic intercepted APIs and Chromium, not production authorization/persistence, real queue processing, physical iPhone or Safari proof. Deployment has not been confirmed.
