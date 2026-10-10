"""Build-time only. See docs/english/AUDIO.md for pinned setup and model downloads.
No learner text, remote synthesis requests or speech-model runtime in the application.
"""
import hashlib
import importlib.metadata
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import onnxruntime as rt
import soundfile as sf
from english_audio_build import (
    atomic_json,
    cached_record,
    concatenate,
    probe,
    read_recovery_log,
    text_sha,
)
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = Path(os.environ.get("KG_KOKORO_MODELS", str(Path.home() / ".cache" / "knowledge-gym-kokoro")))
MODEL = MODEL_DIR / "kokoro-v1.0.onnx"
VOICES = MODEL_DIR / "voices-v1.0.bin"
if not MODEL.is_file() or not VOICES.is_file():
    raise SystemExit("Missing local Kokoro model files. Follow docs/english/AUDIO.md; no downloads are performed by this generator.")
expected_inputs = [(MODEL, "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5"), (VOICES, "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d")]
for file, expected in expected_inputs:
    if hashlib.sha256(file.read_bytes()).hexdigest() != expected:
        raise SystemExit(f"Unexpected model/voice hash: {file.name}. Use the pinned model-files-v1.0 files from AUDIO.md.")
if importlib.metadata.version("kokoro-onnx") != "0.4.7":
    raise SystemExit("Use the tested kokoro-onnx==0.4.7 authoring environment from AUDIO.md.")
options = rt.SessionOptions()
options.intra_op_num_threads = 4
engine = None  # Lazy: a resumable/cached build must not start expensive synthesis.
records = []
old_manifest_path = ROOT / "public/english/audio/provenance.json"
old_manifest = json.loads(old_manifest_path.read_text()) if old_manifest_path.exists() else {}
cache_ok = (old_manifest.get("modelSha256") == expected_inputs[0][1]
            and old_manifest.get("voicesSha256") == expected_inputs[1][1]
            and old_manifest.get("authoringSpeed") == 0.82
            and "0.4.7" in old_manifest.get("generator", "")
            and old_manifest.get("normalisation") == "-18 LUFS target, -2 dB true peak, mono 24 kHz, 0.35-second gaps between dialogue turns"
            and os.environ.get("KG_AUDIO_REBUILD") != "1")
previous = {r["path"]: r for r in old_manifest.get("assets", [])} if cache_ok else {}
profile = {"model": expected_inputs[0][1], "voices": expected_inputs[1][1], "engine": "kokoro-onnx==0.4.7", "speed": 0.82, "normalisation": "-18 LUFS/-2 dB, mono 24kHz, 96kbps, 0.35s turn gaps"}
checkpoint_path = ROOT / ".impeccable/review/english/audio-checkpoint.json"
if checkpoint_path.exists() and os.environ.get("KG_AUDIO_REBUILD") != "1":
    checkpoint = json.loads(checkpoint_path.read_text())
    if checkpoint.get("profile") == profile:
        previous.update({r["path"]: r for r in checkpoint.get("assets", [])})
if os.environ.get("KG_AUDIO_RECOVERY_LOG"):
    if not cache_ok:
        raise SystemExit("Recovery requires the matching pinned authoring profile in the previous manifest")
    previous.update(read_recovery_log(os.environ["KG_AUDIO_RECOVERY_LOG"]))

def remember(record):
    records.append(record)
    atomic_json(checkpoint_path, {"profile": profile, "assets": records})
    print(json.dumps(record), flush=True)

def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def render(file, parts):
    asset_path = "/" + str(file.relative_to(ROOT / "public"))
    global engine
    cached = cached_record(file, asset_path, parts, previous)
    if cached:
        remember(cached)
        return
    if engine is None:
        engine = Kokoro.from_session(rt.InferenceSession(str(MODEL), sess_options=options, providers=["CPUExecutionProvider"]), str(VOICES))
    chunks = []
    rate = 24000
    for voice, text in parts:
        samples, rate = engine.create(text, voice=voice, speed=0.82, lang="en-gb")
        if not len(samples) or not np.isfinite(samples).all():
            raise RuntimeError(f"Empty or non-finite audio: {file.name}")
        chunks.extend([samples, np.zeros(int(rate * 0.35), dtype=np.float32)])
    file.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=file.parent, prefix=".kg-neural-audio-") as temp:
        wav = Path(temp) / "source.wav"
        output = Path(temp) / "output.mp3"
        sf.write(str(wav), np.concatenate(chunks), rate)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-af", "loudnorm=I=-18:TP=-2:LRA=7", "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", str(output)], check=True)
        duration = probe(output)
        os.replace(output, file)
    record = {"path": "/" + str(file.relative_to(ROOT / "public")), "seconds": round(duration, 3), "sha256": sha(file), "textSha256": hashlib.sha256(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()}
    remember(record)

snapshot = Path(os.environ.get("KG_ENGLISH_CATALOG_SNAPSHOT", str(ROOT.parent / "knowledge-gym/kg-presentation/build/reports/english/catalog-fixture.json")))
if not snapshot.is_file():
    raise SystemExit("Missing compiled catalog fixture. Run knowledge-gym/scripts/test-english-room.sh --local-postgres first.")
catalog = json.loads(snapshot.read_text())
listening = {e["id"]: e for e in catalog if e["skill"] == "LISTENING"}
if len(listening) != 14:
    raise RuntimeError("Expected fourteen versioned listening practice entries")

def speech_parts(entry):
    if entry.get("parts"):
        return [part for section in entry["parts"] for part in speech_parts(listening[section["id"]])]
    text = entry["transcript"]
    if entry["id"] == "hcmus-listening-short-v1":
        parts = []
        for block in text.strip().split("\n\n"):
            heading, dialogue = block.split("\n", 1)
            parts.append(("bf_emma", heading.strip()))
            parts.extend(("bf_emma" if speaker == "Anna" else "bm_george", line.strip()) for speaker, line in re.findall(r"(Anna|Ben):\s*(.*?)(?=(?:Anna|Ben):|$)", dialogue, re.S))
        if len(parts) != 40:
            raise RuntimeError("Expected ten numbered three-turn short conversations")
        return parts
    if entry["audioPath"].split("/")[-1].startswith("dialogue"):
        parts = [("bf_emma" if speaker == "Anna" else "bm_george", line.strip()) for speaker, line in re.findall(r"(Anna|Ben):\s*(.*?)(?=(?:Anna|Ben):|$)", text, re.S)]
        if not parts:
            raise RuntimeError(f"Missing speaker-labelled dialogue: {entry['id']}")
        return parts
    return [("bf_emma", text)]

scripts = {}
for entry in listening.values():
    audio = entry["audioPath"]
    if not re.fullmatch(r"/english/audio/[a-z0-9-]+\.mp3", audio):
        raise RuntimeError(f"Unexpected audio output path: {audio}")
    parts = speech_parts(entry)
    if audio in scripts and scripts[audio][0] != parts:
        raise RuntimeError(f"Two immutable exercises disagree on the script for {audio}")
    scripts[audio] = (parts, entry["transcript"])
if len(scripts) != 11:
    raise RuntimeError("Expected eleven distinct listening recordings")
composite_paths = {e["audioPath"] for e in listening.values() if e.get("parts")}
for audio, (parts, text) in scripts.items():
    if audio not in composite_paths:
        render(ROOT / "public" / audio.lstrip("/"), parts)
    (ROOT / "docs/english/audio-scripts" / (Path(audio).stem + ".txt")).write_text(text.rstrip() + "\n")
for entry in listening.values():
    if not entry.get("parts"):
        continue
    file = ROOT / "public" / entry["audioPath"].lstrip("/")
    sources = [ROOT / "public" / section["audioPath"].lstrip("/") for section in entry["parts"]]
    # Always compose cheaply from already-verified clips; source hashes bind the order.
    duration = concatenate(file, sources)
    remember({"path": entry["audioPath"], "seconds": duration, "sha256": sha(file),
              "textSha256": text_sha(speech_parts(entry)),
              "composition": "decoded clips concatenated in catalog order; re-encoded once, no new synthesis",
              "sources": [{"path": section["audioPath"], "sha256": sha(source)} for section, source in zip(entry["parts"], sources, strict=True)]})

expansion = json.loads((ROOT / "content/english/topic-expansion.json").read_text())
for topic in json.loads((ROOT / "content/english/topics.json").read_text()):
    for index, entry in enumerate(topic["entries"] + expansion[topic["id"]], 1):
        render(ROOT / "public/english/vocabulary" / f'{topic["id"]}-{index}.mp3', [("bf_emma", entry["term"])])

provenance = {
    "source": "Original Knowledge Gym practice scripts and curated vocabulary; not official VSTEP or HCMUS audio",
    "generator": f'Kokoro v1.0 neural TTS; kokoro-onnx {importlib.metadata.version("kokoro-onnx")} (MIT build-time tool); ffmpeg MP3 96 kbps',
    "engineSource": "https://github.com/thewh1teagle/kokoro-onnx",
    "modelSource": "https://huggingface.co/hexgrad/Kokoro-82M",
    "modelLicense": "Apache-2.0",
    "onnxExport": "https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0",
    "authoringSpeed": 0.82,
    "modelSha256": sha(MODEL),
    "voicesSha256": sha(VOICES),
    "voices": "bf_emma (British English); dialogue alternates bf_emma / bm_george",
    "scripts": "Compiled versioned EnglishCatalog bank fixture; content/english/topics.json and topic-expansion.json; listening text copies in docs/english/audio-scripts",
    "catalogSnapshotSha256": sha(snapshot),
    "textHashFormat": "SHA-256 of json.dumps(voice/text pairs, ensure_ascii=False), using default separators",
    "cache": "Reuse only when text, output bytes, pinned model/voices, engine version, speed and normalisation match; KG_AUDIO_REBUILD=1 forces generation",
    "runtime": "CPUExecutionProvider, four intra-op threads through the public Kokoro.from_session API",
    "normalisation": "-18 LUFS target, -2 dB true peak, mono 24 kHz, 0.35-second gaps between dialogue turns",
    "notice": "Neural synthetic practice speech, not human exam speakers. Speech model and engine are not bundled. No learner text is sent to a speech service.",
    "assets": records,
}
if len(records) != 171 or len({r["path"] for r in records}) != 171:
    raise RuntimeError("Incomplete or duplicate asset manifest; previous final manifest remains intact")
atomic_json(ROOT / "public/english/audio/provenance.json", provenance)
