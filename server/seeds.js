// One-time data changes, applied once after the schema is ready (each is claimed in
// data_seeds first, so two instances never both apply it). A failure is logged and
// the claim released, so the site keeps working and it is tried again later.
import { MARJONA, MARKS } from './seeds/mock-2026-11-08.js';
import { MARKS_FULL } from './seeds/mock-2026-11-08-full.js';
import { MARKS_MIN5 } from './seeds/mock-2026-11-08-min5.js';
import { ESSAYS, MARKS_FINAL } from './seeds/mock-2026-11-08-final.js';
import { SECTION_KEYS } from '../src/lib/access.js';
import { nameScore } from '../src/lib/mockTable.js';

// Students the teacher opened everything for on 25 November 2026 (as they wrote their names).
const FULL_ACCESS_2026_11_25 = [
  'Shuxratjon Mirzanabiyev',
  'Mirzakarimov Shaxzod',
  'Mukhammedalieva Marta',
  'Abdulloh Nosirov',
  'Zokirmatov Muhammadnodir',
  'Azatbaeva Nadira',
  'Siddikova Shakhrizoda',
  'Abdulaziz Khudoyberdiev',
  'Munisa Otajonova',
  'Nozigul Tohirova',
  'Iminjonova Kumushoy',
  'Shakhina Abdukayumova',
  'Abduraufova Umida',
  'Farxodova Dilnoza',
  'Tursunov Bexruz',
  'Olimjonova Shohsanam',
  'Alimjanov Saydullo',
  'Abdumalikov Murodjon',
  'Movarounbek Mubinov',
  'Ashurov Diyorbek',
  "Yo'ldosheva Odina",
  'Meliqulova Madina',
  'Jahongir Kholikov',
  'Mavlonova Maftuna',
  'Salavatov Azamat',
  'Shomuratov Mirzobek',
];

// More students the teacher opened everything for on 25 November 2026 (one name in both alphabets).
const FULL_ACCESS_2026_11_25_B = [
  'Daulanova Khulkar',
  'Yermekbay Nurislam',
  'Mahliyo Ramidinova',
  'Qodirova Sevara',
  'Авазов Иброхим',
  'Avazov Ibrohim',
  'Sultanov Sohib',
  'Hojiyeva Ezoza',
];

// Open every section for the students with these names: every word of the name must match
// (any order or case; x/h, apostrophes and one-letter slips allowed). What was found is logged.
async function openEverythingFor(c, seed, names, { until = null } = {}) {
  // Later runs (for names not found the first time) only touch accounts still waiting for approval.
  const [{ n: runs }] = await c.query(`SELECT COUNT(*)::int AS n FROM seed_log WHERE seed = $1`, [seed]);
  const students = await c.query(
    runs ? `SELECT id, full_name FROM students WHERE COALESCE(cardinality(access), 0) = 0` : `SELECT id, full_name FROM students`,
  );
  const found = [];
  const missing = [];
  for (const name of names) {
    // Words of 3+ letters in any alphabet (Latin or Cyrillic); a name with none matches nobody.
    const words = name.split(/\s+/).filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 3).length;
    const hits = words ? students.filter((s) => nameScore(name, s.full_name) >= words) : [];
    if (!hits.length) {
      missing.push(name);
      continue;
    }
    for (const s of hits) {
      await c.query(`UPDATE students SET access = $2, practice_access = true, updated_at = now() WHERE id = $1`, [s.id, SECTION_KEYS]);
      found.push(`${name} -> ${s.full_name} (#${s.id})`);
    }
  }
  await c.query(`INSERT INTO seed_log (seed, note) VALUES ($1, $2)`, [
    seed,
    `Opened everything for ${found.length}: ${found.join('; ') || '-'} | Not found (${missing.length}): ${missing.join('; ') || '-'}`,
  ]);
  // Someone not registered yet: look again on the next start, until the deadline.
  if (until && Date.now() < Date.parse(until)) {
    if (missing.length) throw Object.assign(new Error(`${missing.length} not registered yet`), { retry: true });
  }
}

const words = (t) => (String(t || '').match(/[A-Za-z0-9À-ɏ][A-Za-z0-9À-ɏ'’-]*/g) || []).length;

// Replace marks a previous seed set with new ones, only where they are still unchanged
// (or empty), so whatever the teacher typed in between stays.
async function replaceMarks(c, previous, marks) {
  const mock = MARJONA.mock;
  const before = new Map(previous.map((m) => [m.name, m]));
  for (const m of marks) {
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
}

// Marjona Rasulova's result from her PDF, into her latest sitting (or a new one).
async function putMarjona(c, sid) {
  const mock = MARJONA.mock;
  const L = MARJONA.res.listening;
  const R = MARJONA.res.reading;
  const values = [JSON.stringify(MARJONA), L.correct, Number(L.band), R.correct, Number(R.band), [words(MARJONA.w.t1), words(MARJONA.w.t2)], MARJONA.finishedAt];
  const [latest] = await c.query(`SELECT id FROM mock_results WHERE student_id = $1 AND mock = $2 ORDER BY updated_at DESC LIMIT 1`, [sid, mock]);
  if (latest) {
    await c.query(
      `UPDATE mock_results SET data = $2, listening_correct = $3, listening_band = $4, reading_correct = $5, reading_band = $6,
         writing_words = $7, finished_at = to_timestamp($8::bigint / 1000.0), updated_at = now() WHERE id = $1`,
      [latest.id, ...values],
    );
    return latest.id;
  }
  const [row] = await c.query(
    `INSERT INTO mock_results (student_id, mock, sitting, data, listening_correct, listening_band, reading_correct, reading_band,
       writing_words, leaves, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, to_timestamp($10::bigint / 1000.0)) RETURNING id`,
    [sid, mock, MARJONA.sitting, ...values],
  );
  return row.id;
}

// Students whose name contains every given word (any order or case; spaces and apostrophes ignored).
async function studentsNamed(c, ...parts) {
  const where = parts.map((_, i) => `regexp_replace(lower(full_name), '[^a-z]', '', 'g') LIKE $${i + 1}`).join(' AND ');
  return (await c.query(`SELECT id FROM students WHERE ${where}`, parts.map((w) => `%${w}%`))).map((r) => r.id);
}

const SEEDS = [
  {
    // Full Mock Test of 8 November 2026: Marjona Rasulova's result from her PDF, then the
    // examiners' Writing bands and feedback. Marks the teacher already typed are kept.
    id: 'mock-2026-11-08-writing',
    async apply(c) {
      const mock = MARJONA.mock;
      const studentIds = async (name) =>
        (await c.query(`SELECT id FROM students WHERE lower(btrim(full_name)) = lower(btrim($1))`, [name])).map((r) => r.id);

      for (const sid of await studentIds(MARJONA.name)) await putMarjona(c, sid);

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
    apply: (c) => replaceMarks(c, MARKS, MARKS_FULL),
  },
  {
    // The speaking examiner's "Akbarxo'ja 7.5 (8/8/7/7)" is Akbar Raxmatullayev. Set it unless
    // his Speaking is already in, and drop the speaking-only row the name made on its own.
    id: 'mock-2026-11-08-akbar-speaking',
    async apply(c) {
      const mock = MARJONA.mock;
      const results = await c.query(
        `SELECT r.id FROM mock_results r JOIN students s ON s.id = r.student_id
         WHERE r.mock = $1 AND lower(btrim(s.full_name)) = 'akbar raxmatullayev'`,
        [mock],
      );
      for (const { id } of results) {
        await c.query(
          `INSERT INTO mock_marks (mock, result_id, speaking, speaking_parts) VALUES ($1, $2, 7.5, '8/8/7/7')
           ON CONFLICT (result_id) WHERE result_id IS NOT NULL DO UPDATE SET
             speaking = COALESCE(mock_marks.speaking, 7.5),
             speaking_parts = CASE WHEN mock_marks.speaking IS NULL THEN '8/8/7/7' ELSE mock_marks.speaking_parts END,
             updated_at = now()`,
          [mock, id],
        );
      }
      if (results.length) {
        await c.query(`DELETE FROM mock_marks WHERE mock = $1 AND result_id IS NULL AND lower(replace(replace(name, '''', ''), 'ʻ', '')) LIKE 'akbarxoja%'`, [mock]);
      }
    },
  },
  {
    // The teacher's rule: no Writing or Task band below 5.0.
    id: 'mock-2026-11-08-writing-min5',
    apply: (c) => replaceMarks(c, MARKS_FULL, MARKS_MIN5),
  },
  {
    // Final Writing marks, and the full essays the site did not save, as the teacher sent them
    // (so the students' PDFs and All writing show the whole text).
    id: 'mock-2026-11-08-writing-final',
    async apply(c) {
      const mock = MARJONA.mock;
      for (const e of ESSAYS) {
        const rows = await c.query(
          `SELECT r.id, r.data FROM mock_results r JOIN students s ON s.id = r.student_id
           WHERE r.mock = $1 AND lower(btrim(s.full_name)) = lower(btrim($2))`,
          [mock, e.name],
        );
        for (const r of rows) {
          const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          const w = { t1: '', t2: '', ...(data.w || {}) };
          // Only ever longer: never replace a fuller text with this one.
          if (e.t1 && words(e.t1) > words(w.t1)) w.t1 = e.t1;
          if (e.t2 && words(e.t2) > words(w.t2)) w.t2 = e.t2;
          await c.query(`UPDATE mock_results SET data = $2, writing_words = $3, updated_at = now() WHERE id = $1`, [
            r.id,
            JSON.stringify({ ...data, w }),
            [words(w.t1), words(w.t2)],
          ]);
        }
      }
      await replaceMarks(c, MARKS_MIN5, MARKS_FINAL);
    },
  },
  {
    // Marjona's result did not show: her name on the site may be written differently. Find her by
    // the words of her name in any order, put her result in, and give that sitting her marks.
    id: 'mock-2026-11-08-marjona-v2',
    async apply(c) {
      let found = await studentsNamed(c, 'marjona', 'rasul');
      if (!found.length) found = await studentsNamed(c, 'marjona');
      if (found.length !== 1) throw new Error(`Marjona Rasulova: ${found.length} matching students`);
      const rid = await putMarjona(c, found[0]);
      const m = MARKS_FINAL.find((x) => x.name === 'Marjona Rasulova');
      await c.query(
        `INSERT INTO mock_marks (mock, result_id, writing, task1, task2, feedback) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (result_id) WHERE result_id IS NOT NULL DO UPDATE SET
           writing = COALESCE(mock_marks.writing, EXCLUDED.writing), task1 = COALESCE(mock_marks.task1, EXCLUDED.task1),
           task2 = COALESCE(mock_marks.task2, EXCLUDED.task2),
           feedback = CASE WHEN mock_marks.feedback = '' THEN EXCLUDED.feedback ELSE mock_marks.feedback END, updated_at = now()`,
        [MARJONA.mock, rid, m.writing, m.task1, m.task2, m.feedback],
      );
    },
  },
  {
    // The teacher approved everyone waiting: every student with no section opened gets them all.
    id: 'approve-all-waiting-2026-11-09',
    async apply(c) {
      await c.query(
        `UPDATE students SET access = $1, practice_access = true, updated_at = now() WHERE COALESCE(cardinality(access), 0) = 0`,
        [SECTION_KEYS],
      );
    },
  },
  {
    // The teacher accepted every request waiting on 15 November 2026 (new sign-ups still wait).
    id: 'approve-all-waiting-2026-11-15',
    async apply(c) {
      await c.query(
        `UPDATE students SET access = $1, practice_access = true, updated_at = now() WHERE COALESCE(cardinality(access), 0) = 0`,
        [SECTION_KEYS],
      );
    },
  },
  {
    // December Prediction is a new section: students who had every section open get it too.
    id: 'prediction-for-full-access-2026-11-23',
    async apply(c) {
      await c.query(
        `UPDATE students SET access = array_append(access, 'prediction'), updated_at = now()
         WHERE NOT ('prediction' = ANY(COALESCE(access, '{}')))
           AND access @> ARRAY['reading-marathon','listening-marathon','reading-practice','listening-practice','vocabulary','mock']::text[]`,
      );
    },
  },
  {
    id: 'full-access-2026-11-25',
    apply: (c) => openEverythingFor(c, 'full-access-2026-11-25', FULL_ACCESS_2026_11_25, { until: '2026-12-02T00:00:00+05:00' }),
  },
  {
    id: 'full-access-2026-11-25-b',
    apply: (c) => openEverythingFor(c, 'full-access-2026-11-25-b', FULL_ACCESS_2026_11_25_B, { until: '2026-12-02T00:00:00+05:00' }),
  },
];

/** The last failure of each one-time change in this instance (shown on the teacher's check page). */
export const lastErrors = {};

export async function runSeeds(c) {
  for (const seed of SEEDS) {
    const claimed = await c.query(`INSERT INTO data_seeds (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`, [seed.id]);
    if (!claimed.length) continue;
    try {
      await seed.apply(c);
    } catch (err) {
      if (!err?.retry) console.error('[seed]', seed.id, err);
      await c.query(`DELETE FROM data_seeds WHERE id = $1`, [seed.id]).catch(() => {});
      lastErrors[seed.id] = String(err?.message || err).slice(0, 300);
    }
  }
}
