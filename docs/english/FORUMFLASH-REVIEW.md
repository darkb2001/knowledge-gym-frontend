# ForumFlash review — full inventory, original learning material

Reference: https://forumflash.vercel.app/ . Public HTML/JavaScript and real CSV-download UI only; no private API, non-GET requests, sign-in or access-control bypass. Remote JavaScript was parsed as literal data through a TypeScript AST, **never evaluated**.

## Reproducible current inventory

`research-forumflash.mjs` was successfully run on 2026-10-10, not merely written. [forumflash-inventory.json](forumflash-inventory.json) retains aggregate counts, source/asset hashes and export names, not raw definitions/examples/IPA. Raw outputs remain in a temporary authoring directory.

- **20 decks × 200 = 4,000 rows**. Every deck has 200 distinct normalized terms, but across decks there are only **488 distinct normalized terms / 3,512 repeated rows**.
- No blank definitions/examples; **490 distinct exact example strings**. Forty terms occur in all decks.
- Two terms have two definition strings: `learn the ropes` and `level playing field`. Wording variation is not itself a demonstrated semantic error.
- Public phoneme dictionary: 596 tokens. Reproducing token joining gave **zero blank IPA rows**, which establishes coverage, **not expert pronunciation validity**. No source IPA was adopted as authority.
- Bundle SHA-256: `b5d0d28f3415fb7de8732f442cc665122eb65f37964d56e115ec703d59819462`.
- Reusable inventory run: zero page errors/non-GET requests. It used bounded same-origin/no-redirect resource fetches, streamed 1 MB budgets and 15-second deadlines.

Earlier, separate direct reference-site journeys recorded **321 checks/observations and eight screenshots** at desktop/mobile sizes: reveal/example; known/review exclusivity and reload; CSV-to-card agreement; four-choice quiz membership/feedback and no-repeat used sets; blank/wrong/normalized typing; wrong/correct matching and unseen batches. These are **reference-site** observations, not tests of Knowledge Gym. They observed browser speech capability, not human voice quality. Source mobile mode labels were hidden/icon-only without adequate accessible names; our product keeps full labels visible.

## Product decisions

Preserve Alpine Commons: Geist, teal/mist light, navy/aqua dark, Phosphor, Operate mode. Taste-skill's anti-template hierarchy applies selectively; landing-page theatrical motion does not belong in a study tool. Variance 5 / motion 3 / density 4. No navigation/auth/brand redesign.

- **160 original learning cards / 20 topics / 158 distinct phrases**, assembled from topics.json and topic-expansion.json. Four phrases per finite round, final short queues preserved; not 4,000 falsely unique vocabulary items.
- Five distinct modes: learn/reveal, meaning selection, meaning-to-writing, listen/type, matching. Unseen batches until exhaustion; all/revisit queues and exact location restore.
- Wrong, revealed or feedback-assisted answers remain review; correct spelling after help is not labelled unaided recall. Wrong matches remain review after retry.
- Account-scoped **tab-only metadata** survives reload: location/mode/queues/seen/known/review. No cross-device sync, mastery, XP, SRS or server vocabulary history. Owner/logout fences and safe storage failure are explicit.
- Own sentences and recorder clips are private to the live tab and not persisted/uploaded automatically. Sentence navigation/reset prompts before discarding.
- Mobile mode buttons wrap, preserving all five full labels rather than hiding actions behind icons or an undiscoverable horizontal strip.

Meanings, examples and usage notes were independently authored. Topic taxonomy and selected conventional phrase facts were informed by ForumFlash; expansion adds independently selected phrases. No complete source bank, raw examples, IPA dictionary, code, artwork or audio copied into production. No blanket redistribution licence asserted; wholesale reuse would require rights/quality review.

## Audio and verification

Local pre-authored Kokoro neural MP3s replace robotic eSpeak. Browser voice availability/cloud credentials do not determine speech quality at runtime. Dialogue alternates British voices; player offers native speed, rewind, buffering/error/reload and detached-player cleanup. See [AUDIO.md](AUDIO.md).

Knowledge Gym local verification is documented separately in [ROOM.md](ROOM.md) and browser-verification.json. API calls are intercepted authored fixtures; MP3 playback and fake-microphone MediaRecorder are browser operations. Source inventory, byte hashes, decode, compilation, fixtures and automated WCAG checks **do not validate human pronunciation, calibrated difficulty or authenticated production**.

No AI grading/transcription, certified CEFR/exam conversion, offline server saves, automatically uploaded learner audio or runtime third-party-content import worker. Human language/audio QA and physical mobile acceptance remain release checks.
