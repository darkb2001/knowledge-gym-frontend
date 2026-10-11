# Neural English audio — complete, resumable authoring

**172 authored static MP3s:** twelve Listening recordings (nine original clips, two original composites and one optional paced-practice variant) and 160 vocabulary pronunciations. Kokoro v1.0, British-English `bf_emma` / `bm_george`, speed 0.82, mono 24 kHz / 96 kbps. Dialogue alternates voices with 0.35-second turn gaps; original clip mastering targets -18 LUFS / -2 dB true peak. Playback additionally offers 0.75 / 0.9 / 1 / 1.25 rates.

The original three scripts/IDs/keys remain unchanged; durations approximately 25/42/50 sec. Six added clips cover notices, study-space and volunteering conversations, urban shade and retrieval-practice talks, and ten numbered short conversations for HCMUS preparation. The composite is **839.805 seconds**, assembled in catalog order from seven validated clips, decoded/re-encoded once to avoid MP3 header/delay artifacts. It does **not synthesise the same text again** or add artificial silence to reach a 40-minute examination guidance figure. The HCMUS 10 + 5 + 5 composite is **425.343 seconds**, assembled from the new short conversations, shared study-space conversation and urban-shade talk. Ten numbered headers are narrated before the respective three-turn dialogues. These are synthetic original practice recordings, not official or human exam audio.

## HCMUS short-conversation pacing · local revision 2026-10-11

The player defaults to **six-second pauses at 1× between the ten short conversations**, both in the standalone task and the short-conversation section of the grouped task. “Nhịp nghe / Listening pace” also offers the unchanged original recording. Switching pace pauses/restarts audio, preserves the selected speed and answers, and does not write to attempts. Playback speed scales silence too (for example, 1.25× gives about4.8 seconds). This is **practice pacing, not verified official HCMUS examination timing**; no automatic replay or 20-minute padding.

New file: `public/english/audio/dialogue-hcmus-short-paced-v2.mp3`, duration **189.693sec**. Same original script, pinned voices/model and text hash. Each conversation has a narrated header and three turns; only the nine boundaries after speech parts3/7/11/15/19/23/27/31/35 use6sec, all other gaps retain0.35sec, with no additional6sec after the last conversation. About50.85sec longer than the original. All **171 released audio hashes remain byte-identical**, and exercise/attempt IDs and catalog audio paths are unchanged; the player selects the optional variant locally.

The manifest binds the variant to the original path/hash and explicit pacing policy. Cache reuse additionally requires matching `practicePacing`, so the variant cannot be reused under a different declared pause/source recipe. Generation and a cached rerun passed. Python helpers:8 tests; frontend:720 tests/39 files; browser:301 checks/54 retained/refreshed screenshots, no JS/unmatched-API/automated WCAG findings. FFmpeg `silencedetect=noise=-50dB:d=5.8` detected exactly nine long silent intervals of about6.08–6.11sec (six inserted seconds plus natural speech tails). Synthesis/codec checks still require human listening review.

## Pinned authoring environment

No model, engine dependency, remote speech service or learner text is used at application runtime. Requires Python 3.13 and ffmpeg/ffprobe, outside the npm graph:

```bash
python3 -m venv /tmp/kg-kokoro-env
/tmp/kg-kokoro-env/bin/pip install kokoro-onnx==0.4.7 soundfile==0.14.0 numpy==2.5.3 onnxruntime==1.31.0
mkdir -p /tmp/kg-kokoro-model
curl -fL https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx -o /tmp/kg-kokoro-model/kokoro-v1.0.onnx
curl -fL https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin -o /tmp/kg-kokoro-model/voices-v1.0.bin
```

Expected SHA-256:
- Model: `7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5`.
- Voices: `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`.

Use **model-files-v1.0**, not the incompatible newer export. Engine uses public `Kokoro.from_session`, CPUExecutionProvider and four intra-op threads. No vendor monkey patch.

## Generate and resume

Backend beside frontend; export its compiled bank first:
```bash
cd ../knowledge-gym
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  bash scripts/test-english-room.sh --local-postgres
cd ../knowledge-gym-frontend
KG_KOKORO_MODELS=/tmp/kg-kokoro-model KG_KOKORO_PYTHON=/tmp/kg-kokoro-env/bin/python \
  node scripts/generate-english-audio.mjs
python3 scripts/test-english-audio-build.py
```

- Reads compiled, local original bank (`KG_ENGLISH_CATALOG_SNAPSHOT` can specify it) and both vocabulary JSON files. Never fetches ForumFlash text, student responses or hosted speech.
- Lazy model initialization; matching existing clips bypass synthesis. Cache requires pinned model/voices, engine version, speed, normalisation, input voice/text hash, output-byte hash, codec/channel/rate and measured duration.
- Writes each new MP3 to a temporary sibling then atomically replaces it. An atomic checkpoint after every completed clip under ignored `.impeccable/review/english/audio-checkpoint.json` lets a normal rerun resume after interruption. Failed generation/composition preserves previous final assets.
- Composite always uses the completed versioned clips in the explicit section order. Provenance includes their ordered paths/hashes and composed output hash.
- Only atomically replaces the final public manifest when **172 distinct assets** are present. No partial manifest presented as complete.
- `KG_AUDIO_REBUILD=1` explicitly forces individual resynthesis; not needed for routine retries.
- One-time recovery of the prior 600-second interrupted authoring run used `KG_AUDIO_RECOVERY_LOG=/tmp/kg-vstep-bank-audio.log`. This option is **only for a trusted log from the same pinned authoring run/profile**. Every candidate is rechecked against current input hash, file bytes and probe before caching. Do not treat arbitrary third-party logs as provenance.

The recovered 169-asset run and a subsequent checkpoint-only rerun completed in approximately 10–12 seconds without re-synthesising completed speech. Adding the one new HCMUS short-conversation recording and its cheaply assembled composite took approximately 92 seconds; the full 171-asset cached rerun also passed. Byte-identical output on every tool/hardware version is not promised.

## Licensing and attribution

- [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M): Apache-2.0 model; card includes Koniwa CC BY 3.0 and SIWIS CC BY 4.0 attribution.
- [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx): MIT authoring engine. Weights/engine not distributed with the app.
- Inputs: original Knowledge Gym Listening scripts and curated phrase facts with independently written learning material. No ForumFlash/university/commercial recordings or example paragraphs imported.

## Verification and limits

Manifest: `public/english/audio/provenance.json`, including compiled-source hash, text-hash format, source URLs, model/tool hashes, 172 output hashes and durations. Listening copies: `docs/english/audio-scripts/` (not public transcripts).

All 172 files decoded successfully using ffmpeg; asset tests check signatures, bounds, all hashes and composite source hashes. Eight Python helper tests verify caching, atomic checkpoints, composition duration, bounded log recovery and failure preservation. Native browser checks exercise rate, rewind, explicit failed-load retry and unmount cleanup. No autoplay; a new player pauses another active player. An opt-in authenticated transcript control now supports listening with text before submission; it does not embed scripts in the catalog or change MP3 synthesis. The 47-entry catalog itself adds no Listening recordings; the separate playback aid adds one variant while retaining all 171 released assets. These are pre-commit local verification results; subsequent release/deploy status must be checked in Git history and GitHub Actions.

**Decode/hash/fixture coverage is not human pronunciation or pedagogical validation.** Physical iOS Safari/Android, real microphone acceptance and human clarity/pronunciation/difficulty review remain separate. No certified-score or examiner-quality claim.
