# Pagination and iPhone 13 learning controls

## Scope

Fetched and pulled latest `origin/main` (`8cf58d9`) before work. No backend changes. Preserved Java/AWS tracks, grouped module previews, search, API contracts, editor drafts and desktop practice sidebar.

Source inventory found ten shared Pagination render locations across nine routes, including the two learning-admin states:

- `/questions`
- `/admin/users`
- `/admin/comments`
- `/admin/posts`
- `/admin/content` — question workspace
- `/admin/knowledge/drafts`
- `/admin/learning` — account picker
- `/admin/learning?userId=…` — learner records
- `/quiz/[moduleId]` — quiz history
- `/mock-interview` — interview history

Writer, catalog, blog and other routes without paginated APIs were not given artificial pagination.

## Changes

Moved admin user/comment/article/question pagination out of narrow directory columns and after the complete master-detail/editor grid. Added explicit full-height flex-column page wrappers to those views and quiz/interview history. The existing correctly structured AI review and learning-admin footers were retained and tested. Content-workspace flex sizing applies only to the visible question tab, preserving hidden tab behavior.

`/learn` now places mobile practice links inside the selected module card, outside the selection button (no nested interactive controls). They remain attached in grouped, filtered-topic and search layouts. Selecting another module moves the links; selecting the same module again collapses them. Desktop retains its sticky side panel. Module buttons expose expanded state and controlled regions. Group-expansion controls now reference an existing DOM target.

Track and topic filters are separate labeled sections. Tracks use a muted bordered region and rectangular controls; topics use a separate flat section with rounded chips and the chosen track in its heading. Helper text explains their relationship and the module-to-practice action in VI/EN. Existing track filtering and topic reset behavior remains intact.

Quiz setup now uses one column on phones, two at the small breakpoint and four on wide desktop. The action aligns to field bottoms rather than stretching across labels. Inputs, selects and submit button share 44px height.

## Verification

```sh
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-pagination-layout.mjs
```

- Lint, typecheck, 126 tests across 21 files, production build and diff check passed.
- Impeccable detector over changed UI targets: no findings.
- Browser suite: 75 checks, 69 captures/Axe scans; zero viewport overflow, page exceptions, unmatched fixture requests or WCAG A/AA Axe violations.
- Viewports: desktop 1440×900, iPhone 13-sized portrait 390×844 and landscape 844×390.
- All ten pagination contexts tested populated (ten pages) and empty (zero API pages). Assertions check page-container center (within 2px), distance to bottom of main content, number-window size and page-five selection.
- Mobile module choices exercised with synthesized taps on the first, middle and last visible module, after group expansion, topic filtering and search. Assertions verify three working links, correct flashcard destination, one visible local choice panel and a gap no greater than 2px between module button and panel.
- Desktop verifies the practice sidebar remains visible.
- Quiz asserts the four controls share 44px height and the submit button's bottom aligns with the adjacent field where columns apply.

Local ignored evidence: `.impeccable/review/pagination-mobile/report.json` and screenshots in that directory.

## Limitations

All API responses are intercepted synthetic fixtures. This does not verify backend persistence, permissions or production deployment. Browser engine is Chromium, with mobile viewport/device-scale settings and synthesized touch, not Safari/WebKit or physical iPhone hardware. Native Safari keyboard, safe-area behavior and real-device font rendering remain unverified. The geometry matrix targets pagination and module choices; it is not a claim that all unrelated product flows were exhaustively tested.
