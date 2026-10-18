import { ApiError, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudentId } from '../server/auth.js';
import { getAvatar, id } from '../server/model.js';

// A student's profile photo, for signed-in students and the teacher.
// The URL carries ?v=<version>, so it can be cached for a long time.
export const GET = route(async (request) => {
  if (!(await currentStudentId(request)) && !currentAdmin(request)) throw new ApiError('Sign in to see photos.', 401);
  const { mime, body } = await getAvatar(id(searchParams(request).get('id')));
  return new Response(body, {
    headers: { 'content-type': mime, 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' },
  });
});
