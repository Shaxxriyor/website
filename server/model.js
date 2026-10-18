import { ApiError } from './http.js';
import { query } from './db.js';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const STATUSES = ['active', 'inactive'];
export const SKILLS = ['reading', 'listening', 'vocabulary', 'mock', 'other'];

// ---------- validation ----------

function fail(field, message) {
  throw new ApiError('Please check the highlighted fields.', 422, { [field]: message });
}

export function text(input, field, { max = 200, required = false } = {}) {
  const v = String(input[field] ?? '').trim();
  if (required && !v) fail(field, 'Required');
  if (v.length > max) fail(field, `At most ${max} characters`);
  return v;
}

export function date(input, field) {
  const v = String(input[field] ?? '');
  const d = new Date(`${v}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    fail(field, 'Enter a valid date');
  }
  return v;
}

export function oneOf(input, field, allowed) {
  const v = String(input[field] ?? '');
  if (!allowed.includes(v)) fail(field, 'Choose an option');
  return v;
}

export function id(value, field = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) fail(field, 'Invalid id');
  return n;
}

export function studentInput(input) {
  const email = text(input, 'email', { max: 160 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('email', 'Enter a valid email');
  const phone = text(input, 'phone', { max: 40 });
  if (phone && !/^[+\d][\d\s()-]{5,}$/.test(phone)) fail('phone', 'Enter a valid phone number');
  return {
    full_name: text(input, 'full_name', { max: 120, required: true }),
    phone,
    email,
    group_name: text(input, 'group_name', { max: 80 }),
    level: oneOf(input, 'level', LEVELS),
    registered_at: date(input, 'registered_at'),
    status: oneOf(input, 'status', STATUSES),
    notes: text(input, 'notes', { max: 2000 }),
  };
}

export function lessonInput(input) {
  const ids = Array.isArray(input.student_ids) ? [...new Set(input.student_ids.map((v) => id(v, 'student_ids')))] : [];
  if (!ids.length) fail('student_ids', 'Choose at least one student');
  if (ids.length > 200) fail('student_ids', 'Too many students');
  const duration = Number(input.duration_minutes);
  if (!Number.isInteger(duration) || duration < 5 || duration > 600) fail('duration_minutes', '5–600 minutes');
  let band = input.band;
  if (band === '' || band === null || band === undefined) {
    band = null;
  } else {
    band = Number(band);
    if (!(band >= 0 && band <= 9) || (band * 2) % 1 !== 0) fail('band', 'Band 0–9 in steps of 0.5');
  }
  return {
    student_ids: ids,
    lesson_date: date(input, 'lesson_date'),
    skill: oneOf(input, 'skill', SKILLS),
    topic: text(input, 'topic', { max: 200 }),
    duration_minutes: duration,
    band,
    notes: text(input, 'notes', { max: 2000 }),
  };
}

// ---------- reads ----------

const STUDENT_COLUMNS = `s.id, s.full_name, s.phone, s.email, s.group_name, s.level,
  s.registered_at::text AS registered_at, s.status, s.notes`;

const LESSON_COLUMNS = `l.id, l.student_id, l.lesson_date::text AS lesson_date, l.skill, l.topic,
  l.duration_minutes, l.band::float8 AS band, l.notes, s.full_name AS student_name, s.group_name`;

export async function listStudents() {
  return query(
    `SELECT ${STUDENT_COLUMNS},
       COUNT(l.id)::int AS lesson_count,
       COALESCE(SUM(l.duration_minutes), 0)::int AS total_minutes,
       MAX(l.lesson_date)::text AS last_lesson
     FROM students s LEFT JOIN lessons l ON l.student_id = s.id
     GROUP BY s.id
     ORDER BY lower(s.full_name)`,
  );
}

export async function getStudent(studentId) {
  const [student] = await query(`SELECT ${STUDENT_COLUMNS} FROM students s WHERE s.id = $1`, [studentId]);
  if (!student) throw new ApiError('Student not found.', 404);

  const [[stats], skills, lessons, activity] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS lesson_count,
         COALESCE(SUM(duration_minutes), 0)::int AS total_minutes,
         AVG(band)::float8 AS average_band,
         MAX(lesson_date)::text AS last_lesson
       FROM lessons WHERE student_id = $1`,
      [studentId],
    ),
    query(
      `SELECT skill, COUNT(*)::int AS lessons, SUM(duration_minutes)::int AS minutes
       FROM lessons WHERE student_id = $1 GROUP BY skill`,
      [studentId],
    ),
    listLessons({ studentId, limit: 100 }),
    monthlyActivity(studentId),
  ]);
  return { student, stats, skills, lessons, activity };
}

export async function listLessons({ studentId, skill, from, to, limit = 300 } = {}) {
  const where = [];
  const params = [];
  if (studentId) where.push(`l.student_id = $${params.push(studentId)}`);
  if (skill) where.push(`l.skill = $${params.push(skill)}`);
  if (from) where.push(`l.lesson_date >= $${params.push(from)}`);
  if (to) where.push(`l.lesson_date <= $${params.push(to)}`);
  return query(
    `SELECT ${LESSON_COLUMNS}
     FROM lessons l JOIN students s ON s.id = l.student_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY l.lesson_date DESC, l.id DESC
     LIMIT ${Math.min(Math.max(1, limit), 1000)}`,
    params,
  );
}

/** Hours per skill for each of the last `months` calendar months (oldest first). */
export async function monthlyActivity(studentId = null, months = 7) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const params = [start.toISOString().slice(0, 10)];
  const rows = await query(
    `SELECT to_char(lesson_date, 'YYYY-MM') AS ym, skill, SUM(duration_minutes)::int AS minutes
     FROM lessons
     WHERE lesson_date >= $1 ${studentId ? `AND student_id = $${params.push(studentId)}` : ''}
     GROUP BY ym, skill`,
    params,
  );
  const buckets = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const bucket = { key: d.toISOString().slice(0, 7), month: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) };
    for (const s of SKILLS) bucket[s] = 0;
    buckets.push(bucket);
  }
  for (const r of rows) {
    const b = buckets.find((x) => x.key === r.ym);
    if (b && r.skill in b) b[r.skill] = Math.round((r.minutes / 60) * 100) / 100;
  }
  return buckets;
}

export async function overview() {
  const monthStart = new Date();
  const firstOfMonth = `${monthStart.toISOString().slice(0, 7)}-01`;
  const [[counts], [month], recent, activity] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS students,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(DISTINCT NULLIF(group_name, ''))::int AS groups
       FROM students`,
    ),
    query(
      `SELECT COUNT(*)::int AS lessons, COALESCE(SUM(duration_minutes), 0)::int AS minutes
       FROM lessons WHERE lesson_date >= $1`,
      [firstOfMonth],
    ),
    listLessons({ limit: 6 }),
    monthlyActivity(),
  ]);
  return { counts, month, recent, activity };
}

// ---------- writes ----------

export async function createStudent(input) {
  const s = studentInput(input);
  const [row] = await query(
    `INSERT INTO students (full_name, phone, email, group_name, level, registered_at, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [s.full_name, s.phone, s.email, s.group_name, s.level, s.registered_at, s.status, s.notes],
  );
  return row.id;
}

export async function updateStudent(studentId, input) {
  const s = studentInput(input);
  const rows = await query(
    `UPDATE students SET full_name = $1, phone = $2, email = $3, group_name = $4, level = $5,
       registered_at = $6, status = $7, notes = $8, updated_at = now()
     WHERE id = $9 RETURNING id`,
    [s.full_name, s.phone, s.email, s.group_name, s.level, s.registered_at, s.status, s.notes, studentId],
  );
  if (!rows.length) throw new ApiError('Student not found.', 404);
}

export async function deleteStudent(studentId) {
  const rows = await query('DELETE FROM students WHERE id = $1 RETURNING id', [studentId]);
  if (!rows.length) throw new ApiError('Student not found.', 404);
}

export async function createLessons(input) {
  const l = lessonInput(input);
  const found = await query('SELECT id FROM students WHERE id = ANY($1::int[])', [l.student_ids]);
  if (found.length !== l.student_ids.length) throw new ApiError('Some students no longer exist.', 422);

  const params = [l.lesson_date, l.skill, l.topic, l.duration_minutes, l.band, l.notes];
  const values = l.student_ids.map((sid) => `($${params.push(sid)}, $1, $2, $3, $4, $5, $6)`);
  await query(
    `INSERT INTO lessons (student_id, lesson_date, skill, topic, duration_minutes, band, notes)
     VALUES ${values.join(', ')}`,
    params,
  );
  return l.student_ids.length;
}

export async function deleteLesson(lessonId) {
  const rows = await query('DELETE FROM lessons WHERE id = $1 RETURNING id', [lessonId]);
  if (!rows.length) throw new ApiError('Lesson not found.', 404);
}
