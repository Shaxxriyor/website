// One-time data changes, applied once after the schema is ready (each is claimed in
// data_seeds first, so two instances never both apply it). A failure is logged and
// the claim released, so the site keeps working and it is tried again later.
import { MARJONA, MARKS } from './seeds/mock-2026-11-08.js';
import { MARKS_FULL } from './seeds/mock-2026-11-08-full.js';

const words = (t) => (String(t || '').match(/[A-Za-z0-9À-ɏ][A-Za-z0-9À-ɏ'’-]*/g) || []).length;

const SEEDS = [
  {
    // Full Mock Test of 8 November 2026: Marjona Rasulova's result from her PDF, then the
    // examiners' Writing bands and feedback. Marks the teacher already typed are kept.
    id: 'mock-2026-11-08-writing',
    async apply(c) {
      const mock = MARJONA.mock;
      const studentIds = async (name) =>
        (await c.query(`SELECT id FROM students WHERE lower(btrim(full_name)) = lower(btrim($1))`, [name])).map((r) => r.id);

      for (const sid of await studentIds(MARJONA.name)) {
        const L = MARJONA.res.listening;
        const R = MARJONA.res.reading;
        const values = [JSON.stringify(MARJONA), L.correct, Number(L.band), R.correct, Number(R.band), [words(MARJONA.w.t1), words(MARJONA.w.t2)], MARJONA.finishedAt];
        const [latest] = await c.query(`SELECT id FROM mock_results WHERE student_id = $1 AND mock = $2 ORDER BY updated_at DESC LIMIT 1`, [sid, mock]);
        if (latest) {
          await c.query(
            `UPDATE mock_results SET data = $2, listening_correct = $3, listening_band = $4, reading_correct = $5, reading_band = $6,
               writing_words = $7, finished_at = to_timestamp($8 / 1000.0), updated_at = now() WHERE id = $1`,
            [latest.id, ...values],
          );
        } else {
          await c.query(
            `INSERT INTO mock_results (student_id, mock, sitting, data, listening_correct, listening_band, reading_correct, reading_band,
               writing_words, leaves, finished_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, to_timestamp($10 / 1000.0))`,
            [sid, mock, MARJONA.sitting, ...values],
          );
        }
      }

      for (const m of MARKS) {
        for (const sid of await studentIds(m.name)) {
          const results = await c.query(`SELECT id FROM mock_results WHERE student_id = $1 AND mock = $2`, [sid, mock]);
          for (const { id } of results) {
            await c.query(
              `INSERT INTO mock_marks (mock, result_id, writing, task1, task2, feedback) VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (result_id) WHERE result_id IS NOT NULL DO UPDATE SET
                 writing = COALESCE(mock_marks.writing, EXCLUDED.writing),
                 task1 = COALESCE(mock_marks.task1, EXCLUDED.task1),
                 task2 = COALESCE(mock_marks.task2, EXCLUDED.task2),
                 feedback = CASE WHEN mock_marks.feedback = '' THEN EXCLUDED.feedback ELSE mock_marks.feedback END,
                 updated_at = now()`,
              [mock, id, m.writing, m.task1, m.task2, m.feedback],
            );
          }
        }
      }
    },
  },
  {
    // The teacher chose full IELTS marking for everyone: every student gets a Writing band.
    // A mark is replaced only while it is still the one the first seed set (or empty), so
    // anything the teacher typed in the meantime stays.
    id: 'mock-2026-11-08-writing-full',
    async apply(c) {
      const mock = MARJONA.mock;
      const before = new Map(MARKS.map((m) => [m.name, m]));
      for (const m of MARKS_FULL) {
        const old = before.get(m.name) || {};
        const results = await c.query(
          `SELECT r.id FROM mock_results r JOIN students s ON s.id = r.student_id
           WHERE r.mock = $1 AND lower(btrim(s.full_name)) = lower(btrim($2))`,
          [mock, m.name],
        );
        for (const { id } of results) {
          await c.query(
            `INSERT INTO mock_marks (mock, result_id, writing, task1, task2, feedback) VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (result_id) WHERE result_id IS NOT NULL DO UPDATE SET
               writing = CASE WHEN mock_marks.writing IS NULL OR mock_marks.writing IS NOT DISTINCT FROM $7::numeric THEN EXCLUDED.writing ELSE mock_marks.writing END,
               task1 = CASE WHEN mock_marks.task1 IS NULL OR mock_marks.task1 IS NOT DISTINCT FROM $8::numeric THEN EXCLUDED.task1 ELSE mock_marks.task1 END,
               task2 = CASE WHEN mock_marks.task2 IS NULL OR mock_marks.task2 IS NOT DISTINCT FROM $9::numeric THEN EXCLUDED.task2 ELSE mock_marks.task2 END,
               feedback = CASE WHEN mock_marks.feedback = '' OR mock_marks.feedback = $10 THEN EXCLUDED.feedback ELSE mock_marks.feedback END,
               updated_at = now()`,
            [mock, id, m.writing, m.task1, m.task2, m.feedback, old.writing ?? null, old.task1 ?? null, old.task2 ?? null, old.feedback ?? ''],
          );
        }
      }
    },
  },
];

export async function runSeeds(c) {
  for (const seed of SEEDS) {
    const claimed = await c.query(`INSERT INTO data_seeds (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`, [seed.id]);
    if (!claimed.length) continue;
    try {
      await seed.apply(c);
    } catch (err) {
      console.error('[seed]', seed.id, err);
      await c.query(`DELETE FROM data_seeds WHERE id = $1`, [seed.id]).catch(() => {});
    }
  }
}
