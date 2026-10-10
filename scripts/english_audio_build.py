"""Local authoring helpers; no model import, network or learner data."""
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path


def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def text_sha(parts):
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()


def atomic_json(file, value):
    file = Path(file)
    file.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=file.parent, delete=False) as out:
        temp = Path(out.name)
        try:
            json.dump(value, out, ensure_ascii=False, indent=2)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
        except BaseException:
            temp.unlink(missing_ok=True)
            raise
    try:
        os.replace(temp, file)
    finally:
        temp.unlink(missing_ok=True)


def probe(file):
    data = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", str(file)
    ]))
    streams = data["streams"]
    if len(streams) != 1 or streams[0].get("codec_name") != "mp3" or streams[0].get("sample_rate") != "24000" or streams[0].get("channels") != 1:
        raise RuntimeError(f"Unexpected audio format: {file}")
    duration = float(data["format"]["duration"])
    if not 0.5 < duration < 7200:
        raise RuntimeError(f"Unexpected duration: {file}")
    return round(duration, 3)


def cached_record(file, asset_path, parts, previous):
    item = previous.get(asset_path)
    if not item or item.get("textSha256") != text_sha(parts) or not Path(file).is_file():
        return None
    if item.get("sha256") != sha(file):
        return None
    duration = probe(file)
    if abs(duration - item.get("seconds", 0)) > 0.1:
        return None
    return {k: item[k] for k in ("path", "seconds", "sha256", "textSha256")}


def read_recovery_log(file):
    # Explicitly supplied, trusted local authoring log; still validate bytes/input/probe before reuse.
    file = Path(file)
    if file.stat().st_size > 2_000_000:
        raise RuntimeError("Recovery log exceeds authoring budget")
    rows = {}
    for line in file.read_text().splitlines():
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(record, dict) and all(k in record for k in ("path", "seconds", "sha256", "textSha256")):
            rows[record["path"]] = record
    return rows


def concatenate(file, sources):
    """Decode/re-encode once to avoid MP3 header/encoder-delay artifacts; never re-synthesise speech."""
    file = Path(file)
    if not sources:
        raise ValueError("Cannot compose an empty recording")
    for source in sources:
        probe(source)
    file.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=file.parent, prefix=".audio-compose-") as temp:
        temp = Path(temp)
        playlist = temp / "clips.txt"
        # Source paths are generated/allowlisted, but escape apostrophes for the concat demuxer.
        playlist.write_text("".join("file '" + str(Path(p).resolve()).replace("'", "'\\''") + "'\n" for p in sources))
        output = temp / "complete.mp3"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(playlist),
                        "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", str(output)], check=True)
        duration = probe(output)
        expected = sum(probe(p) for p in sources)
        if abs(duration - expected) > max(2, len(sources) * 0.15):
            raise RuntimeError("Composite duration disagrees with its source sequence")
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(output), "-f", "null", "-"], check=True)
        os.replace(output, file)
        return duration
