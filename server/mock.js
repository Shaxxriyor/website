import { ApiError } from './http.js';
import { query } from './db.js';
import { mockById } from '../src/lib/mocks.js';

// Full mock test results. The mock page (public/mock-guard.js) sends the whole
// sitting after every part; only what the report needs is kept, cleaned and capped.

const str = (v, max) => String(v ?? '').slice(0, max);
const int = (v, lo, hi) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};
const time = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 1.5e12 && n < 4e12 ? n : null;
};
const LEAVES = ['tab', 'window', 'fullscreen', 'back'];
const MODULES = ['listening', 'reading', 'writing', ''];

function module(m) {
  if (!m || typeof m !== 'object') return null;
  const band = Number(m.band);
  return {
    correct: int(m.correct, 0, 60) ?? 0,
    total: int(m.total, 1, 60) ?? 40,
    band: Number.isFinite(band) ? (Math.round(Math.min(9, Math.max(0, band)) * 2) / 2).toFixed(1) : '0.0',
    rows: (Array.isArray(m.rows) ? m.rows : []).slice(0, 80).map((r) => ({
      q: str(r?.q, 20),
      ua: str(r?.ua, 400),
      ca: str(r?.ca, 400),
      got: int(r?.got, 0, 10) ?? 0,
      of: int(r?.of, 1, 10) ?? 1,
      part: int(r?.part, 0, 4) ?? 0,
    })),
  };
}

export function cleanResult(input) {
  const r = input && typeof input === 'object' ? input : {};
  const mock = mockById(r.mock);
  if (!mock) throw new ApiError('Unknown mock test.', 400);
  const sitting = str(r.sitting, 40);
  if (!/^[a-z0-9]{8,40}$/.test(sitting)) throw new ApiError('Bad sitting.', 400);
  const task = (t) => ({
    text: str(t?.text, 3000),
    image: /^\/mock-media\/[a-z0-9.-]+\.(jpg|png|webp)$/.test(t?.image || '') ? t.image : '',
  });
  return {
    mock: mock.id,
    title: mock.title,
    name: str(r.name, 120),
    sitting,
    startedAt: time(r.startedAt),
    finishedAt: time(r.finishedAt),
    lang: r.lang === 'ru' ? 'ru' : 'uz',
    done: { listening: Boolean(r.done?.listening), reading: Boolean(r.done?.reading), writing: Boolean(r.done?.writing) },
    res: { listening: module(r.res?.listening), reading: module(r.res?.reading) },
    w: { t1: str(r.w?.t1, 20000), t2: str(r.w?.t2, 20000) },
    leaves: (Array.isArray(r.leaves) ? r.leaves : []).slice(0, 500).map((l) => ({
      at: time(l?.at) ?? 0,
      type: LEAVES.includes(l?.type) ? l.type : 'window',
      mod: MODULES.includes(l?.mod) ? l.mod : '',
    })),
    tasks: { 1: task(r.tasks?.[1]), 2: task(r.tasks?.[2]) },
  };
}

const words = (t) => (String(t || '').match(/[A-Za-z0-9À-ɏ][A-Za-z0-9À-ɏ'’-]*/g) || []).length;

export async function saveMockResult(studentId, input) {
  const d = cleanResult(input);
  const L = d.res.listening;
  const R = d.res.reading;
  const [row] = await query(
    `INSERT INTO mock_results (student_id, mock, sitting, data, listening_correct, listening_band, reading_correct, reading_band,
       writing_words, leaves, started_at, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11 / 1000.0), to_timestamp($12 / 1000.0))
     ON CONFLICT (student_id, mock, sitting) DO UPDATE SET data = EXCLUDED.data,
       listening_correct = EXCLUDED.listening_correct, listening_band = EXCLUDED.listening_band,
       reading_correct = EXCLUDED.reading_correct, reading_band = EXCLUDED.reading_band,
       writing_words = EXCLUDED.writing_words, leaves = EXCLUDED.leaves,
       started_at = COALESCE(mock_results.started_at, EXCLUDED.started_at),
       finished_at = COALESCE(EXCLUDED.finished_at, mock_results.finished_at), updated_at = now()
     RETURNING id`,
    [
      studentId,
      d.mock,
      d.sitting,
      JSON.stringify(d),
      L?.correct ?? null,
      L ? Number(L.band) : null,
      R?.correct ?? null,
      R ? Number(R.band) : null,
      [words(d.w.t1), words(d.w.t2)],
      d.leaves.length,
      d.startedAt,
      d.finishedAt,
    ],
  );
  return { id: row.id };
}

const SUMMARY = `r.id, r.student_id, s.full_name, s.group_name, r.mock, r.data->>'title' AS title,
  r.listening_correct, r.listening_band::float AS listening_band, r.reading_correct, r.reading_band::float AS reading_band,
  r.writing_words, r.leaves, r.started_at, r.finished_at, r.updated_at`;

/** Summaries (no answers): every student's for the teacher, or one student's own. */
export async function listMockResults(studentId = null) {
  const rows = await query(
    `SELECT ${SUMMARY} FROM mock_results r JOIN students s ON s.id = r.student_id
     ${studentId ? 'WHERE r.student_id = $1' : ''} ORDER BY COALESCE(r.finished_at, r.updated_at) DESC LIMIT 500`,
    studentId ? [studentId] : [],
  );
  // The title as it is now (results keep the one they were saved with).
  return rows.map((r) => ({ ...r, title: mockById(r.mock)?.title ?? r.title }));
}

/** One full result (answers and writing), for the PDF. */
export async function getMockResult(id, studentId = null) {
  const [row] = await query(
    `SELECT ${SUMMARY}, r.data FROM mock_results r JOIN students s ON s.id = r.student_id
     WHERE r.id = $1 ${studentId ? 'AND r.student_id = $2' : ''}`,
    studentId ? [id, studentId] : [id],
  );
  if (!row) throw new ApiError('Result not found.', 404);
  const title = mockById(row.mock)?.title ?? row.title;
  return { ...row, title, data: { ...row.data, title } };
}

export async function deleteMockResult(id) {
  const rows = await query('DELETE FROM mock_results WHERE id = $1 RETURNING id', [id]);
  if (!rows.length) throw new ApiError('Result not found.', 404);
  return { ok: true };
}

// ---------- the results table: Listening and Reading from the mock, Writing and Speaking from the examiners ----------

const band = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 9 || Math.round(n * 2) !== n * 2) throw new ApiError('Bands are 0–9 in half steps.', 422);
  return n;
};
const parts = (v) => {
  const t = String(v ?? '').trim();
  if (!t) return '';
  if (!/^\d(\.5)?(\/\d(\.5)?){3}$/.test(t)) throw new ApiError('Speaking parts look like 6/7/7/7 (F/L/G/P).', 422);
  return t;
};

/**
 * One row per student who sat the mock (their most complete sitting), plus candidates who only
 * have examiner marks. Each row: the sitting's scores and the marks saved for it.
 */
export async function mockTable(mock) {
  if (!mockById(mock)) throw new ApiError('Unknown mock test.', 400);
  const results = await query(
    `SELECT DISTINCT ON (r.student_id) r.id, r.student_id, s.full_name, r.listening_correct, r.listening_band::float AS listening_band,
       r.reading_correct, r.reading_band::float AS reading_band, r.writing_words,
       to_char(COALESCE(r.finished_at, r.updated_at) AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS date
     FROM mock_results r JOIN students s ON s.id = r.student_id
     WHERE r.mock = $1
     ORDER BY r.student_id, (r.finished_at IS NOT NULL) DESC,
       ((r.listening_band IS NOT NULL)::int + (r.reading_band IS NOT NULL)::int) DESC, r.updated_at DESC`,
    [mock],
  );
  const marks = await query(
    `SELECT id, result_id, name, writing::float AS writing, speaking::float AS speaking, speaking_parts, hidden
     FROM mock_marks WHERE mock = $1 ORDER BY id`,
    [mock],
  );
  const byResult = new Map(marks.filter((m) => m.result_id).map((m) => [m.result_id, m]));
  const rows = results.map((r) => {
    const m = byResult.get(r.id);
    return { ...r, mark_id: m?.id ?? null, writing: m?.writing ?? null, speaking: m?.speaking ?? null, speaking_parts: m?.speaking_parts ?? '', hidden: m?.hidden ?? false };
  });
  for (const m of marks) {
    // Marks of a sitting that is no longer the student's chosen one stay out of the table.
    if (m.result_id) continue;
    rows.push({ id: null, student_id: null, full_name: m.name, listening_correct: null, listening_band: null, reading_correct: null, reading_band: null,
      writing_words: null, date: null, mark_id: m.id, writing: m.writing, speaking: m.speaking, speaking_parts: m.speaking_parts, hidden: m.hidden });
  }
  return rows;
}

/** Save examiner marks: [{ result_id } or { mark_id } or { name }, writing, speaking, speaking_parts, hidden]. */
export async function saveMarks(mock, list) {
  if (!mockById(mock)) throw new ApiError('Unknown mock test.', 400);
  if (!Array.isArray(list) || list.length > 300) throw new ApiError('Bad marks.', 400);
  for (const m of list) {
    const values = [band(m.writing), band(m.speaking), parts(m.speaking_parts), Boolean(m.hidden)];
    if (m.result_id) {
      const [ok] = await query('SELECT 1 FROM mock_results WHERE id = $1 AND mock = $2', [Number(m.result_id), mock]);
      if (!ok) throw new ApiError('Result not found.', 404);
      await query(
        `INSERT INTO mock_marks (mock, result_id, writing, speaking, speaking_parts, hidden) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (result_id) WHERE result_id IS NOT NULL DO UPDATE SET writing = EXCLUDED.writing, speaking = EXCLUDED.speaking,
           speaking_parts = EXCLUDED.speaking_parts, hidden = EXCLUDED.hidden, updated_at = now()`,
        [mock, Number(m.result_id), ...values],
      );
    } else if (m.mark_id) {
      await query(
        `UPDATE mock_marks SET writing = $3, speaking = $4, speaking_parts = $5, hidden = $6, name = COALESCE(NULLIF($7, ''), name), updated_at = now()
         WHERE id = $1 AND mock = $2 AND result_id IS NULL`,
        [Number(m.mark_id), mock, ...values, str(m.name, 120).trim()],
      );
    } else {
      const name = str(m.name, 120).trim();
      if (!name) throw new ApiError('A name is needed for a candidate without a mock sitting.', 422);
      await query(`INSERT INTO mock_marks (mock, name, writing, speaking, speaking_parts, hidden) VALUES ($1, $2, $3, $4, $5, $6)`, [mock, name, ...values]);
    }
  }
  return { rows: await mockTable(mock) };
}

/** Remove a speaking-only candidate (marks of a sitting are cleared with saveMarks instead). */
export async function deleteMark(id) {
  await query('DELETE FROM mock_marks WHERE id = $1 AND result_id IS NULL', [id]);
  return { ok: true };
}
