# English Studio surface brief

**Mode: Operate.** Extend the existing Alpine Commons identity; do not replace the app shell, authentication or global landscape.

## Direction

Four skill stations lead to one focused practice desk. Desktop pairs source material and the learner's response; mobile stacks them in reading order. The practice trail is a flat list, not fabricated analytics, nested dashboard cards or a promised certificate score. Use existing Geist, semantic teal/mist and night tokens, Phosphor icons and native audio controls.

The main action is submit, with secondary explicit draft save. Submission confirmation is inline. A submitted response is read-only; return to the exercise picker to create a fresh attempt. Errors preserve text; stale conflicts require reopening the latest owned server state.

## Implemented

- Route `/english`; navigation in Vietnamese and English.
- Nine original VSTEP-task-aligned exercises from the backend authored catalog.
- Listening: three real static MP3s and objective practice feedback; transcript only in the submitted API DTO.
- Speaking: opt-in MediaRecorder, cancellation of pending permission, five-minute stop, playback and download. Audio is tab-local; speaking reflection text is saved to BE.
- Reading: short passage, MCQs and explanations.
- Writing: email/letter and essay, 120/250 suggested minimum word counts, explicit saved draft and server resume.
- Optional elapsed practice timer, immutable final submission, owner-scoped paginated history, deep-link restore.
- Day/night themes, VI/EN UI, keyboard labels/fieldset controls, mobile portrait/landscape.

Not implemented: official/full mock exams, certified B1/B2/C1 classification, AI pronunciation/writing grading, server audio storage, offline persistence, automatic draft save or an English authoring CMS.

## Sources and audio reproduction

Standard-format reference: https://vstep.vnu.edu.vn/test-format/ . Content/scripts are original mini-practice, not copied official examination materials.

Audio uses **eSpeak-NG synthetic speech**, not human exam recordings. Conversation alternates two voice variants. The GPL-3.0 engine is a build-time tool in a temporary folder, not an application dependency or shipped runtime. Metadata: `public/english/audio/provenance.json`; script copies: `docs/english/audio-scripts/`.

From the frontend repository with the backend checked out next to it:
```bash
npm install --prefix /tmp/kg-english-speech --no-save @echogarden/espeak-ng-emscripten@0.3.5
NODE_PATH=/tmp/kg-english-speech/node_modules node scripts/generate-english-audio.mjs
```
Requires ffmpeg. Generator reads the three released listening transcripts from backend EnglishCatalog, writes MP3s and source text copies, and preserves filenames. Audio durations are approximately 47, 67 and 91 seconds, not 40-minute official listening papers.

## Verification

```bash
npm run build && npm run typecheck && npm run lint && npm test
npm install --prefix /tmp/kg-english-browser --no-save playwright @axe-core/playwright
# Start the already-built frontend on localhost:3214, then:
NODE_PATH=/tmp/kg-english-browser/node_modules KG_UI_URL=http://127.0.0.1:3214 \
  node scripts/verify-english-room.mjs
```

230 unit tests / 35 files passed. Browser fixtures passed 71 checks and generated 18 screenshots across 1440×1000, 390×844 and 844×390; zero JS errors, unmatched API calls, horizontal overflow or automated WCAG A/AA violations. Audio decoding and MediaRecorder encoding/download use the browser, with a fake microphone; all API responses/writes are synthetic and intercepted.

Summary evidence: `browser-verification.json`. Local screenshots and generated fake-device recordings: `.impeccable/review/english/` (ignored test artifacts, never learner recordings).

Design detector: no findings (`[]`). Final captures were inspected; the existing shared floating UtilityBubble may cover a portion of long headings on mobile, a remaining app-shell issue outside this feature's redesign. Actual iOS Safari, real microphone, full server integration and production deployment are still unverified.

Pre-push review fixed retry of an unavailable attempt deep link and editing the old workspace during an in-flight attempt switch. Browser regressions cover both at all three viewport sizes.

API/persistence constraints and backend verification are detailed in `knowledge-gym/docs/29-english-studio.md` from the workspace root.
