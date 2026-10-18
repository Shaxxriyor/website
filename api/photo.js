import { ApiError, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudentId } from '../server/auth.js';
import { elsPhoto, id } from '../server/model.js';

// One ELS translation photo, for signed-in students and the teacher.
export const GET = route(async (request) => {
  if (!(await currentStudentId(request)) && !currentAdmin(request)) throw new ApiError('Sign in to see photos.', 401);
  const { mime, body } = await elsPhoto(id(searchParams(request).get('id')));
  return new Response(body, {
    headers: { 'content-type': mime, 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff' },
  });
});
