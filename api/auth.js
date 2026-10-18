import { json, readBody, route, clientIp } from '../server/http.js';
import { currentAdmin, login, logoutCookie } from '../server/auth.js';

export const GET = route(async (request) => json({ admin: currentAdmin(request) }));

export const POST = route(async (request) => {
  const body = await readBody(request);
  if (body.action === 'logout') {
    return json({ admin: null }, 200, { 'set-cookie': logoutCookie(request) });
  }
  const cookie = await login(request, String(body.username ?? ''), String(body.password ?? ''), clientIp(request));
  return json({ admin: true }, 200, { 'set-cookie': cookie });
});
