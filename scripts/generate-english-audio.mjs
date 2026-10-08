/* Optional build-time authoring tool. No speech engine is bundled in the application.
 * npm install --prefix /tmp/kg-english-speech --no-save @echogarden/espeak-ng-emscripten@0.3.5
 * NODE_PATH=/tmp/kg-english-speech/node_modules node scripts/generate-english-audio.mjs
 * Requires ffmpeg. Input is the repository's original, versioned EnglishCatalog only.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { default: initialise } = await import(pathToFileURL(require.resolve('@echogarden/espeak-ng-emscripten')).href);
const espeak = await initialise();
const speaker = await new espeak.eSpeakNGWorker();
speaker.set_rate(0.9);
speaker.set_pitch(1.0);
speaker.set_range(1.0);
const source = fs.readFileSync('../knowledge-gym/kg-core/src/main/java/com/knowledgegym/english/application/EnglishCatalog.java', 'utf8');
const scripts = [...source.matchAll(/"\/english\/audio\/([a-z0-9-]+)\.mp3",\s*"([^"]+)"/g)];
if (scripts.length !== 3) throw new Error('Expected exactly three versioned listening scripts');
const folder = 'public/english/audio';
const textFolder = 'docs/english/audio-scripts';
fs.mkdirSync(folder, { recursive: true }); fs.mkdirSync(textFolder, { recursive: true });
for (const [, name, text] of scripts) {
  const chunks = [];
  const parts = name.startsWith('dialogue') ? [...text.matchAll(/(Anna|Ben):\s*(.*?)(?=(?:Anna|Ben):|$)/g)].map(m => ({ voice: m[1] === 'Anna' ? 'en-us+f3' : 'en-us+m3', text: m[2].trim() })) : [{ voice: 'en-us', text }];
  for (const part of parts) {
    speaker.set_voice(part.voice);
    speaker.synthesize(part.text, samples => {
      if (samples?.length) chunks.push(Buffer.from(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)));
    });
  }
  const pcm = Buffer.concat(chunks);
  if (!pcm.length) throw new Error(`No samples for ${name}`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kg-english-audio-'));
  const raw = path.join(temp, 'audio.pcm'); fs.writeFileSync(raw, pcm);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', '22050', '-ac', '1', '-i', raw, '-codec:a', 'libmp3lame', '-b:a', '96k', path.join(folder, `${name}.mp3`)]);
  fs.writeFileSync(path.join(textFolder, `${name}.txt`), text + '\n');
  console.log(`${name}: ${pcm.length / 2 / 22050} seconds`);
}
fs.writeFileSync(path.join(folder, 'provenance.json'), JSON.stringify({
  source: 'Original Knowledge Gym practice scripts; not official VSTEP audio',
  generator: '@echogarden/espeak-ng-emscripten 0.3.5 (GPL-3.0 engine, build-time only); ffmpeg MP3 96 kbps',
  engineSource: 'https://github.com/echogarden-project/espeak-ng-emscripten',
  voices: 'en-us; dialogue alternates en-us+f3 / en-us+m3',
  scripts: 'Versioned EnglishCatalog.java; plain-text copies in docs/english/audio-scripts',
  notice: 'Synthetic practice speech, not recorded exam speakers. Speech engine is not bundled.',
}, null, 2) + '\n');
