import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ApiError } from './http.js';
import { query } from './db.js';
import { registerStudent, signupInput } from './model.js';

// Teacher sign-in. Credentials come from Vercel environment variables
// (ADMIN_USERNAME / ADMIN_PASSWORD); the session is a signed, HttpOnly cookie.

const COOKIE = 'rcdi_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const STUDENT_COOKIE = 'rcdi_student';
const STUDENT_MAX_AGE = 60 * 60 * 24 * 180; // students sign in once per device
const MAX_FAILURES = 5; // per IP per 15 minutes
const MAX_SIGNUPS = 10; // new accounts per IP per hour (a whole class can share one Wi-Fi)

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
  // Evaluate both comparisons so timing doesn't reveal which one failed.
  const userOk = safeEqual(username, creds.username);
  const passOk = safeEqual(password, creds.password);
  if (!(userOk && passOk)) {
    await recordFailure(ip);
    throw new ApiError('Wrong username or password.', 401);
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

// ---------- email + password (self sign-up) ----------

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(password, salt, 32);
  return `scrypt:${salt}:${key.toString('base64url')}`;
}

async function checkPassword(password, stored) {
  const [, salt, hash] = String(stored || 'scrypt:x:x').split(':');
  const key = await scryptAsync(password, salt, 32);
  return safeEqual(key.toString('base64url'), hash) && Boolean(stored);
}

/** Create a free account (marathons) and sign it in. */
export async function studentSignup(request, input, ip) {
  const { full_name, email, password } = signupInput(input);
  const signupKey = `signup:${ip}`;
  const [{ recent }] = await query(
    `SELECT COUNT(*)::int AS recent FROM login_attempts WHERE ip = $1 AND attempted_at > now() - interval '1 hour'`,
    [signupKey],
  );
  if (recent >= MAX_SIGNUPS) throw new ApiError('Too many new accounts from this network. Please try again later.', 429);
  const student = await registerStudent({ full_name, email, password_hash: await hashPassword(password) });
  await query('INSERT INTO login_attempts (ip) VALUES ($1)', [signupKey]);
  return cookieHeader(request, issue({ s: student.id }, STUDENT_MAX_AGE), STUDENT_MAX_AGE, STUDENT_COOKIE);
}

export async function studentPasswordLogin(request, email, password, ip) {
  await checkThrottle(ip);
  const [student] = await query(
    `SELECT id, password_hash FROM students WHERE lower(email) = lower($1) AND password_hash IS NOT NULL AND status = 'active'`,
    [String(email ?? '').trim()],
  );
  // Hash even for an unknown email so timing doesn't reveal which accounts exist.
  const ok = await checkPassword(String(password ?? ''), student?.password_hash);
  if (!student || !ok) {
    await recordFailure(ip);
    throw new ApiError('Wrong email or password.', 401);
  }
  return cookieHeader(request, issue({ s: student.id }, STUDENT_MAX_AGE), STUDENT_MAX_AGE, STUDENT_COOKIE);
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
