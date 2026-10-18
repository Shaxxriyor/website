import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from './http.js';
import { query } from './db.js';

// Teacher sign-in. Credentials come from Vercel environment variables
// (ADMIN_USERNAME / ADMIN_PASSWORD); the session is a signed, HttpOnly cookie.

const COOKIE = 'rcdi_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MAX_FAILURES = 5; // per IP per 15 minutes

function credentials() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || '';
  if (password.length < 8) {
    throw new ApiError('Sign-in is not set up yet: set ADMIN_PASSWORD (8+ characters) in Vercel.', 503);
  }
  return { username, password };
}

// Defaults to a key derived from the password, so changing the password signs everyone out.
function secret() {
  return process.env.SESSION_SECRET || createHash('sha256').update(`rcdi:${credentials().password}`).digest('hex');
}

const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url');

function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function readCookie(request) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

function cookieHeader(request, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** The signed-in username, or null. */
export function currentAdmin(request) {
  const token = readCookie(request);
  if (!token) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  try {
    if (!safeEqual(sign(payload), mac)) return null;
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return exp > Date.now() / 1000 ? u : null;
  } catch {
    return null;
  }
}

export function requireAdmin(request) {
  if (!currentAdmin(request)) throw new ApiError('Please sign in.', 401);
}

export async function login(request, username, password, ip) {
  const creds = credentials();
  const [{ failures }] = await query(
    `SELECT COUNT(*)::int AS failures FROM login_attempts WHERE ip = $1 AND attempted_at > now() - interval '15 minutes'`,
    [ip],
  );
  if (failures >= MAX_FAILURES) {
    throw new ApiError('Too many attempts. Please wait 15 minutes and try again.', 429);
  }
  // Evaluate both comparisons so timing doesn't reveal which one failed.
  const userOk = safeEqual(username, creds.username);
  const passOk = safeEqual(password, creds.password);
  if (!(userOk && passOk)) {
    await query('INSERT INTO login_attempts (ip) VALUES ($1)', [ip]);
    await query(`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`);
    throw new ApiError('Wrong username or password.', 401);
  }
  await query('DELETE FROM login_attempts WHERE ip = $1', [ip]);
  const payload = Buffer.from(JSON.stringify({ u: creds.username, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString(
    'base64url',
  );
  return cookieHeader(request, `${payload}.${sign(payload)}`, MAX_AGE);
}

export function logoutCookie(request) {
  return cookieHeader(request, '', 0);
}
