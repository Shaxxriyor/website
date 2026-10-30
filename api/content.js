import { json, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudent } from '../server/auth.js';
import { cleanPath, isEngine, isFree, lockedPage, readContent } from '../server/content.js';

// Serves /marathon/*, /practice/* and /vocab/* (rewritten here by vercel.json).
export const GET = route(async (request) => {
  const path = cleanPath(searchParams(request).get('path'));
  if (!path) return json({ error: 'Not found.' }, 404);

  const engine = isEngine(path);
  const free = engine || isFree(path);
  if (!free && !currentAdmin(request)) {
    // Marathons and Vocabulary: any signed-in student (registered by the teacher).
    // Reading Practice: only students the teacher has opened it for.
    const student = await currentStudent(request);
    const reason = !student ? 'signin' : path.startsWith('practice/') && !student.practice_access ? 'practice' : null;
    if (reason) {
      return path.endsWith('.html')
        ? new Response(lockedPage(path, reason), { status: reason === 'signin' ? 401 : 403, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
        : json({ error: reason === 'signin' ? 'Sign in to open this.' : 'Ask your teacher to open Reading Practice for you.' }, reason === 'signin' ? 401 : 403);
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
      'cache-control': engine ? 'public, max-age=31536000, immutable' : free ? 'public, max-age=3600' : 'private, no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, noarchive',
      'referrer-policy': 'same-origin',
    },
  });
});
