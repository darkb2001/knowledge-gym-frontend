# English Studio — implementation and verification

**Operate mode; preserve Alpine Commons:** Geist, semantic teal/mist and navy/aqua, Phosphor icons, existing shell/authentication/navigation. Study tasks outrank theatrical motion. Mobile vocabulary modes wrap so all five labelled actions are discoverable.

## End-user task spaces

- Four-skill practice with an explicit preparation-track selector: VSTEP.3–5 or internal postgraduate English entrance preparation for HCMUS (KHTN–ĐHQG-HCM). Do not apply HCMUS's format to HUS–VNU Hanoi. See [KHTN.md](KHTN.md).
- **47 original catalog entries:** 31 VSTEP-task practice entries, including nine preserved warm-ups and two composite Listening/Reading sets; 16 targeted HCMUS preparation tasks. Composite sets reuse individual material, not independent new examination papers.
- VSTEP Reading: four original passages / 40 MCQs / 2,151 words / 60-minute guidance. Listening: eight notices / three conversations / three talks, 35 MCQs, approximately 40-minute guidance. A section selector preserves answers across sections and global question numbering. These sets are not difficulty-calibrated official examinations.
- **18 worked responses** after owned-attempt submission only: six VSTEP Writing, eight VSTEP Speaking, two HCMUS transformation tasks and two guided-speaking tasks. Complete text with bilingual explanatory notes; no subjective numeric grade, official answer or certified band.
- Eight added HCMUS tasks: sentence completion15×2, cloze10×2, context vocabulary10, wetland reading10, transformations5 and study-routine guided speaking. Original practice aligned to current task counts, not recent past papers or forecasted topics. Sources from 2024–2026, including UIT's currently linked HCMUS format, are documented in [KHTN.md](KHTN.md).
- HCMUS initial targeted tasks: vocabulary (10 MCQs), sentence completion (15), cloze (10), sentence transformation (five prompts, self-review), introduction/guided conversation, ten short conversations, a five-question long conversation, and a 20-question Listening set grouped 10 + 5 + 5. Shared Reading/Listening tasks are explicitly labelled transfer practice. The Listening set follows official section/question counts but is original, not an institution paper or calibrated assessment. The room is **not a complete timed/weighted four-skill HCMUS mock**. HCMUS keeps its explicit study-track URL across reload and transfer tasks; unrelated historical VSTEP tasks restore their own track. “Ngữ pháp & Viết” names the actual task type rather than implying essay-only study. Bookmark `/english?track=hcmus`.
- Vocabulary: **20 topics × 8 cards = 160 cards / 158 distinct phrases**, five modes (learn, meaning choice, meaning-to-writing, dictation, matching). Four-item maximum finite queues, unseen items until exhaustion, final short review batches, all/revisit selection, searched phrase first, topic-only reset.
- Account-scoped tab metadata preserves mode/location/queues/seen/known/review through reload. It is not server history, device sync, mastery, XP or SRS. Feedback-assisted answers and corrected mismatches stay queued to revisit. Owner-change/logout fences clear former metadata; storage denial supports in-memory practice.
- The optional own sentence is **not saved or graded**; navigation/reset warns before discarding it. Speaking audio is also tab-local, opt-in, playable and downloadable; only reflection text is saved to the server. No transcription or automatic upload.
- Explicit draft save/resume, failed-save text retention, stale conflict recovery, immutable submission, owned paginated history and deep-link restore. Timer is suggested practice time, never automatic submission. Recorder has permission cancellation, late-stream cleanup and a five-minute cap.

- Listening has an opt-in **show/hide transcript before submission**: authenticated dedicated `GET /english/exercises/{id}/transcript?partId=...`, script only, validated Listening/section membership. Hidden by default, no fetch before opt-in, per-mounted-section cache, error/retry, cancellation guard; switching section/exercise resets visibility. Explain assisted listening rather than independent assessment. Public catalog and draft responses still omit transcripts; keys/explanations/models remain submitted-owned-attempt feedback only. A single transcript control beside the player replaces the redundant post-submit transcript disclosure.
- The learner-facing external-site reference note was removed from Vocabulary at the user's request in both locales. Internal source/licensing/provenance records remain; this does not assert that all phrase facts were invented here.

## Audio

**171 static neural MP3s:** eleven Listening files (including two composites) plus 160 phrase clips. Kokoro v1.0 / kokoro-onnx 0.4.7, pinned hashes, British voices, build-time only. No model runtime or learner text sent to a service. Original nine exercise prompts/IDs/keys are preserved. See [AUDIO.md](AUDIO.md).

## Reproduce verification

Backend checked out beside frontend:
```bash
cd ../knowledge-gym
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  bash scripts/test-english-room.sh --local-postgres
cd ../knowledge-gym-frontend
node scripts/sync-english-test-fixture.mjs
python3 scripts/test-english-audio-build.py
npm run lint && npm run typecheck && npm test && npm audit --omit=dev && npm run build
# Run the built frontend on 127.0.0.1:3226, then:
NODE_PATH=/tmp/kg-english-browser/node_modules KG_UI_URL=http://127.0.0.1:3226 \
  node scripts/verify-english-room.mjs
```

The versionable `.fixtures/english/` test artifact contains **original authored** keys/models for tests. It must never be imported into app code, placed under public assets or exposed as the exercise API. The browser harness explicitly whitelists catalog fields and reveals keys/explanations/models only after submit; a separate script-only fixture simulates the intentional opt-in transcript endpoint. `sync-english-test-fixture.mjs` binds it to the compiled backend bank; frontend CI can run without the adjacent backend.

## Latest local evidence (2026-10-10)

- Frontend lint/typecheck/build pass; **708 tests / 38 files** pass. Production dependency audit: `found 0 vulnerabilities`.
- **271 browser checks / 51 screenshots** across 1440×1000, 390×844 and 844×390, VI/EN and light/dark. Zero JS errors, unmatched API requests, horizontal overflow or automated WCAG A/AA findings in captured states.
- All 18 reference-response tasks exercised on desktop; representative Writing/Speaking and HCMUS grammar across all viewport classes. Models absent before submit and complete after submit. Reading section switching retains all 40 answers.
- Native MP3 decode/rate/rewind/error recovery, fake-microphone recording/download and cancelled-late-permission cleanup. No learner audio uploads.
- All five vocabulary modes, wrong/assisted-answer semantics, final short review queue, no-repeat matching batches, persisted mode/queue after reload, accent-insensitive and empty search, discard cancellation/confirmed reset, local fixture user-change isolation, simulated progress-storage denial and cross-tab logout-intent metadata cleanup.
- **171 MP3s decoded with ffmpeg**, all output/source hashes verified. Six Python authoring-helper tests cover cache input/byte validation, atomic JSON, safe composition, failure preserving existing output and bounded log recovery.
- Final Impeccable detector returned `[]` using the absolute workspace skill path (an initial relative path failed exit127 and was corrected). Current active LSP: five changed UI/API paths checked; two clean, two existing beforeunload `returnValue` deprecation hints deferred for compatibility, and the client-to-client callback serialization warning marked false-positive without inline suppression. Nineteen auxiliary English-checker suggestions on Vietnamese text were informational, not build errors. Earlier authoring LSP: 4/8 paths confirmed clean, 3 inconclusive, one Python authoring path with five unresolved imports (numpy, onnxruntime, soundfile, kokoro_onnx, local english_audio_build) because the editor workspace does not resolve the external authoring venv/scripts. Findings deferred, not suppressed. Actual pinned-venv synthesis and cached rerun passed; no blanket LSP-clean claim.
- Expected test-time warnings: Node experimental localStorage; existing Gradle wrapper/deprecation warnings. No suppression of production dependency advisories.

Summary: [browser-verification.json](browser-verification.json). Ignored screenshots and fake-device recordings: `.impeccable/review/english/`. Final functional/axe confirmation refreshed HCMUS guide/listening/grammar, standalone transcript/feedback and all five vocabulary-mode captures and retained the earlier complete visual batch for unchanged screens; no open-ended visual-polish loop. See captureMode in the detailed report. A verifier race was corrected to await the actual workspace before answering; it does not silently skip unmatched question IDs.

## Remaining acceptance boundaries

The preceding **39-entry** release was committed/pushed (FE `6013889`, BE `4936085`) and its CI/deploy workflows succeeded. The **47-entry/transcript/note-removal** results above are a pre-commit local checkpoint; subsequent commit/push/deploy status must be checked in Git history/GitHub Actions, not inferred from these tests. Frontend production smoke of the preceding release was skipped behind HTTP429; no real authenticated end-to-end JWT/cookie/DB/Redis/CORS journey is claimed. Browser API responses are intercepted fixtures; backend persistence uses disposable PostgreSQL. User-change/storage-event tests are metadata simulations, not proof of live account-switch or server revocation. Physical iOS/Android playback/microphone and human pronunciation/pedagogy still require acceptance. Existing shared UtilityBubble can overlap content on small screens; no app-shell redesign performed.

No official full four-skill mock, score calibration, AI grading, audio storage, autosave, offline server saves, English CMS or wholesale third-party-bank import. These limits are visible to learners, not hidden behind fixture/build success.
