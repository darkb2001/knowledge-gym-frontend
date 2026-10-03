// Resolve the real production alias, not a possibly protected preview URL.
// Authentication is sent only to Vercel's API; no secret values are printed.
const { VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, DEPLOYMENT_URL } = process.env;
if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID || !DEPLOYMENT_URL) throw new Error('Missing deployment metadata.');
let api;
try {
  const deployment = new URL(DEPLOYMENT_URL);
  api = new URL(`https://api.vercel.com/v13/deployments/${encodeURIComponent(deployment.hostname)}`);
} catch { throw new Error('Invalid Vercel deployment URL.'); }
if (VERCEL_ORG_ID?.startsWith('team_')) api.searchParams.set('teamId', VERCEL_ORG_ID);
const response = await fetch(api, {
  headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Could not resolve production alias: Vercel API HTTP ${response.status}`);
const data = await response.json();
if (data.projectId !== VERCEL_PROJECT_ID) throw new Error('Deployment belongs to a different Vercel project.');
if (data.readyState !== 'READY' || data.target !== 'production') throw new Error('Production deployment is not ready.');
const aliases = (data.alias ?? []).filter(alias => typeof alias === 'string' && !alias.includes('/'));
if (!aliases.length) throw new Error('No production domain assigned; configure a production domain in Vercel.');
// The default production domain is shorter than branch-preview aliases.
const alias = aliases.sort((a, b) => a.length - b.length)[0];
console.log(`https://${alias}`);
