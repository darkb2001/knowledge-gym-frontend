"""Run with python3 scripts/test-english-audio-build.py (ffmpeg/ffprobe required)."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from english_audio_build import (
    atomic_json,
    cached_record,
    concatenate,
    probe,
    read_recovery_log,
    sha,
    text_sha,
)


class AudioBuildTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.a = self.root / "first.mp3"
        self.b = self.root / "second.mp3"
        for file, frequency in ((self.a, 300), (self.b, 600)):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"sine=frequency={frequency}:duration=0.8", "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", str(file)], check=True)

    def tearDown(self):
        self.temp.cleanup()

    def test_atomic_checkpoint_replaces_valid_json(self):
        file = self.root / "checkpoint.json"
        atomic_json(file, {"old": 1})
        atomic_json(file, {"assets": ["a", "b"]})
        self.assertEqual(json.loads(file.read_text()), {"assets": ["a", "b"]})
        self.assertEqual(sorted(p.name for p in self.root.iterdir()), ["checkpoint.json", "first.mp3", "second.mp3"])

    def test_cache_requires_input_bytes_and_valid_audio(self):
        parts = [("bf_emma", "Original practice.")]
        record = {"path": "/first.mp3", "seconds": probe(self.a), "sha256": sha(self.a), "textSha256": text_sha(parts)}
        previous = {record["path"]: record}
        self.assertEqual(cached_record(self.a, record["path"], parts, previous), record)
        self.assertIsNone(cached_record(self.a, record["path"], [("bm_george", "Original practice.")], previous))
        self.assertIsNone(cached_record(self.a, record["path"], [("bf_emma", "Changed text.")], previous))
        self.a.write_bytes(b"corrupt")
        self.assertIsNone(cached_record(self.a, record["path"], parts, previous))

    def test_composite_uses_existing_sources_and_duration(self):
        output = self.root / "combined.mp3"
        duration = concatenate(output, [self.a, self.b])
        self.assertLess(abs(duration - probe(self.a) - probe(self.b)), 0.2)
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(output), "-f", "null", "-"], check=True)

    def test_failed_composition_keeps_existing_output(self):
        output = self.root / "combined.mp3"
        output.write_bytes(b"previous bytes")
        with self.assertRaises((RuntimeError, subprocess.CalledProcessError)):
            concatenate(output, [self.root / "missing.mp3"])
        self.assertEqual(output.read_bytes(), b"previous bytes")

    def test_empty_composition_rejected(self):
        with self.assertRaises(ValueError):
            concatenate(self.root / "out.mp3", [])

    def test_log_import_is_bounded_and_ignores_nonrecords(self):
        file = self.root / "author.log"
        row = {"path": "/first.mp3", "seconds": 0.8, "sha256": "x", "textSha256": "y"}
        file.write_text("warning\n[]\n" + json.dumps(row) + "\n")
        self.assertEqual(read_recovery_log(file), {"/first.mp3": row})
        file.write_text("x" * 2_000_001)
        with self.assertRaises(RuntimeError):
            read_recovery_log(file)


if __name__ == "__main__":
    unittest.main()
