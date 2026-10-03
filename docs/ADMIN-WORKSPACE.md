# Admin authoring workspace

## Surface contract

The owner asked to build frontend before missing backend endpoints are delivered. This extends the existing Study Commons identity, not a new marketing visual world. Mode: Operate for admin, Read for learning material. Existing cream/blue/sage tokens, local Geist, flat task groups and native 44px controls remain authoritative. Design variance 4, motion 2, density 5; tasteful hierarchy is used without decorative animation or a second design system. Taste's marketing-only prescriptions are not applied to data-entry screens.

Routes:

- `/admin` redirects to `/admin/content`.
- `/admin/content`: questions/answers, topic/module catalog and import/job tools.
- `/admin/posts`: manual blog drafts, safe previews, publishing, hide/archive/soft-delete/restore actions.
- `/admin/users`: account directory, role/status changes and session revocation.
- `/admin/comments`: hide/show/soft-delete/restore moderation with required reasons.
- `/admin/learning`: per-user quiz/SRS/interview/progress inspection and audited SRS schedule reset.
- `/admin/knowledge`: AI intake goal configuration, HTTPS domain allowlists, declared budget values and review run queue. Runtime limit/accounting enforcement remains a release gate.
- `/admin/knowledge/drafts`: AI draft review, materialization into nonpublic questions and withdrawal; see backend release gates before enabling generation.
- `/admin/writer` and `/admin/search`: preserved existing tools, now using the shared admin UI gate.

The browser guard is a UX boundary, not authorization. Every backend admin endpoint must enforce ADMIN. Tokens remain in memory; refresh-cookie behavior is unchanged. No production mocks, alternate auth paths or internal cron secrets are introduced.

## Available now

| Backend API | UI |
| --- | --- |
| `GET /topics`, `GET /modules` | Catalog hierarchy and question/post module selectors |
| `GET /questions`, `GET /questions/{id}` | Question directory and legacy editor reads |
| `POST /admin/content/questions` | Create question with HTML answer, module, difficulty, tags and optional order |
| `PATCH /admin/content/questions/{id}` | Edit fields supported by the current contract |
| `DELETE /admin/content/questions/{id}` | Typed-name deletion confirmation |
| `POST /admin/content/parse` | Explicitly approved import from configured server HTML sources, not a file upload |
| `GET /admin/content/jobs/{jobId}` | Poll actual job state; pause/resume and UUID recovery |
| `POST /admin/content/questions/generate-options` | Explicitly approved whole-library regeneration with history-impact warning |
| `POST /admin/blog/posts` | Create manual draft, independent of AI worker availability |
| `POST /admin/blog/posts/{id}/publish` | Publish a saved draft/review article after confirmation |
| `POST /admin/blog/collect` | Collect configured sources after confirmation |
| Writer `GET /review`, `GET /posts/{id}`, `PUT /posts/{id}`, `POST /posts/{id}/reject` | Review directory, direct-ID opening, manual editing and archive |
| Writer settings, runs, stats, revisions, revise, restore, publish | Existing Writer workspace preserved |
| Search settings and ES status/start/stop | Existing Search workspace preserved |

Legacy question reads intentionally do not expose correct-answer flags. Correct flags returned by existing admin mutation responses can be shown, but manual choices remain read-only until the new contract is enabled. Current question saves may regenerate automatic choices; the interface explains this.

The legacy blog directory is explicitly labeled **review queue**, not all articles. Manual drafts not in that queue can be opened by their UUID. A failed readback after a successful create retains the created ID so retrying does not create duplicate posts.

## Backend rollout switches

All default to false and are public build-time capability switches, not secrets:

| Switch | Required backend contracts |
| --- | --- |
| `NEXT_PUBLIC_ADMIN_CATALOG_WRITE=true` | `POST/PATCH/DELETE /admin/content/topics` and `/admin/content/modules` (PATCH/DELETE with `/{id}`) |
| `NEXT_PUBLIC_ADMIN_QUESTION_V2=true` | Admin question list/detail GET including nonpublic contentStatus, PATCH supporting module/order, PATCH `/{id}/status` with status/reason, PUT `/{id}/options`, and preservation of manual options during edits/import/backfill |
| `NEXT_PUBLIC_ADMIN_BLOG_LIST=true` | Paginated `GET /admin/blog/posts` supporting q/status/page/size |

Enable switches only after backend deployment, in Vercel's Production Environment Variables, then redeploy. Do not enable a group with partially implemented contracts. Mutations never silently fall back to another route.

Catalog forms are usable for preparing and downloading JSON drafts while save/delete are explicitly disabled. Question V2 controls are disabled or hidden, with an explanation, rather than pretending to persist data.

Contract details:

- Topic/module payloads: `name`, `slug`, `description`, `displayOrder`; module includes `topicId`. Responses follow existing TopicDTO/ModuleDTO.
- Empty-category deletion only; server must return 409 for nonempty categories rather than cascade deleting learning history.
- Question list and blog list use `{items,page,size,totalElements,totalPages}`, 1-based pagination and stable sorting.
- Option PUT returns an array of `{id,content,isCorrect,displayOrder}`. Minimum two choices, exactly one correct choice. Retain IDs and preserve prior quiz results.
- Errors keep existing Problem Details and 400/401/403/404/409 semantics. An unavailable new endpoint shows an error and retains input, never a fake success.

## Learning content and pagination

`LearningContent` sanitizes all HTML and highlights an explicit, lazily loaded language set. Highlight markup is sanitized again. Copy tools copy the original code text and report clipboard failure. Unsupported languages remain plain code. Long code scrolls inside its own block. Existing HTML flow diagrams stack in narrow containers and become horizontal only when their actual container is wide enough. This is **not** a Mermaid renderer; Mermaid source remains readable code.

Authoring offers raw HTML, preview and split modes, plus escaped code/flow-diagram insertion. Arbitrary executable SVG or script upload is not supported. Original learning content is not auto-translated.

Flashcards now use a native reveal button and a naturally sized answer surface. Answer links/copy buttons no longer flip the card. The 0-3 SRS values and 1-4 shortcuts are unchanged; an in-flight guard prevents concurrent duplicate reviews and the final card advances even without an onFinished callback.

Shared pagination gives up to five consecutive page buttons, first/previous/next/last controls and an exact-page jump when there are more than five pages. Applied to questions, quiz/interview history and the new admin directories. It hides when there is no second page. No total-page count is invented for APIs that do not supply one.

## Other API families

Auth/OAuth, profile/storage, notes/bookmarks/search/export/convert, SRS, quiz, interview, dashboard, mindmap, public blog/comments/likes/RSS remain in their existing learner workflows. Equivalent read endpoints do not need redundant buttons merely to generate traffic. User progress and private notes are not made globally editable by admin.

`/internal/collect`, `/internal/writer`, `/internal/backup` and `/internal/challenge/daily` remain server scheduler/operations APIs. Their credentials must not be exposed in the frontend. New auth/email-verification work being developed separately is excluded from this frontend-authoring commit.

## Administrative platform follow-up

The new user, comment, lifecycle and learning controls require the matching backend and migrations through V028 before frontend deployment. They make real API calls; no fake success or fallback writes are used. Missing endpoints display errors and retain input. Soft deletion is reversible: comment restoration enters HIDDEN; article restoration enters REVIEW and requires explicit publication. Public/removed articles must be hidden/restored before editing; DRAFT/REVIEW edits are supported. Reasons and confirmation are required for moderation/security mutations.

Learning administration currently inspects paginated sessions/cards/mastery and resets SRS scheduling only. It does not edit learner scores, delete attempts or reset XP. Knowledge administration creates bounded intake goals and queues REVIEW-only collection runs; the worker is disabled by default and does not auto-publish. Source configuration requires HTTPS domain allowlisting. Configuration checks do not prove network safety: redirect/DNS/private-network SSRF testing and runtime budget enforcement remain release gates. User invitations/deletion and broader learning-history mutation remain pending; see backend `docs/25-admin-platform-roadmap.md`.

Verification: `npm run typecheck`, `npm run lint`, 78 Vitest tests and `npm run build` pass. `scripts/verify-admin-platform.mjs` covers intercepted desktop/mobile account suspension, comment delete/hidden restore, ownership-bound SRS reset and blog delete/REVIEW restore: 20 checks, eight captures, zero browser errors or WCAG A/AA violations. This requires Playwright and axe available through NODE_PATH and a locally served frontend. Fixtures are not evidence of real backend persistence or production permissions.

## Question lifecycle review checkpoint

With Question V2 enabled against the matching backend, admin list/count includes DRAFT/HIDDEN/ARCHIVED content while public reads stay PUBLISHED-only. The editor shows content status, requires a reason and confirmation for publish/hide, blocks these actions while edits are unsaved, and preserves choices when a status response omits options. Nonpublic content does not expose a learner-page link. Materialization links with `?questionId=` open the requested editor; on narrow screens selection focuses/scrolls to the editing region.

Referenced question hard-delete now returns 409 without erasing or detaching learning/authored content; prefer audited hide. Re-import removal can also return 409. This does not promise full revisions or safe retained natural-key overwrite.

Latest local checks: typecheck/lint/build pass, **83 Vitest tests**. Extended `scripts/verify-admin-workspace.mjs` V2 fixture passed **68 checks, 20 desktop/mobile captures**, zero page errors, unmatched APIs or WCAG A/AA findings. Includes DRAFT deep-link opening, reason-gated publication, empty-options status response preservation and HIDDEN withdrawal. Initial cold dev navigation timed out. A subsequent dev/build overlap caused a login timeout and a TS6053 generated-type race. Restarting preview, rerunning fixtures, then stopping preview before serial build/typecheck/lint/tests resolved these environment failures; final runs passed. API traffic is intercepted, not live backend integration. Rollout defaults remain false; do not enable production flags from this evidence alone.

## Verification boundaries

Unit tests cover pagination boundaries, authoring escaping/sanitization, legacy payloads and capability gating. Browser fixtures must intercept every API write; they prove interaction behavior, not real backend persistence or production auth. Read-only hosted smoke tests prove served HTML/assets, not permission-protected admin integration. Missing backend contracts remain explicitly pending.
