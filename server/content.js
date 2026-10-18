import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { isFreePath } from '../src/lib/access.js';

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
};

export const isFree = isFreePath;

/** Clean a requested path; null when it tries to leave /content or isn't a known file type. */
export function cleanPath(raw) {
  const path = normalize(String(raw || '')).replace(/^([/\\])+/, '');
  if (!path || path.startsWith('..') || path.includes('\0') || !TYPES[extname(path)]) return null;
  if (!/^(marathon|practice|els)\//.test(path)) return null;
  return path;
}

export async function readContent(path) {
  const body = await readFile(join(ROOT, path));
  return { body, type: TYPES[extname(path)] };
}

/** Friendly page shown instead of a locked lesson. */
export function lockedPage(path) {
  const back = path.startsWith('practice/')
    ? 'reading-practice'
    : path.startsWith('els/')
      ? 'els'
      : path.includes('/listening/')
        ? 'listening-marathon'
        : 'reading-marathon';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Locked · READING_CDI</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
color:#1d1b1a;background:radial-gradient(120% 90% at 10% 0%,#d2f5e7,#bfeedd 45%,#a9e4cf)}
.c{max-width:380px;margin:24px;padding:32px 28px;border-radius:28px;text-align:center;background:rgba(255,255,255,.86);
box-shadow:0 30px 80px -20px rgba(24,74,58,.28)}.i{font-size:40px}h1{margin:8px 0 6px;font-size:22px;font-weight:600}
p{margin:0 0 20px;color:#4a4542}a{display:inline-block;padding:12px 22px;border-radius:999px;color:#fff;text-decoration:none;
font-weight:600;background:linear-gradient(180deg,#34302d,#141211)}</style></head>
<body><div class="c"><div class="i">🔒</div><h1>For READING_CDI students</h1>
<p>Day 1 of each section is free. Sign in with the code from your teacher to open everything.</p>
<a href="/#/${back}">Sign in on READING_CDI</a></div></body></html>`;
}
