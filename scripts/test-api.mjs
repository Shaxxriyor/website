// End-to-end checks for the /api functions against an in-memory PGlite database.
// Run: npm run test:api
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

process.env.ADMIN_USERNAME = 'teacher';
process.env.ADMIN_PASSWORD = 'correct-horse';
delete process.env.DATABASE_URL;
globalThis.__RCDI_DEV_DB__ = new PGlite();

const api = {
  auth: await import('../api/auth.js'),
  students: await import('../api/students.js'),
  lessons: await import('../api/lessons.js'),
  overview: await import('../api/overview.js'),
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
r = await post({ student_ids: [malika], kind: 'marathon', skill: 'reading', day: 7, duration_minutes: 60, correct: 14 });
assert.equal(r.status, 422, 'reading marathon is out of 13');
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
assert.equal(r.data.stats.marathon_days, 2, 'reading day 7 counted once');
assert.equal(r.data.stats.exercise_count, 1);
assert.equal(r.data.stats.total_minutes, 195);
// (11/13 + 15/20 + 6/8) / 3 ≈ 78%
assert.equal(r.data.stats.average_score, 78);
const day7 = r.data.marathon.find((m) => m.skill === 'reading' && m.day === 7);
assert.equal(day7.correct, 11, 'grid shows the best attempt');
assert.equal(day7.total, 13);
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

console.log('All API checks passed.');
