import { json, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudent } from '../server/auth.js';
import { cleanPath, isEngine, lockedPage, readContent } from '../server/content.js';
import { isTrialPath, sectionOf } from '../src/lib/access.js';

// Serves /marathon/*, /practice/*, /vocab/* and /mock/* (rewritten here by vercel.json).
export const GET = route(async (request) => {
  const path = cleanPath(searchParams(request).get('path'));
  if (!path) return json({ error: 'Not found.' }, 404);

  const engine = isEngine(path);
  const open = engine || Boolean(currentAdmin(request));
  if (!open) {
    // Visitors: nothing (they are asked to create an account). Students: the sections the
    // teacher opened for them, plus the one trial item of every other section.
    const student = await currentStudent(request);
    const reason = !student ? 'signin' : student.access.includes(sectionOf(path)) || isTrialPath(path) ? null : 'access';
    if (reason) {
      return path.endsWith('.html')
        ? new Response(lockedPage(path, reason), { status: reason === 'signin' ? 401 : 403, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
        : json({ error: reason === 'signin' ? 'Create an account or sign in to open this.' : 'Your teacher has not opened this for your account yet.' }, reason === 'signin' ? 401 : 403);
    }
  }

  let file;
  try {
    file = await readContent(path);
  } catch {
    return json({ error: 'Not found.' }, 404);
  }
  return new Response(file.body, {
    headers: {
      'content-type': file.type,
      // Never stored by shared caches; signed-in copies stay in this browser only.
      // Engine files are named by their content hash, so they never change.
      'cache-control': engine ? 'public, max-age=31536000, immutable' : 'private, no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, noarchive',
      'referrer-policy': 'same-origin',
    },
  });
});
