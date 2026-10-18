import { json, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudentId } from '../server/auth.js';
import { cleanPath, isFree, lockedPage, readContent } from '../server/content.js';

// Serves /marathon/*, /practice/* and /els/* (rewritten here by vercel.json).
export const GET = route(async (request) => {
  const path = cleanPath(searchParams(request).get('path'));
  if (!path) return json({ error: 'Not found.' }, 404);

  const free = isFree(path);
  if (!free && !(currentAdmin(request) || (await currentStudentId(request)))) {
    return path.endsWith('.html')
      ? new Response(lockedPage(path), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
      : json({ error: 'Sign in with your code to open this.' }, 401);
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
      'cache-control': free ? 'public, max-age=3600' : 'private, no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, noarchive',
      'referrer-policy': 'same-origin',
    },
  });
});
