# Task-oriented UX quality pass

## Source and intent

Fetched `origin/main` and fast-forwarded a clean frontend from `86ce1df` to `6c44bdf` before changing code. Preserve upstream notes, interview, authentication, password and flashcard work. Preserve Study Commons identity, VI/EN UI, API contracts and sanitization.

This is an Operate/Read refinement, not a new visual identity or a certification that every user journey is perfect. Impeccable and the existing-project redesign guidance informed the implementation. No external reviewer was used.

## Observed defects and changes

- AI review pagination was centered in the left grid column, not the page. An always-present empty right column compounded the problem. The footer now sits after the grid and spans the page; the second column exists only with a selected draft. It remains visible for empty/loading states and is disabled when requests fail or run.
- The shell subtracted hardcoded header heights and forced every first child into flex-column layout. Shell height now flows through a viewport-height flex container; explicit `kg-page` layouts opt into footer distribution rather than changing the display of arbitrary route roots.
- Parent and child admin navigation entries were both active. Only the most-specific matching link is active. Header branding is width-constrained for narrow screens.
- Heading scale and gutters are more consistent. Loading status is neutral rather than styled as a successful operation. Mobile page numbers form their own centered row instead of wrapping navigation into an uneven sequence.
- The knowledge-intake page initially required a manual list load and showed a long blank form by default. It now loads automatically, presents existing goals first, and opens creation on request. Fields explain scope, domains, daily limits and budgets. Advanced publishing is progressive disclosure and defaults off. Creation uses a native form with required fields and numeric range validation. Source URLs remain server-validated. Existing status/run API contracts are retained, mutations report actual acknowledgements, archive asks for confirmation, and unsaved drafts are guarded.
- Learning administration used a raw UUID input as its main interaction. A real paginated `/admin/users` lookup now accepts name/email and opens the chosen learner's records. UUID lookup remains advanced, and existing `?userId=` deep links remain supported. Record type labels describe quizzes, flashcard schedules, interviews and progress.
- AI review displayed raw JSON first. Known payload fields now produce a readable preview via `LearningContent`; JSON remains available under details. Unknown/malformed shapes have an explicit fallback rather than an invented preview. HTML remains sanitized; source content is not translated. The reason field explains what the reviewer should record. Module selection resets between drafts.
- Dashboard charts did not answer what the learner should do next. A list of up to three lowest-mastery modules now links to flashcards and quizzes using API radar data. It does not fabricate recommendations, session availability or scores.
- Mindmap required horizontal graph scanning, especially on mobile. Module names, question counts, mastery and working practice links now appear in a readable directory. The graph remains available as an expandable view, with keyboard-scrollable containment, retry and empty-state recovery.
- Profile had an invalid description-list group (a paragraph alongside `dt`/`dd`). Supporting copy now sits within `dd`. The heading describes account security as well as profile editing. Existing password APIs and avatar upload remain unchanged.
- `AdminField` lost accessible associations when children included whitespace or a sibling error message. It now finds and clones the native field while retaining adjacent content. Regression tests cover label, hint and existing description associations.
- Code toolbar separation was overridden by reading-content spacing. The combined toolbar/code surface now uses sufficient selector specificity to remain connected.

## Verification

Commands:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
git diff --check
NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-ux-quality.mjs
```

Results:

- Lint and typecheck pass.
- 21 test files / 123 tests pass, including known/malformed draft payloads and multi-child accessible admin fields.
- Production build passes, generating 32 static pages plus dynamic routes/middleware.
- Production dependency audit: zero vulnerabilities. This is not a full tooling audit or security certification.
- Browser: 80 checks, 72 captures/Axe analyses across 1440×900, 1280×800, 390×844 and 320×740. No horizontal viewport overflow, browser exceptions, unmatched fixture requests or Axe WCAG A/AA violations in tested states.
- Captured routes: learn, questions, dashboard, profile, notes, mock interview, mindmap, admin users, learning, knowledge goals and learning drafts. Additional states: selected/empty review, selected goal, create-goal form, selected learner, English profile and English empty review.
- Geometry assertions check AI review footer centering against the main content container and bottom position for an empty list. Page selection verifies five consecutive numeric buttons and page 5 acknowledgement. Preview XSS fixture remains inert.
- Impeccable mechanical scan: no non-advisory findings; 13 palette/radius advisories from existing reading/graph styles remain. No visual-world drift repair was attempted.

Browser artifacts (ignored local files): `.impeccable/review/ux-before/` and `.impeccable/review/ux-after/`. The script uses intercepted synthetic API fixtures exclusively. It does not prove live authorization, queue processing, persistence, content quality or deployed production behavior.

## Remaining coverage and product risks

- The new browser suite does not complete every quiz/flashcard/interview/editor/auth flow, every backend error or permission matrix, or every long-data variant. Existing unit coverage is not a substitute for those journeys.
- Browser fixtures use a syntactically valid expiring test JWT to exercise the current client guard, not an old arbitrary token. Fixture interception is not an auth bypass in application code.
- AI source IDs still require external/backend lookup for provenance; the frontend cannot invent citations or source URLs absent from the API.
- AI intake has no live queue polling/status feed in this page. The acknowledgement explicitly says queued, not completed; new material must be checked in review after processing.
- Unsupported admin capabilities remain gated; no capability flags were enabled.
- Production deployment and live API checks are separate from this local verification.
- A complete end-user release gate still needs real backend journey tests, realistic long learning content, manual keyboard/screen-reader review, and production smoke checks for learner and admin routes.
