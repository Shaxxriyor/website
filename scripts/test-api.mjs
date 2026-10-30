import { bandFor, averageBand } from '../src/lib/band.js';
// End-to-end checks for the /api functions against an in-memory PGlite database.
// Run: npm run test:api
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

process.env.ADMIN_USERNAME = 'teacher';
process.env.ADMIN_PASSWORD = 'correct-horse';
// A second admin password, given as a hash (ADMIN_PASSWORD_HASH).
{
  const { scryptSync } = await import('node:crypto');
  process.env.ADMIN_PASSWORD_HASH = `scrypt:testsalt:${scryptSync('admin-button-pass', 'testsalt', 32).toString('base64url')}`;
}
delete process.env.DATABASE_URL;
globalThis.__RCDI_DEV_DB__ = new PGlite();

const api = {
  auth: await import('../api/auth.js'),
  students: await import('../api/students.js'),
  lessons: await import('../api/lessons.js'),
  overview: await import('../api/overview.js'),
  me: await import('../api/me.js'),
  track: await import('../api/track.js'),
  leaderboard: await import('../api/leaderboard.js'),
  avatar: await import('../api/avatar.js'),
  content: await import('../api/content.js'),
};

let cookie = '';
async function call(name, { method = 'GET', query = '', body, ip = '1.1.1.1' } = {}) {
  const headers = { 'x-forwarded-for': ip };
  if (cookie) headers.cookie = cookie;
  if (body) Object.assign(headers, { 'content-type': 'application/json', 'x-requested-with': 'fetch' });
  const res = await api[name][method](
    new Request(`https://example.test/api/${name}${query}`, { method, headers, body: body && JSON.stringify(body) }),
  );
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: res.status, data: await res.json() };
}

const today = new Date().toISOString().slice(0, 10);
let r;

// --- auth ---
r = await call('students');
assert.equal(r.status, 401, 'students requires sign-in');
r = await call('auth', { method: 'POST', body: { username: 'teacher', password: 'nope' } });
assert.equal(r.status, 401);
r = await call('auth', { method: 'POST', body: { username: 'teacher', password: 'correct-horse' } });
assert.equal(r.status, 200);
assert.match(cookie, /^rcdi_session=/);
r = await call('auth');
assert.equal(r.data.admin, 'teacher');
// the admin button: password only (ADMIN_PASSWORD or the built-in admin password)
{
  const keep = cookie;
  cookie = '';
  r = await call('auth', { method: 'POST', body: { password: 'admin-button-pass' }, ip: '5.5.5.5' });
  assert.equal(r.status, 200, 'hashed admin password works without a username');
  r = await call('auth');
  assert.equal(r.data.admin, 'teacher');
  cookie = '';
  r = await call('auth', { method: 'POST', body: { password: 'correct-horse' }, ip: '5.5.5.5' });
  assert.equal(r.status, 200, 'ADMIN_PASSWORD works without a username');
  cookie = '';
  r = await call('auth', { method: 'POST', body: { password: 'Admin-button-pass' }, ip: '5.5.5.5' });
  assert.equal(r.status, 401, 'wrong password (case matters)');
  r = await call('auth', { method: 'POST', body: { username: 'someone', password: 'admin-button-pass' }, ip: '5.5.5.5' });
  assert.equal(r.status, 401, 'a wrong username is still refused');
  cookie = keep;
}
const res = await api.students.POST(
  new Request('https://example.test/api/students', { method: 'POST', headers: { cookie }, body: '{"action":"create"}' }),
);
assert.equal(res.status, 400, 'writes without the custom header are rejected');

// --- students ---
const base = { phone: '+998 90 123 45 67', email: 'malika@example.com', group_name: 'IELTS-7A', level: 'B2', registered_at: today, status: 'active' };
r = await call('students', { method: 'POST', body: { action: 'create', ...base, full_name: '' } });
assert.equal(r.status, 422);
assert.ok(r.data.fields.full_name);
r = await call('students', { method: 'POST', body: { action: 'create', ...base, full_name: 'Malika R', email: 'bad' } });
assert.equal(r.status, 422);
assert.ok(r.data.fields.email);
r = await call('students', { method: 'POST', body: { action: 'create', ...base, full_name: 'Malika Rahimova' } });
assert.equal(r.status, 201);
const malika = r.data.id;
r = await call('students', { method: 'POST', body: { action: 'create', ...base, full_name: 'Jasur Toshev', email: '', level: 'B1' } });
const jasur = r.data.id;
r = await call('students');
assert.deepEqual(r.data.students.map((s) => s.full_name), ['Jasur Toshev', 'Malika Rahimova']);
assert.equal(r.data.students[1].registered_at, today);

// --- practice: marathon days & exercises ---
const post = (body) => call('lessons', { method: 'POST', body: { action: 'create', lesson_date: today, ...body } });
r = await post({ student_ids: [malika, jasur], kind: 'marathon', skill: 'reading', day: 7, duration_minutes: 60 });
assert.equal(r.status, 201, 'group marathon record without scores');
assert.equal(r.data.created, 2);
r = await post({ student_ids: [malika, jasur], kind: 'marathon', skill: 'reading', day: 8, duration_minutes: 60, correct: 10 });
assert.equal(r.status, 422, 'scores are per student');
r = await post({ student_ids: [malika], kind: 'marathon', skill: 'reading', duration_minutes: 60 });
assert.equal(r.status, 422, 'marathon needs a day');
assert.ok(r.data.fields.day);
r = await post({ student_ids: [malika], kind: 'marathon', skill: 'reading', day: 7, duration_minutes: 60, correct: 21 });
assert.equal(r.status, 422, 'reading marathon is out of 20');
r = await post({ student_ids: [malika], kind: 'marathon', skill: 'reading', day: 7, duration_minutes: 60, correct: 11 });
assert.equal(r.status, 201, 'better retry of the same day');
r = await post({ student_ids: [malika], kind: 'marathon', skill: 'listening', day: 3, duration_minutes: 45, correct: 15, total: 20 });
assert.equal(r.status, 201);
r = await post({ student_ids: [malika], kind: 'exercise', skill: 'reading', duration_minutes: 30 });
assert.equal(r.status, 422, 'exercise needs a name');
assert.ok(r.data.fields.topic);
r = await post({ student_ids: [malika], kind: 'exercise', skill: 'reading', topic: 'Matching headings', duration_minutes: 30, correct: 6 });
assert.equal(r.status, 422, 'exercise score needs a total');
r = await post({ student_ids: [malika], kind: 'exercise', skill: 'reading', topic: 'Matching headings', duration_minutes: 30, correct: 6, total: 8 });
assert.equal(r.status, 201);
r = await post({ student_ids: [9999], kind: 'exercise', skill: 'reading', topic: 'x', duration_minutes: 30 });
assert.equal(r.status, 422);

r = await call('students', { query: `?id=${malika}` });
assert.equal(r.status, 200);
assert.equal(r.data.stats.lesson_count, 4);
assert.equal(r.data.stats.marathon_days, 2, 'reading day 7 and listening day 3');
assert.equal(r.data.stats.exercise_count, 1);
assert.equal(r.data.stats.total_minutes, 195);
// (11/20 + 15/20 + 6/8) / 3 ≈ 68%
assert.equal(r.data.stats.average_score, 68);
const day7 = r.data.marathon.find((m) => m.skill === 'reading' && m.day === 7);
assert.equal(day7.correct, 11, 'grid shows the best attempt');
assert.equal(day7.total, 20);
assert.equal(r.data.activity.length, 7);
assert.equal(r.data.activity.at(-1).marathon_reading, 2);
assert.equal(r.data.activity.at(-1).marathon_listening, 0.75);
assert.equal(r.data.activity.at(-1).exercise_reading, 0.5);

r = await call('lessons', { query: '?kind=marathon&skill=reading' });
assert.equal(r.data.lessons.length, 3);
assert.equal(r.data.lessons[0].lesson_date, today);
r = await call('lessons', { query: '?kind=exercise' });
assert.equal(r.data.lessons.length, 1);
assert.equal(r.data.lessons[0].topic, 'Matching headings');

r = await call('overview');
assert.deepEqual(r.data.counts, { students: 2, active: 2, groups: 1 });
assert.equal(r.data.month.lessons, 5);
assert.equal(r.data.month.minutes, 255);

// --- updates & deletes ---
r = await call('students', { method: 'POST', body: { action: 'update', id: jasur, ...base, full_name: 'Jasur Toshev', status: 'inactive' } });
assert.equal(r.status, 200);
r = await call('overview');
assert.equal(r.data.counts.active, 1);
const lessonId = (await call('lessons', { query: `?student_id=${malika}` })).data.lessons[0].id;
r = await call('lessons', { method: 'POST', body: { action: 'delete', id: lessonId } });
assert.equal(r.status, 200);
r = await call('students', { method: 'POST', body: { action: 'delete', id: malika } });
assert.equal(r.status, 200);
r = await call('lessons');
assert.equal(r.data.lessons.length, 1, "deleting a student removes their lessons");
r = await call('students', { query: `?id=${malika}` });
assert.equal(r.status, 404);

// --- sign out & throttling ---
r = await call('auth', { method: 'POST', body: { action: 'logout' } });
assert.equal(cookie, 'rcdi_session=');
r = await call('students');
assert.equal(r.status, 401);
for (let i = 0; i < 5; i++) await call('auth', { method: 'POST', body: { username: 'x', password: 'y' }, ip: '9.9.9.9' });
r = await call('auth', { method: 'POST', body: { username: 'teacher', password: 'correct-horse' }, ip: '9.9.9.9' });
assert.equal(r.status, 429, 'locked out after 5 failures');
r = await call('auth', { method: 'POST', body: { username: 'teacher', password: 'correct-horse' }, ip: '2.2.2.2' });
assert.equal(r.status, 200, 'other IPs unaffected');

// --- students sign in with their code; the marathon pages track them ---
let studentCookie = '';
async function asStudent(name, { method = 'GET', body, ip = '3.3.3.3' } = {}) {
  const headers = { 'x-forwarded-for': ip };
  if (studentCookie) headers.cookie = studentCookie;
  if (body) Object.assign(headers, { 'content-type': 'application/json', 'x-requested-with': 'fetch' });
  const res = await api[name][method](
    new Request(`https://example.test/api/${name}`, { method, headers, body: body && JSON.stringify(body) }),
  );
  const set = res.headers.get('set-cookie');
  if (set) studentCookie = set.split(';')[0];
  return { status: res.status, data: await res.json() };
}
r = await call('auth', { method: 'POST', body: { username: 'teacher', password: 'correct-horse' }, ip: '4.4.4.4' });
r = await call('students', { method: 'POST', body: { action: 'create', ...base, full_name: 'Kamola Nazarova' } });
const kamola = r.data.id;
const code = r.data.access_code;
r = await call('students', { query: `?id=${kamola}` });
assert.equal(r.data.student.access_code, code, 'registration returns the sign-in code');
assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/, 'readable 8-character code');

r = await asStudent('me');
assert.equal(r.data.student, null);
r = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 4, seconds: 60 } });
assert.equal(r.status, 401, 'tracking requires a signed-in student');
r = await asStudent('me', { method: 'POST', body: { action: 'login', code: 'WRONG123' } });
assert.equal(r.status, 401);
r = await asStudent('me', { method: 'POST', body: { action: 'login', code: `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}` } });
assert.equal(r.status, 200, 'code is case/dash-insensitive');
r = await asStudent('me');
assert.equal(r.data.student.full_name, 'Kamola Nazarova');
assert.equal(r.data.student.phone, undefined, 'no contact details for students');
r = await asStudent('students');
assert.equal(r.status, 401, 'students cannot see the student list');

// heartbeats accumulate into one automatic record per day page per date
r = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 4, seconds: 75, date: today, topic: 'Keeping the water away' } });
assert.equal(r.status, 200);
r = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 4, seconds: 45, date: today } });
assert.equal(r.data.active_seconds, 120);
r = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 4, seconds: 10, correct: 17, total: 40 } });
assert.equal(r.data.correct, 17);
assert.equal(r.data.total, 20, 'reading marathon days have 20 questions');
r = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 4, seconds: 10, correct: 21 } });
assert.equal(r.status, 422, 'score cannot exceed 20');
r = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'listening', day: 2, seconds: 10, correct: 27 } });
assert.equal(r.status, 422, 'listening days 1–12 have 26 questions');
r = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'listening', day: 2, seconds: 5000 } });
assert.equal(r.status, 422, 'one heartbeat cannot claim more than 15 minutes');

// Reading Practice passages: tracked per passage, total comes from the page
const pr = { kind: 'exercise', skill: 'reading', item: 'p2-coral-reefs', topic: 'Passage 2 · Coral Reefs', date: today };
r = await asStudent('track', { method: 'POST', body: { ...pr, seconds: 90 } });
assert.equal(r.status, 200);
r = await asStudent('track', { method: 'POST', body: { ...pr, seconds: 30, correct: 11, total: 14 } });
assert.equal(r.data.active_seconds, 120);
assert.equal(r.data.correct, 11);
assert.equal(r.data.total, 14);
r = await asStudent('track', { method: 'POST', body: { ...pr, seconds: 5, correct: 15, total: 14 } });
assert.equal(r.status, 422, 'score cannot exceed the page total');
r = await asStudent('track', { method: 'POST', body: { ...pr, item: '../../etc', seconds: 5 } });
assert.equal(r.status, 422, 'unknown passage ids are rejected');
r = await asStudent('track', { method: 'POST', body: { ...pr, item: 'p1-rubber', topic: 'Passage 1 · Rubber', seconds: 70 } });
assert.equal(r.status, 200, 'a second passage on the same day is its own record');

r = await asStudent('me');
assert.deepEqual(
  r.data.practice.map((x) => [x.item, x.correct]).sort(),
  [['p1-rubber', null], ['p2-coral-reefs', 11]],
);
assert.equal(r.data.stats.exercise_count, 2);
assert.equal(r.data.stats.marathon_days, 1, 'reading day 4 counts once it is done');
// bands: 11/14 → 31/40 → 7.0 (reading); 17/20 → 34/40 → 7.5; average 7.25 → 7.5 (IELTS rounding)
assert.equal(r.data.practice.find((x) => x.item === 'p2-coral-reefs').band, 7);
assert.equal(r.data.marathon.find((x) => x.day === 4).band, 7.5);
assert.equal(r.data.stats.average_band, 7.5);
assert.equal(r.data.recent.find((x) => x.item === 'p2-coral-reefs').band, 7);
assert.equal(r.data.stats.total_minutes, 5);
assert.equal(r.data.recent[0].source, 'auto');
assert.equal(r.data.recent[0].notes, undefined);
r = await call('lessons', { query: `?student_id=${kamola}&kind=marathon` });
assert.equal(r.data.lessons.length, 1);
assert.equal(r.data.lessons[0].source, 'auto');
assert.equal(r.data.lessons[0].topic, 'Keeping the water away');
r = await call('students');
assert.ok(r.data.students.find((x) => x.id === kamola).last_active_at, 'last active is recorded');

// rating: students see each other (names only), anonymous visitors don't
r = await asStudent('leaderboard');
assert.equal(r.status, 200);
const kRow = r.data.students.find((x) => x.full_name === 'Kamola Nazarova');
assert.equal(r.data.me, kRow.id);
assert.equal(kRow.practice_done, 2);
assert.equal(kRow.marathon_reading, 1);
assert.ok(kRow.badges.some((b) => b.id === 'first'));
assert.ok(kRow.done.length >= 3);
assert.equal(kRow.phone, undefined, 'no contact details in the rating');
assert.equal(JSON.stringify(r.data).includes('@example.com'), false, 'no emails anywhere in the rating');
assert.ok(r.data.students.every((x) => x.full_name !== 'Malika Rahimova'), 'deleted students are not listed');
const anonRes = await api.leaderboard.GET(new Request('https://example.test/api/leaderboard'));
assert.equal(anonRes.status, 401);
r = await call('leaderboard', { query: '?period=week' });
assert.equal(r.status, 200, 'teacher can see the rating');
assert.equal(r.data.period, 'week');

// Reading Marathon day = the reading test (no ELS step any more): day 4 was tested earlier
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
r = await asStudent('me');
assert.equal(r.data.marathon.find((m) => m.skill === 'reading' && m.day === 4).complete, true);
assert.equal(r.data.els, undefined, 'no ELS data any more');
r = await asStudent('leaderboard');
assert.equal(r.data.students.find((x) => x.full_name === 'Kamola Nazarova').marathon_reading, 1);

// profile photo: student sets it, classmates see it, teacher can remove it
r = await asStudent('me', { method: 'POST', body: { action: 'avatar', image: PNG } });
assert.equal(r.data.avatar_v, 1);
r = await asStudent('leaderboard');
assert.equal(r.data.students.find((x) => x.full_name === 'Kamola Nazarova').avatar_v, 1);
r = await api.avatar.GET(new Request(`https://example.test/api/avatar?id=${kamola}&v=1`, { headers: { cookie: studentCookie } }));
assert.equal(r.status, 200);
assert.equal(r.headers.get('content-type'), 'image/png');
r = await api.avatar.GET(new Request(`https://example.test/api/avatar?id=${kamola}`));
assert.equal(r.status, 401, 'avatars need sign-in');
r = await asStudent('me', { method: 'POST', body: { action: 'avatar', image: 'data:image/svg+xml;base64,PHN2Zz4=' } });
assert.equal(r.status, 422, 'no SVG avatars');
r = await call('students', { method: 'POST', body: { action: 'remove-avatar', id: kamola } });
assert.equal(r.status, 200);
r = await asStudent('me');
assert.equal(r.data.student.avatar_v, null, 'teacher removed it');

// attempts: every try is kept in order; the record keeps the best
const t1 = await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 9, seconds: 70, correct: 10 } });
assert.equal(t1.status, 200);
await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 9, seconds: 5, correct: 10 } }); // same score resent: ignored
await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 9, seconds: 60, correct: 20 } });
await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'reading', day: 9, seconds: 60, correct: 12 } });
r = await asStudent('me');
const d9 = r.data.attempts.find((g) => g.key === 'reading-9');
assert.deepEqual(d9.tries.map((x) => x.correct), [10, 20, 12], 'attempts in order');
assert.equal(d9.tries[1].band, 9);
assert.equal(r.data.marathon.find((m) => m.skill === 'reading' && m.day === 9).correct, 20, 'grid keeps the best');
// sittings: same score twice in two page visits = two attempts; re-sent within one visit = one
for (const sitting of ['visitaaaa1', 'visitaaaa1', 'visitbbbb2']) {
  await asStudent('track', { method: 'POST', body: { kind: 'marathon', skill: 'listening', day: 5, seconds: 60, correct: 15, sitting } });
}
r = await asStudent('me');
assert.deepEqual(r.data.attempts.find((g) => g.key === 'listening-5').tries.map((x) => x.correct), [15, 15]);
r = await call('students', { query: `?id=${kamola}` });
assert.ok(r.data.attempts.some((g) => g.key === 'p2-coral-reefs' && g.tries.length === 1), 'teacher sees attempts; older scores backfilled');

// course materials: day 1 free, the rest for signed-in students / teacher
const get = (path, cookieHeader) =>
  api.content.GET(new Request(`https://example.test/api/content?path=${encodeURIComponent(path)}`, { headers: cookieHeader ? { cookie: cookieHeader } : {} }));
r = await get('els/day-01-1.webp');
assert.equal(r.status, 404, 'ELS Reading is gone');
r = await get('practice/reading/p1-a-brief-history-of-ballet.html');
assert.equal(r.status, 200, 'first Passage 1 practice is free');
r = await get('practice/reading/p1-rubber.html');
assert.equal(r.status, 401);
assert.match(await r.text(), /For READING_CDI students/);
r = await get('vocab/collocations/unit-05.json', studentCookie);
assert.equal(r.status, 200, 'signed-in student opens everything');
assert.equal(r.headers.get('cache-control'), 'private, no-store');
r = await get('practice/listening/test-30.html', cookie);
assert.equal(r.status, 200, 'teacher too');
r = await get('marathon/reading/day-01.html');
assert.equal(r.status, 401, 'marathons are for registered students only (no free day)');
r = await get('marathon/listening/day-01.html');
assert.equal(r.status, 401);
r = await get('marathon/reading/day-20.html', studentCookie);
assert.equal(r.status, 200, 'registered students open every marathon day');

// sign-up is closed: the teacher registers students and gives them a code
r = await asStudent('me', { method: 'POST', body: { action: 'signup', full_name: 'Aziz Karimov', email: 'aziz@example.com', password: 'longenough1' }, ip: '7.7.7.7' });
assert.equal(r.status, 400, 'no self sign-up');
r = await asStudent('me', { method: 'POST', body: { action: 'email-login', email: 'aziz@example.com', password: 'longenough1' }, ip: '7.7.7.7' });
assert.equal(r.status, 400, 'no email sign-in');
// practice access is per student, set by the teacher
r = await call('students', { method: 'POST', body: { action: 'create', ...base, email: '', full_name: 'Aziz Karimov', practice_access: false } });
const aziz = r.data;
let azizCookie = '';
{
  const res = await api.me.POST(new Request('https://example.test/api/me', { method: 'POST', headers: { 'x-forwarded-for': '7.7.7.8', 'content-type': 'application/json', 'x-requested-with': 'fetch' }, body: JSON.stringify({ action: 'login', code: aziz.access_code }) }));
  azizCookie = res.headers.get('set-cookie').split(';')[0];
}
r = await get('practice/reading/p1-rubber.html', azizCookie);
assert.equal(r.status, 403, 'Reading Practice locked until the teacher opens it');
assert.match(await r.text(), /Reading Practice is for course students/);
r = await get('practice/reading/p1-a-brief-history-of-ballet.html', azizCookie);
assert.equal(r.status, 200, 'free practice passage still open');
r = await get('marathon/listening/day-05.html', azizCookie);
assert.equal(r.status, 200, 'marathons open to every registered student');
r = await get('practice/reading/p1-rubber.html', studentCookie);
assert.equal(r.status, 200, 'students with practice access open it');
r = await call('students', { method: 'POST', body: { action: 'practice-access', id: aziz.id, value: true } });
assert.equal(r.status, 200);
r = await get('practice/reading/p1-rubber.html', azizCookie);
assert.equal(r.status, 200, 'teacher opened Reading Practice');
const selfSignedIn = azizCookie;

// Listening Practice: test 1 free, the engine is public, the rest need practice access
r = await get('practice/listening/test-1.html');
assert.equal(r.status, 200, 'Listening Test 1 is free');
r = await get('practice/listening/test-9.html');
assert.equal(r.status, 401);
r = await get('practice/listening/test-9.html', studentCookie);
assert.equal(r.status, 200, 'course student opens listening tests');
const { readdirSync } = await import('node:fs');
const engineFile = readdirSync('content/practice/listening/_shared').find((f) => f.endsWith('.js'));
r = await get(`practice/listening/_shared/${engineFile}`);
assert.equal(r.status, 200, 'shared engine is public');
assert.match(r.headers.get('cache-control'), /immutable/);
r = await get('practice/listening/_shared/../../../package.json');
assert.equal(r.status, 404);
r = await get('vocab/evil.js', studentCookie);
assert.equal(r.status, 404, 'scripts only from the shared engine folder');
r = await asStudent('track', { method: 'POST', body: { kind: 'exercise', skill: 'listening', item: 'test-9', topic: 'Listening Test 9', seconds: 120, correct: 31, total: 40, sitting: 'listen0001' } });
assert.equal(r.status, 200, 'listening test score saved');
r = await asStudent('track', { method: 'POST', body: { kind: 'exercise', skill: 'listening', item: 'p1-rubber', topic: 'x', correct: 1, total: 40 } });
assert.equal(r.status, 422, 'listening items are test-N');
r = await asStudent('me');
const lt = r.data.practice.find((p) => p.item === 'test-9');
assert.equal(lt.skill, 'listening');
assert.equal(lt.band, 7, '31/40 listening → band 7.0');

// vocabulary flashcards: unit 1 free, the rest with any account; progress saved per unit
r = await get('vocab/collocations/unit-01.json');
assert.equal(r.status, 200, 'unit 1 is free');
assert.ok((await r.json()).cards.length > 10);
r = await get('vocab/essential-words-5/unit-02.json');
assert.equal(r.status, 401, 'unit 2 needs an account');
r = await get('vocab/essential-words-5/unit-02.json', selfSignedIn);
assert.equal(r.status, 200, 'registered students open vocabulary');
assert.equal((await r.json()).cards.length, 20);
r = await get('vocab/essential-words-5/../../package.json', selfSignedIn);
assert.equal(r.status, 404);
r = await asStudent('me', { method: 'POST', body: { action: 'vocab', book: 'essential-words-5', unit: 2, known: [0, 3, 3, 7], total: 20 } });
assert.equal(r.status, 200);
r = await asStudent('me', { method: 'POST', body: { action: 'vocab', book: 'essential-words-5', unit: 2, known: [25], total: 20 } });
assert.equal(r.status, 422, 'card outside the unit');
r = await asStudent('me', { method: 'POST', body: { action: 'vocab', book: 'nope', unit: 1, known: [], total: 20 } });
assert.equal(r.status, 422);
r = await asStudent('me');
assert.deepEqual(r.data.vocab.map((v) => [v.book, v.unit, v.known]), [['essential-words-5', 2, [0, 3, 7]]]);

for (const bad of ['../package.json', 'marathon/../../.env', '/etc/passwd', 'marathon/reading/day-01.js', 'src/App.jsx']) {
  r = await get(bad, studentCookie);
  assert.equal(r.status, 404, `blocked: ${bad}`);
}

// public profile from the rating
{
  const res = await api.leaderboard.GET(new Request(`https://example.test/api/leaderboard?id=${kamola}`, { headers: { cookie: studentCookie } }));
  assert.equal(res.status, 200);
  const prof = await res.json();
  assert.equal(prof.student.full_name, 'Kamola Nazarova');
  assert.ok(prof.rank >= 1 && prof.summary.minutes > 0);
  assert.ok(prof.attempts.length > 0 && prof.recent.length > 0);
  const raw = JSON.stringify(prof);
  assert.ok(!raw.includes('@example.com') && !raw.includes('+998') && !raw.includes('access_code'), 'no private data');
  const anon = await api.leaderboard.GET(new Request(`https://example.test/api/leaderboard?id=${kamola}`));
  assert.equal(anon.status, 401);
}

// new code: old one stops working; inactive students are signed out
r = await call('students', { method: 'POST', body: { action: 'new-code', id: kamola } });
assert.notEqual(r.data.access_code, code);
const saved = studentCookie;
studentCookie = '';
r = await asStudent('me', { method: 'POST', body: { action: 'login', code } });
assert.equal(r.status, 401, 'old code no longer works');
studentCookie = saved;
r = await call('students', { method: 'POST', body: { action: 'update', id: kamola, ...base, full_name: 'Kamola Nazarova', status: 'inactive' } });
r = await asStudent('me');
assert.equal(r.data.student, null, 'inactive students are signed out');

// band tables
assert.equal(bandFor('reading', 13, 13), 9);
assert.equal(bandFor('reading', 0, 13), 0);
assert.equal(bandFor('listening', 17, 20), 7.5); // 34/40
assert.equal(bandFor('listening', 15, 20), 7); // 30/40
assert.equal(bandFor('reading', null, 13), null);
assert.equal(averageBand([6, 6.5]), 6.5);
assert.equal(averageBand([]), null);

// listening days 13–20 have 32 questions (the page sends its own total)
r = await call('lessons', { method: 'POST', body: { action: 'create', lesson_date: today, student_ids: [kamola], kind: 'marathon', skill: 'listening', day: 14, duration_minutes: 40, correct: 30 } });
assert.equal(r.status, 201);
r = await call('lessons', { query: `?student_id=${kamola}&kind=marathon&skill=listening` });
assert.equal(r.data.lessons.find((l) => l.day === 14).total, 32, 'teacher records use the day total too');

// delete all students: needs the typed confirmation, removes everyone and their records
r = await call('students', { method: 'POST', body: { action: 'delete-all', confirm: 'yes' } });
assert.equal(r.status, 422, 'needs DELETE ALL');
r = await call('students', { method: 'POST', body: { action: 'delete-all', confirm: 'DELETE ALL' } });
assert.equal(r.status, 200);
assert.ok(r.data.deleted >= 2);
r = await call('students');
assert.equal(r.data.students.length, 0, 'no students left');
r = await asStudent('me');
assert.equal(r.data.student, null, 'their devices are signed out');

console.log('All API checks passed.');
