import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Read only the public API setting; never print the pulled environment file.
const env = parseEnv(readFileSync('.vercel/.env.production.local', 'utf8'));
const value = env.NEXT_PUBLIC_API_BASE;
if (!value) throw new Error('Set NEXT_PUBLIC_API_BASE in Vercel Production Environment Variables before deploying.');
let url;
try { url = new URL(value); }
catch { throw new Error('Production NEXT_PUBLIC_API_BASE is not a valid URL.'); }
if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password) {
  throw new Error('Production NEXT_PUBLIC_API_BASE must be a public HTTPS API URL without embedded credentials.');
}
console.log('Production public API configuration is present and uses HTTPS.');
