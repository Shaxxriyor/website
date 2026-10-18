import { ApiError, clientIp, json, readBody, route } from '../server/http.js';
import { currentStudentId, studentLogin, studentLogoutCookie } from '../server/auth.js';
import { studentSelf } from '../server/model.js';

// The signed-in student's own progress (used by the home page and the marathon pages).
export const GET = route(async (request) => {
  const sid = await currentStudentId(request);
  return json(sid ? await studentSelf(sid) : { student: null });
});

export const POST = route(async (request) => {
  const body = await readBody(request);
  if (body.action === 'logout') {
    return json({ student: null }, 200, { 'set-cookie': studentLogoutCookie(request) });
  }
  if (body.action !== 'login') throw new ApiError('Unknown action.');
  const cookie = await studentLogin(request, body.code, clientIp(request));
  return json({ ok: true }, 200, { 'set-cookie': cookie });
});
