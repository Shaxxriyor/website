import { json, readBody, route } from '../server/http.js';
import { requireStudent } from '../server/auth.js';
import { track } from '../server/model.js';

// Heartbeats and scores from the marathon pages (public/track.js).
export const POST = route(async (request) => {
  const sid = await requireStudent(request);
  const body = await readBody(request);
  return json(await track(sid, body));
});
