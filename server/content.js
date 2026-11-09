import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { sectionLabel, sectionOf } from '../src/lib/access.js';

// Course materials live in /content (not /public) and are served only through
// api/content: free samples for everyone, everything else for signed-in
// students and the teacher.

const ROOT = join(process.cwd(), 'content');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/** The Listening Practice exam engine, shared by every test page (no test content in it). */
export const isEngine = (path) => /^practice\/listening\/_shared\/[a-f0-9]{12}\.(js|css)$/.test(path);

/** Clean a requested path; null when it tries to leave /content or isn't a known file type. */
export function cleanPath(raw) {
  const path = normalize(String(raw || '')).replace(/^([/\\])+/, '');
  if (!path || path.startsWith('..') || path.includes('\0') || !TYPES[extname(path)]) return null;
  if (!/^(marathon|practice|vocab|mock)\//.test(path)) return null;
  if (path.endsWith('.json') && !/^vocab\/[a-z0-9-]+\/unit-\d{2}\.json$/.test(path)) return null;
  // Scripts and styles only for the shared engine.
  if (/\.(js|css)$/.test(path) && !isEngine(path)) return null;
  return path;
}

export async function readContent(path) {
  const body = await readFile(join(ROOT, path));
  return { body, type: TYPES[extname(path)] };
}

/** Friendly page shown instead of a locked lesson. */
export function lockedPage(path, reason = 'signin') {
  const section = sectionOf(path);
  const back = section || 'all';
  const what = sectionLabel(section);
  const body =
    reason === 'access'
      ? `<h1>${what} is not open for you yet</h1>
<p>Your teacher opens each section for your account. Until then you can try one ${section === 'mock' ? 'section' : 'item'} of every section. Write to your teacher to open ${what}.</p>
<a href="/#/${back}">Back to READING_CDI</a>`
      : `<h1>Create a free account</h1>
<p>Sign up on READING_CDI to open the marathons, practice tests, Vocabulary and mock tests.</p>
<a href="/#/${back}">Sign up on READING_CDI</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Locked · READING_CDI</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:15px/1.5 "DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
color:#1f1b16;background:#f6f4f0}.c{max-width:400px;margin:24px;padding:32px 28px;border-radius:20px;text-align:center;background:#fff;
box-shadow:0 8px 24px rgba(31,27,22,.08)}.i{width:44px;height:44px;margin:0 auto 6px;border-radius:12px;background:#fbe0dc;display:grid;place-items:center}
h1{margin:8px 0 6px;font-size:21px;font-weight:600}p{margin:0 0 20px;color:#5e554a}a{display:inline-block;padding:12px 22px;border-radius:10px;
color:#fff;text-decoration:none;font-weight:600;background:#1f1b16}</style></head>
<body><div class="c"><div class="i"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b61f25" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>${body}</div></body></html>`;
}
