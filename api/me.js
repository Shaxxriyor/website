import { ApiError, clientIp, json, readBody, route } from '../server/http.js';
import { currentStudentId, requireStudent, studentLogin, studentLogoutCookie, studentPasswordLogin, studentSignup } from '../server/auth.js';
import { saveVocab, setAvatar, studentSelf } from '../server/model.js';

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
  if (body.action === 'avatar') {
    const sid = await requireStudent(request);
    return json({ avatar_v: await setAvatar(sid, body.image ?? null) });
  }
  if (body.action === 'vocab') {
    const sid = await requireStudent(request);
    return json(await saveVocab(sid, body));
  }
  if (body.action === 'signup') {
    const cookie = await studentSignup(request, body, clientIp(request));
    return json({ ok: true }, 201, { 'set-cookie': cookie });
  }
  if (body.action === 'email-login') {
    const cookie = await studentPasswordLogin(request, body.email, body.password, clientIp(request));
    return json({ ok: true }, 200, { 'set-cookie': cookie });
  }
  if (body.action !== 'login') throw new ApiError('Unknown action.');
  const cookie = await studentLogin(request, body.code, clientIp(request));
  return json({ ok: true }, 200, { 'set-cookie': cookie });
});
