import { randomInt } from 'node:crypto';
import { ApiError } from './http.js';
import { averageBand, bandFor } from '../src/lib/band.js';
import { query } from './db.js';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const STATUSES = ['active', 'inactive'];
export const SKILLS = ['reading', 'listening'];
export const KINDS = ['marathon', 'exercise'];
// Activity-chart categories: one per kind × skill.
export const CATEGORIES = KINDS.flatMap((k) => SKILLS.map((s) => `${k}_${s}`));
const MARATHON_DAYS = 20;
const MARATHON_TOTAL = { reading: 13, listening: 20 };

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

function optionalInt(input, field, min, max) {
  const v = input[field];
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail(field, `Whole number ${min}–${max}`);
  return n;
}

/** A practice record: a marathon day or an exercise, for one or more students. */
export function lessonInput(input) {
  const ids = Array.isArray(input.student_ids) ? [...new Set(input.student_ids.map((v) => id(v, 'student_ids')))] : [];
  if (!ids.length) fail('student_ids', 'Choose at least one student');
  if (ids.length > 200) fail('student_ids', 'Too many students');
  const kind = oneOf(input, 'kind', KINDS);
  const skill = oneOf(input, 'skill', SKILLS);
  const duration = Number(input.duration_minutes);
  if (!Number.isInteger(duration) || duration < 5 || duration > 600) fail('duration_minutes', '5–600 minutes');

  let day = null;
  let topic = text(input, 'topic', { max: 200 });
  if (kind === 'marathon') {
    day = optionalInt(input, 'day', 1, MARATHON_DAYS);
    if (day === null) fail('day', 'Choose a day');
  } else if (!topic) {
    fail('topic', 'Name the passage or exercise');
  }

  const correct = optionalInt(input, 'correct', 0, 200);
  let total = optionalInt(input, 'total', 1, 200);
  if (correct !== null && total === null) total = kind === 'marathon' ? MARATHON_TOTAL[skill] : null;
  if (correct !== null && total === null) fail('total', 'Out of how many?');
  if (correct !== null && correct > total) fail('correct', 'More than the total');
  if (correct === null) total = null;
  if (correct !== null && ids.length > 1) fail('correct', 'Scores are per student — record them one at a time');

  return {
    student_ids: ids,
    lesson_date: date(input, 'lesson_date'),
    kind,
    skill,
    day,
    topic,
    correct,
    total,
    duration_minutes: duration,
    notes: text(input, 'notes', { max: 2000 }),
  };
}

// ---------- reads ----------

const STUDENT_COLUMNS = `s.id, s.full_name, s.phone, s.email, s.group_name, s.level,
  s.registered_at::text AS registered_at, s.status, s.notes, s.access_code,
  to_char(s.last_active_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_active_at`;

const LESSON_COLUMNS = `l.id, l.student_id, l.lesson_date::text AS lesson_date, l.kind, l.skill, l.day, l.topic,
  l.correct, l.total, l.duration_minutes, l.notes, l.source, l.item, s.full_name AS student_name, s.group_name`;

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

  const [[stats], marathon, lessons, activity, practice] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS lesson_count,
         COUNT(*) FILTER (WHERE kind = 'exercise')::int AS exercise_count,
         COUNT(DISTINCT (skill, day)) FILTER (WHERE kind = 'marathon')::int AS marathon_days,
         COALESCE(SUM(duration_minutes), 0)::int AS total_minutes,
         ROUND(AVG(correct::float8 / total * 100) FILTER (WHERE total > 0))::int AS average_score,
         MAX(lesson_date)::text AS last_lesson
       FROM lessons WHERE student_id = $1`,
      [studentId],
    ),
    // Best result per marathon day, for the progress grid.
    query(
      `SELECT DISTINCT ON (skill, day) skill, day, correct, total, lesson_date::text AS lesson_date
       FROM lessons WHERE student_id = $1 AND kind = 'marathon' AND day IS NOT NULL
       ORDER BY skill, day, (correct::float8 / NULLIF(total, 0)) DESC NULLS LAST, lesson_date DESC`,
      [studentId],
    ),
    listLessons({ studentId, limit: 100 }),
    monthlyActivity(studentId),
    // Best result per Reading Practice passage.
    query(
      `SELECT DISTINCT ON (item) item, correct, total, lesson_date::text AS lesson_date
       FROM lessons WHERE student_id = $1 AND item IS NOT NULL
       ORDER BY item, (correct::float8 / NULLIF(total, 0)) DESC NULLS LAST, lesson_date DESC`,
      [studentId],
    ),
  ]);
  const scored = await query(
    `SELECT skill, correct, total FROM lessons WHERE student_id = $1 AND correct IS NOT NULL AND total > 0`,
    [studentId],
  );
  stats.average_band = averageBand(scored.map((r) => bandFor(r.skill, r.correct, r.total)));
  const withBand = (r) => ({ ...r, band: bandFor(r.skill ?? 'reading', r.correct, r.total) });
  const elsDays = await elsForStudent(studentId);
  return {
    student,
    stats,
    els: elsDays,
    marathon: marathon.map(withBand),
    lessons,
    activity,
    practice: practice.map((r) => ({ ...r, band: bandFor('reading', r.correct, r.total) })),
  };
}

export async function listLessons({ studentId, kind, skill, from, to, limit = 300 } = {}) {
  const where = [];
  const params = [];
  if (studentId) where.push(`l.student_id = $${params.push(studentId)}`);
  if (kind) where.push(`l.kind = $${params.push(kind)}`);
  if (skill) where.push(`l.skill = $${params.push(skill)}`);
  if (from) where.push(`l.lesson_date >= $${params.push(from)}`);
  if (to) where.push(`l.lesson_date <= $${params.push(to)}`);
  const rows = await query(
    `SELECT ${LESSON_COLUMNS}
     FROM lessons l JOIN students s ON s.id = l.student_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY l.lesson_date DESC, l.id DESC
     LIMIT ${Math.min(Math.max(1, limit), 1000)}`,
    params,
  );
  return rows.map((r) => ({ ...r, band: bandFor(r.skill, r.correct, r.total) }));
}

/** Hours per category (kind_skill) for each of the last `months` calendar months (oldest first). */
export async function monthlyActivity(studentId = null, months = 7) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const params = [start.toISOString().slice(0, 10)];
  const rows = await query(
    `SELECT to_char(lesson_date, 'YYYY-MM') AS ym, kind || '_' || skill AS category,
       SUM(duration_minutes)::int AS minutes
     FROM lessons
     WHERE lesson_date >= $1 ${studentId ? `AND student_id = $${params.push(studentId)}` : ''}
     GROUP BY ym, category`,
    params,
  );
  const buckets = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const bucket = { key: d.toISOString().slice(0, 7), month: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) };
    for (const c of CATEGORIES) bucket[c] = 0;
    buckets.push(bucket);
  }
  for (const r of rows) {
    const b = buckets.find((x) => x.key === r.ym);
    if (b && r.category in b) b[r.category] = Math.round((r.minutes / 60) * 100) / 100;
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

// Unambiguous characters only (no 0/O, 1/I/L), so codes are easy to read out and type.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

/** Run `write(code)` with fresh codes until one isn't already taken. */
async function withFreshCode(write) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write(newCode());
    } catch (err) {
      const duplicate = /duplicate key|unique/i.test(String(err.message)) && /access_code/.test(String(err.message));
      if (!duplicate || attempt >= 4) throw err;
    }
  }
}

export async function createStudent(input) {
  const s = studentInput(input);
  return withFreshCode(async (code) => {
    const [row] = await query(
      `INSERT INTO students (full_name, phone, email, group_name, level, registered_at, status, notes, access_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, access_code`,
      [s.full_name, s.phone, s.email, s.group_name, s.level, s.registered_at, s.status, s.notes, code],
    );
    return row;
  });
}

/** Issue a new sign-in code (the old one stops working; signed-in devices stay signed in). */
export async function regenerateCode(studentId) {
  return withFreshCode(async (code) => {
    const rows = await query('UPDATE students SET access_code = $1 WHERE id = $2 RETURNING access_code', [code, studentId]);
    if (!rows.length) throw new ApiError('Student not found.', 404);
    return rows[0].access_code;
  });
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

  const params = [l.lesson_date, l.kind, l.skill, l.day, l.topic, l.correct, l.total, l.duration_minutes, l.notes];
  const values = l.student_ids.map((sid) => `($${params.push(sid)}, $1, $2, $3, $4, $5, $6, $7, $8, $9)`);
  await query(
    `INSERT INTO lessons (student_id, lesson_date, kind, skill, day, topic, correct, total, duration_minutes, notes)
     VALUES ${values.join(', ')}`,
    params,
  );
  return l.student_ids.length;
}

export async function deleteLesson(lessonId) {
  const rows = await query('DELETE FROM lessons WHERE id = $1 RETURNING id', [lessonId]);
  if (!rows.length) throw new ApiError('Lesson not found.', 404);
}

// ---------- student self-service & automatic tracking ----------

/** What a signed-in student sees about themselves — no contact details, no teacher notes. */
export async function studentSelf(studentId) {
  const data = await getStudent(studentId);
  const { id: sid, full_name, group_name, level } = data.student;
  return {
    student: { id: sid, full_name, group_name, level },
    stats: data.stats,
    marathon: data.marathon,
    practice: data.practice,
    recent: data.lessons.slice(0, 8).map(({ notes, ...l }) => l),
    activity: data.activity,
  };
}

/**
 * A heartbeat from a marathon page: add the student's active seconds to today's
 * automatic record for that day (created on first beat), and store the score
 * when the page reports one. Marathon totals are fixed, whatever the page says.
 */
export async function track(studentId, input) {
  const kind = oneOf(input, 'kind', KINDS);
  const skill = oneOf(input, 'skill', SKILLS);
  const seconds = optionalInt(input, 'seconds', 0, 900) ?? 0;
  const topic = text(input, 'topic', { max: 200 });

  let day = null;
  let item = null;
  let correct;
  let total;
  if (kind === 'marathon') {
    day = optionalInt(input, 'day', 1, MARATHON_DAYS);
    if (day === null) fail('day', 'Choose a day');
    correct = optionalInt(input, 'correct', 0, MARATHON_TOTAL[skill]);
    total = correct === null ? null : MARATHON_TOTAL[skill];
  } else {
    // A Reading Practice passage, identified by its page id.
    item = String(input.item ?? '');
    if (!/^p[1-3]-[a-z0-9-]{1,90}$/.test(item)) fail('item', 'Unknown passage');
    if (!topic) fail('topic', 'Missing title');
    correct = optionalInt(input, 'correct', 0, 60);
    total = correct === null ? null : optionalInt(input, 'total', 1, 60);
    if (correct !== null && (total === null || correct > total)) fail('total', 'Invalid score');
  }

  // The page sends its local date (Tashkent is UTC+5); accept it within a day of the server's.
  let lessonDate = new Date().toISOString().slice(0, 10);
  if (input.date) {
    const d = date(input, 'date');
    if (Math.abs(new Date(`${d}T12:00:00Z`) - Date.now()) <= 36 * 3600 * 1000) lessonDate = d;
  }

  const [row] = await query(
    `INSERT INTO lessons (student_id, lesson_date, kind, skill, day, item, topic, duration_minutes, active_seconds, correct, total, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, GREATEST(1, ROUND($8 / 60.0))::int, $8, $9, $10, 'auto')
     ON CONFLICT (student_id, kind, skill, (COALESCE(day, 0)), (COALESCE(item, '')), lesson_date) WHERE source = 'auto'
     DO UPDATE SET
       active_seconds = lessons.active_seconds + EXCLUDED.active_seconds,
       duration_minutes = GREATEST(1, ROUND((lessons.active_seconds + EXCLUDED.active_seconds) / 60.0))::int,
       correct = COALESCE(EXCLUDED.correct, lessons.correct),
       total = COALESCE(EXCLUDED.total, lessons.total),
       topic = CASE WHEN lessons.topic = '' THEN EXCLUDED.topic ELSE lessons.topic END
     RETURNING id, active_seconds, correct, total`,
    [studentId, lessonDate, kind, skill, day, item, topic, seconds, correct, total],
  );
  await query('UPDATE students SET last_active_at = now() WHERE id = $1', [studentId]);
  return row;
}

// ---------- rating (visible to signed-in students and the teacher) ----------

const PERIODS = { week: 7, month: 30, all: null };

function streak(dates) {
  // Longest run of consecutive study days.
  const days = [...new Set(dates)].sort().map((d) => Date.parse(`${d}T00:00:00Z`) / 86400000);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i && days[i] - days[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

function badges(s) {
  const out = [];
  if (s.records >= 1) out.push({ id: 'first', label: 'First step', emoji: '🌱' });
  if (s.marathon_reading >= 10 || s.marathon_listening >= 10) out.push({ id: 'half', label: 'Halfway marathoner', emoji: '🏃' });
  if (s.marathon_reading >= 19 || s.marathon_listening >= 20) out.push({ id: 'finisher', label: 'Marathon finisher', emoji: '🏁' });
  if (s.practice_done >= 10) out.push({ id: 'p10', label: '10 passages', emoji: '📚' });
  if (s.practice_done >= 50) out.push({ id: 'p50', label: '50 passages', emoji: '🏆' });
  if (s.minutes >= 300) out.push({ id: 'h5', label: '5-hour club', emoji: '⏱️' });
  if (s.minutes >= 1200) out.push({ id: 'h20', label: '20-hour club', emoji: '🔥' });
  if (s.best_streak >= 3) out.push({ id: 's3', label: '3-day streak', emoji: '✨' });
  if (s.best_streak >= 7) out.push({ id: 's7', label: '7-day streak', emoji: '⚡' });
  if (s.els_days >= 1) out.push({ id: 'els1', label: 'First translation', emoji: '✍️' });
  if (s.els_days >= 10) out.push({ id: 'els10', label: '10 translations', emoji: '📝' });
  if (s.els_days >= 20) out.push({ id: 'els20', label: 'ELS complete', emoji: '🎓' });
  if (s.average_band >= 7) out.push({ id: 'b7', label: 'Band 7+', emoji: '⭐' });
  if (s.top_band >= 9) out.push({ id: 'b9', label: 'Perfect 9', emoji: '💯' });
  return out;
}

/**
 * Every active student's study time and results, for the shared rating page.
 * Only names, groups and levels are shown — never contacts or teacher notes.
 */
export async function leaderboard(period = 'all') {
  const days = PERIODS[period] ?? null;
  const since = days ? new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10) : '0001-01-01';
  const [students, rows] = await Promise.all([
    query(`SELECT id, full_name, group_name, level FROM students WHERE status = 'active' ORDER BY lower(full_name)`),
    query(
      `SELECT l.student_id, l.lesson_date::text AS lesson_date, l.kind, l.skill, l.day, l.item, l.topic,
         l.correct, l.total, l.duration_minutes
       FROM lessons l JOIN students s ON s.id = l.student_id
       WHERE s.status = 'active' AND l.lesson_date >= $1
       ORDER BY l.lesson_date DESC, l.id DESC`,
      [since],
    ),
  ]);
  const by = new Map(students.map((s) => [s.id, []]));
  for (const r of rows) by.get(r.student_id)?.push({ ...r, band: bandFor(r.skill, r.correct, r.total) });
  // ELS uploads in the same period: days and photo ids per student.
  const elsRows = await query(
    `SELECT p.student_id, p.day, p.id FROM els_photos p
     WHERE p.created_at >= $1::date ORDER BY p.day, p.id`,
    [since],
  );
  const els = new Map();
  for (const r of elsRows) {
    if (!els.has(r.student_id)) els.set(r.student_id, new Map());
    const days = els.get(r.student_id);
    if (!days.has(r.day)) days.set(r.day, []);
    days.get(r.day).push(r.id);
  }

  const list = students.map((s) => {
    const recs = by.get(s.id);
    const marathon = (skill) => new Set(recs.filter((r) => r.kind === 'marathon' && r.skill === skill).map((r) => r.day)).size;
    const bands = recs.map((r) => r.band).filter((b) => b != null);
    const stats = {
      minutes: recs.reduce((t, r) => t + r.duration_minutes, 0),
      records: recs.length,
      marathon_reading: marathon('reading'),
      marathon_listening: marathon('listening'),
      practice_done: new Set(recs.filter((r) => r.item).map((r) => r.item)).size,
      average_band: averageBand(bands),
      top_band: bands.length ? Math.max(...bands) : null,
      best_streak: streak(recs.map((r) => r.lesson_date)),
      els_days: els.get(s.id)?.size ?? 0,
      last_date: recs[0]?.lesson_date ?? null,
    };
    return {
      id: s.id,
      full_name: s.full_name,
      group_name: s.group_name,
      level: s.level,
      ...stats,
      badges: badges(stats),
      els: [...(els.get(s.id) ?? new Map())].map(([day, photos]) => ({ day, photos })),
      done: recs.slice(0, 30).map(({ kind, skill, day, item, topic, correct, total, band, lesson_date, duration_minutes }) => ({
        kind, skill, day, item, topic, correct, total, band, lesson_date, duration_minutes,
      })),
    };
  });
  list.sort(
    (a, b) =>
      b.minutes - a.minutes || b.records + b.els_days - (a.records + a.els_days) || a.full_name.localeCompare(b.full_name),
  );
  return { period: days ? period : 'all', students: list };
}

// ---------- ELS Reading: notebook translation photos ----------

export const ELS_DAYS = 20;
const PHOTO_TYPES = { 'image/jpeg': true, 'image/png': true, 'image/webp': true };
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // pages are resized in the browser first (~300 KB)
const MAX_PHOTOS_PER_DAY = 8;

/** Save one photo for the signed-in student. `image` is a data URL. */
export async function addElsPhoto(studentId, input) {
  const day = optionalInt(input, 'day', 1, ELS_DAYS);
  if (day === null) fail('day', 'Choose a day');
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(input.image ?? ''));
  if (!m || !PHOTO_TYPES[m[1]]) fail('image', 'Upload a JPG, PNG or WebP photo');
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes > MAX_PHOTO_BYTES) fail('image', 'Photo is too large (max 2 MB)');
  const [{ n }] = await query('SELECT COUNT(*)::int AS n FROM els_photos WHERE student_id = $1 AND day = $2', [studentId, day]);
  if (n >= MAX_PHOTOS_PER_DAY) fail('image', `Up to ${MAX_PHOTOS_PER_DAY} photos per day`);
  const [row] = await query(
    `INSERT INTO els_photos (student_id, day, mime, data, bytes) VALUES ($1, $2, $3, decode($4, 'base64'), $5) RETURNING id`,
    [studentId, day, m[1], m[2], bytes],
  );
  await query('UPDATE students SET last_active_at = now() WHERE id = $1', [studentId]);
  return row.id;
}

/** Students may delete their own photos; the teacher may delete any. */
export async function deleteElsPhoto(photoId, { studentId = null } = {}) {
  const rows = studentId
    ? await query('DELETE FROM els_photos WHERE id = $1 AND student_id = $2 RETURNING id', [photoId, studentId])
    : await query('DELETE FROM els_photos WHERE id = $1 RETURNING id', [photoId]);
  if (!rows.length) throw new ApiError('Photo not found.', 404);
}

/** Everyone's photos for one day (newest first), grouped by student. Active students only. */
export async function elsDay(day) {
  const rows = await query(
    `SELECT p.id, p.student_id, s.full_name, s.group_name,
       to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
     FROM els_photos p JOIN students s ON s.id = p.student_id
     WHERE p.day = $1 AND s.status = 'active'
     ORDER BY p.created_at DESC, p.id DESC`,
    [day],
  );
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.student_id)) by.set(r.student_id, { student_id: r.student_id, full_name: r.full_name, group_name: r.group_name, photos: [] });
    by.get(r.student_id).photos.push({ id: r.id, created_at: r.created_at });
  }
  return [...by.values()];
}

/** Days each student has uploaded for: { [studentId]: { [day]: photoCount } }. */
export async function elsProgress(studentId = null) {
  const rows = await query(
    `SELECT student_id, day, COUNT(*)::int AS photos FROM els_photos
     ${studentId ? 'WHERE student_id = $1' : ''} GROUP BY student_id, day`,
    studentId ? [studentId] : [],
  );
  const out = {};
  for (const r of rows) (out[r.student_id] ??= {})[r.day] = r.photos;
  return out;
}

export async function elsPhoto(photoId) {
  const [row] = await query(
    `SELECT p.mime, encode(p.data, 'base64') AS b64 FROM els_photos p JOIN students s ON s.id = p.student_id
     WHERE p.id = $1 AND s.status = 'active'`,
    [photoId],
  );
  if (!row) throw new ApiError('Photo not found.', 404);
  return { mime: row.mime, body: Buffer.from(row.b64, 'base64') };
}

/** One student's uploads, for their profile: [{ day, photos: [id…] }]. */
export async function elsForStudent(studentId) {
  const rows = await query('SELECT id, day FROM els_photos WHERE student_id = $1 ORDER BY day, id', [studentId]);
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.day)) by.set(r.day, []);
    by.get(r.day).push(r.id);
  }
  return [...by].map(([day, photos]) => ({ day, photos }));
}
