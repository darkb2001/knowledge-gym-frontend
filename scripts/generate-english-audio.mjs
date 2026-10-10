/* Neural audio authoring entry point. No speech runtime/dependency is shipped.
 * KG_KOKORO_MODELS=/tmp/kg-kokoro-model KG_KOKORO_PYTHON=/tmp/kg-kokoro-env/bin/python node scripts/generate-english-audio.mjs
 * See docs/english/AUDIO.md for model provenance, local setup and pinned tooling.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./generate-english-neural-audio.py', import.meta.url));
execFileSync(process.env.KG_KOKORO_PYTHON || 'python3', [script], { stdio: 'inherit' });
