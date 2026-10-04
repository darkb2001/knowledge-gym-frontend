# Alpine Commons: reference-inspired authentication and shared scenery

## Scope and visual authority

The owner supplied a dark and a light mountain-login reference and explicitly requested an original similar background, motion, a shared web background and iPhone 13 quality. This supersedes the old beige/light-only palette. The implementation interprets that visual direction; it does not ship, stretch or crop the reference screenshots.

Original artwork lives in `components/MountainScene.tsx`: layered mountain facets, pine silhouettes, river, mist, sun/moon and stars. All are local SVG geometry; no external image requests, graphics library, pointer tracker or JavaScript animation loop was added. Root layout supplies one fixed scene across routes. Authentication adds a portrait composition inside the desktop frame; mobile hides that extra panel and keeps the global landscape.

`AuthShell` now presents a refracted/translucent centered window, stable form, theme control and the existing VI/EN switch. The shared frame also covers registration, password recovery and verification. Study/editor work remains on near-opaque surfaces so ambient motion does not compete with reading.

## Behavior preserved

This styling commit does not edit `app/(auth)/login/page.tsx`, `lib/auth.ts` or `lib/api-client.ts`. Before pushing, it was rebased onto upstream `41d34dd`, preserving its learner-flow fixes, conditional login verification recovery, resend-code controls, public/admin navigation grouping and radar overflow fix. Verification recovery is checked in its upstream-supported error state rather than restoring an obsolete unconditional footer link. Email/password fields, required flags, input types, autocomplete, validation, session restoration, error recovery, Google action, verification/recovery/register links and safe `next` redirect remain unchanged. No backend, auth capability flags or API contracts were changed.

The new `kg.theme` preference defaults to light, persists locally and synchronizes across tabs. The pre-paint bootstrap reads only that preference, not tokens/cookies. Preference write failures do not prevent in-memory switching. Native controls follow the selected color scheme.

## Responsive and motion details

- Auth window: 1032px maximum, .88 / 1.12 desktop split; below 768px, a single form column capped at 460px.
- Login fits the checked iPhone 13 portrait viewport (390×844). Landscape (844×390) and shortened viewports scroll naturally; no fixed-height form or scroll lock was introduced.
- Auth inputs/buttons: at least 48px tall; input text 16px to avoid sub-16px iOS focus zoom. Mobile safe-area padding and Safari-prefixed backdrop blur are included.
- The app theme switch moves to the mobile navigation toolbar below 640px, preserving room for the brand in the header.
- Mountain drift: 29–38-second alternate cycles; mist: 25–33 seconds. Content/forms do not move.
- Follow-up: sky effects use a separate responsive band rather than the terrain viewBox. This fixes the exterior flock being cropped/hidden behind the auth frame, while preserving the original landscape geometry.
- Daylight: two six-bird flocks per scene, repeating 24-second passages offset by 12 seconds, with staggered 1.6-second wingbeats. Birds pause at night.
- Clouds: three soft SVG layers drift over 74/91/107-second cycles; night lowers their opacity. No animated blur/filter or graphics dependency was added.
- Night: five recurring tracks on 9/11/13/10/12-second cycles, staggered .4/2.2/4.2/6.4/8.3-second starts. Flights last roughly one second, with much closer appearances than the previous two 19/27-second tracks. Meteors pause in daylight.
- Reduced motion stops terrain/fog, freezes birds/clouds and hides meteors. A cleaned-up visibility listener pauses all decorative loops when the document is hidden; CSS also pauses the mobile-hidden story.
- Scrollbars previously used the fixed beige `#b7bcad`. Standard scrollbar colors and WebKit thumb/track/hover now resolve from current-theme control/surface/accent tokens; native scrolling remains intact.

### Snow alignment correction

The owner's observation about the white summit pieces was valid: independently authored cap endpoints did not consistently meet the ridge edges. `lib/landscape.ts` now derives left/right snow intersections from those actual edges and aligns the lower tip to the facet line. Snow shading uses the same mountain facet and is clipped to the snow outline. Caps live inside their animated ridge group, so terrain and snow cannot drift apart. Unit tests cover all five peaks and instance-specific clips.

## Verification

Commands in the frontend repository:

- `npm run lint`: pass, zero ESLint warnings.
- `npm run typecheck`: pass.
- `npm test`: **166 passed / 26 files**. New coverage includes both theme palettes/contrast, preference/storage handling, CSS-token synchronization, original login contract, all snow boundaries/facet alignment and scene clip IDs/bird/meteor counts. Node's existing experimental localStorage warning remains.
- `npm run build`: pass.
- `NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-scenic-auth.mjs`: **282 checks, 70 captures/Axe analyses**, plus four deterministic normal-motion frames. Matrix: 1440×900, 1280×800, 390×844, 844×390 and 320×740; light/dark auth routes, VI/EN, error/input retention, conditional email-verification recovery, success redirect, preference persistence, 48px targets, theme-responsive scrollbar colors, reduced-motion clouds, normal bird/meteor/cloud rendering, exterior birds geometrically above the auth frame on desktop/iPhone 13, infinite recurrence and simulated visibility-change pause/resume. A 390×500 viewport also verifies that submit can be scrolled into view; this is not a native keyboard test.
- `KG_UI_URL=http://127.0.0.1:3217 NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-pagination-layout.mjs`: **75 checks, 69 captures/Axe analyses**, pass in the preceding shared-header pass; not rerun for the motion-only follow-up.
- `KG_THEME=dark KG_UI_URL=http://127.0.0.1:3217 NODE_PATH=/tmp/kg-browser-check/node_modules node scripts/verify-growing-lists.mjs`: **150 checks, 39 captures/Axe analyses**, pass for the shared night theme, map/history/leaderboard and large catalogs. Rerun successfully after the motion/scrollbar follow-up. A light-theme run also passed 150 checks in the original scenic pass.
- `git diff --check`: pass.

No viewport overflow, page errors, unmatched fixture requests or Axe violations were reported by the passing browser suites. Normal-motion screenshots settle theme transitions and freeze the meteor at a known flight phase rather than misrepresenting an intermediate theme paint as a defect. Hidden mobile story instances are excluded from motion-frame assertions because they do not have active rendered animations.

The first auth inspection identified 44px input specificity and a nonessential footer contrast issue; the fields were fixed and the extra footer removed. Later shared-theme inspection caught dark SVG labels, which now use semantic fills while the numeric mastery circles retain their readable dark text. The Impeccable scan reported 25 palette/radius/type advisories against the old design document and no hard findings. `DESIGN.md`, its sidecar and the product brand commitments now record the owner-approved replacement world; no independent reviewer verdict is claimed.

The follow-up detector over `MountainScene.tsx`, `scenic.css` and `globals.css` reported 51 advisory-only color/type/radius findings, largely existing legacy styling and intentional artwork/glass materials; no hard findings. Active LSP checks confirmed all three changed TS/TSX files clean. Desktop/mobile light/night normal-motion frames were visually inspected together.

Evidence is stored locally under `.impeccable/review/scenic-auth/`, `growing-lists-dark/` and `pagination-mobile/`. Screenshots use intercepted synthetic APIs and Chromium. They are not live authentication/OAuth, backend persistence, Safari, physical iPhone, native keyboard/safe-area or whole-product accessibility proof. Production deployment is not confirmed by these checks.
