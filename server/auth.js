import { createHash, createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ApiError } from './http.js';
import { query } from './db.js';

// Teacher sign-in: the "Teacher / admin" button on the home page (password only),
// or the teacher page. The password comes from the Vercel environment:
// ADMIN_PASSWORD, or ADMIN_PASSWORD_HASH (an scrypt hash, "scrypt:<salt>:<key>").
// The session is a signed, HttpOnly cookie.

const COOKIE = 'rcdi_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const STUDENT_COOKIE = 'rcdi_student';
const STUDENT_MAX_AGE = 60 * 60 * 24 * 180; // students sign in once per device
const MAX_FAILURES = 5; // per IP per 15 minutes

function credentials() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  // An ADMIN_PASSWORD shorter than 8 characters is ignored.
  const password = (process.env.ADMIN_PASSWORD || '').length >= 8 ? process.env.ADMIN_PASSWORD : '';
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  if (!password && !hash) {
    throw new ApiError('Sign-in is not set up yet: set ADMIN_PASSWORD (8+ characters) in Vercel.', 503);
  }
  return { username, password, hash };
}

// Defaults to a key derived from the passwords, so changing them signs everyone out.
function secret() {
  return (
    process.env.SESSION_SECRET ||
    createHash('sha256').update(`rcdi:${credentials().password || credentials().hash}`).digest('hex')
  );
}

const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url');

function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function readCookie(request, name = COOKIE) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function cookieHeader(request, value, maxAge, name = COOKIE) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function issue(data, maxAge) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + maxAge })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verify(token) {
  if (!token) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  try {
    if (!safeEqual(sign(payload), mac)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

/** The signed-in username, or null. */
export function currentAdmin(request) {
  return verify(readCookie(request))?.u ?? null;
}

export function requireAdmin(request) {
  if (!currentAdmin(request)) throw new ApiError('Please sign in.', 401);
}

async function checkThrottle(ip) {
  const [{ failures }] = await query(
    `SELECT COUNT(*)::int AS failures FROM login_attempts WHERE ip = $1 AND attempted_at > now() - interval '15 minutes'`,
    [ip],
  );
  if (failures >= MAX_FAILURES) {
    throw new ApiError('Too many attempts. Please wait 15 minutes and try again.', 429);
  }
}

async function recordFailure(ip) {
  await query('INSERT INTO login_attempts (ip) VALUES ($1)', [ip]);
  await query(`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`);
}

export async function login(request, username, password, ip) {
  const creds = credentials();
  await checkThrottle(ip);
  // The username is optional (the admin button asks only for the password); when
  // given it must match. Every check runs so timing doesn't reveal which one failed.
  const userOk = !username || safeEqual(username, creds.username);
  const envOk = Boolean(creds.password) && safeEqual(password, creds.password);
  const hashOk = Boolean(creds.hash) && (await checkPassword(password, creds.hash));
  if (!(userOk && (envOk || hashOk))) {
    await recordFailure(ip);
    throw new ApiError('Wrong password.', 401);
  }
  await query('DELETE FROM login_attempts WHERE ip = $1', [ip]);
  return cookieHeader(request, issue({ u: creds.username }, MAX_AGE), MAX_AGE);
}

export function logoutCookie(request) {
  return cookieHeader(request, '', 0);
}

// ---------- students ----------
// A student signs in with the access code the teacher gives them. Only active
// students can sign in, and every request re-checks that they still are.

export const normalizeCode = (code) => String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function studentLogin(request, code, ip) {
  await checkThrottle(ip);
  const normalized = normalizeCode(code);
  const [student] = normalized.length >= 6
    ? await query(`SELECT id FROM students WHERE access_code = $1 AND status = 'active'`, [normalized])
    : [];
  if (!student) {
    await recordFailure(ip);
    throw new ApiError('That code didn’t work. Check it with your teacher.', 401);
  }
  return cookieHeader(request, issue({ s: student.id }, STUDENT_MAX_AGE), STUDENT_MAX_AGE, STUDENT_COOKIE);
}

// ---------- password hashes (ADMIN_PASSWORD_HASH) ----------

const scryptAsync = promisify(scrypt);

async function checkPassword(password, stored) {
  const [, salt, hash] = String(stored || 'scrypt:x:x').split(':');
  const key = await scryptAsync(password, salt, 32);
  return safeEqual(key.toString('base64url'), hash) && Boolean(stored);
}

/** The signed-in student's id (still registered and active), or null. */
export async function currentStudentId(request) {
  return (await currentStudent(request))?.id ?? null;
}

/** The signed-in active student as { id, practice_access }, or null. */
export async function currentStudent(request) {
  const sid = verify(readCookie(request, STUDENT_COOKIE))?.s;
  if (!sid) return null;
  const [row] = await query(`SELECT id, practice_access FROM students WHERE id = $1 AND status = 'active'`, [sid]);
  return row ?? null;
}

export async function requireStudent(request) {
  const sid = await currentStudentId(request);
  if (!sid) throw new ApiError('Please sign in with your access code.', 401);
  return sid;
}

export function studentLogoutCookie(request) {
  return cookieHeader(request, '', 0, STUDENT_COOKIE);
}
