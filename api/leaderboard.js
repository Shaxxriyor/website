import { ApiError, json, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudentId } from '../server/auth.js';
import { leaderboard } from '../server/model.js';

// The shared rating: open to signed-in students and the teacher.
export const GET = route(async (request) => {
  const me = await currentStudentId(request);
  if (!me && !currentAdmin(request)) throw new ApiError('Sign in with your code to see the rating.', 401);
  const data = await leaderboard(searchParams(request).get('period') || 'all');
  return json({ ...data, me });
});
