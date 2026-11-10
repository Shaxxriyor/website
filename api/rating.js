import { ApiError, json, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudentId } from '../server/auth.js';
import { activityFeed, id, leaderboard, publicProfile } from '../server/model.js';

// The shared rating, student pages and the Live activity feed: for signed-in students and the
// teacher. (Same as /api/leaderboard, under a name content blockers leave alone.)
export const GET = route(async (request) => {
  const me = await currentStudentId(request);
  if (!me && !currentAdmin(request)) throw new ApiError('Sign in with your code to see the rating.', 401);
  const q = searchParams(request);
  if (q.get('feed')) return json({ feed: await activityFeed({ limit: q.get('limit'), before: q.get('before') }), me });
  if (q.get('id')) return json({ ...(await publicProfile(id(q.get('id')))), me });
  const data = await leaderboard(q.get('period') || 'all');
  return json({ ...data, me });
});
