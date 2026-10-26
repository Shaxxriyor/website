import { neon } from '@neondatabase/serverless';

// Production: Neon Postgres via DATABASE_URL (set automatically when the Neon
// integration is connected in Vercel). Local dev and tests: the Vite plugin /
// test runner installs an in-process PGlite instance on globalThis.
let client;
let ready;

// Vercel's Neon integration names its variables after a custom prefix
// (DATABASE_URL, STORAGE_URL, …), so fall back to any Postgres URL it set.
function databaseUrl() {
  const env = process.env;
  const named = env.DATABASE_URL || env.POSTGRES_URL || env.STORAGE_URL;
  if (named) return named;
  const candidates = Object.keys(env)
    .filter((k) => /_URL$/.test(k) && /^postgres(ql)?:\/\//.test(env[k] || ''))
    .sort((a, b) => a.length - b.length); // prefer FOO_URL over FOO_URL_UNPOOLED-style names
  return candidates.length ? env[candidates[0]] : null;
}

function getClient() {
  if (client) return client;
  const url = databaseUrl();
  if (url) {
    const sql = neon(url);
    client = { query: (text, params) => sql.query(text, params) };
  } else if (globalThis.__RCDI_DEV_DB__) {
    const db = globalThis.__RCDI_DEV_DB__;
    client = { query: async (text, params) => (await db.query(text, params)).rows };
  } else {
    throw Object.assign(new Error('Database is not connected. Add a Neon Postgres database to the Vercel project.'), {
      status: 503,
      expose: true,
    });
  }
  return client;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    group_name TEXT NOT NULL DEFAULT '',
    level TEXT NOT NULL,
    registered_at DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    skill TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    band NUMERIC(2,1),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Practice records: a marathon day or an exercise (added after the first release).
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'exercise'`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS day INTEGER`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS correct INTEGER`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS total INTEGER`,
  // Automatic tracking from the marathon pages, and student sign-in codes.
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'teacher'`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS active_seconds INTEGER NOT NULL DEFAULT 0`,
  // Reading Practice passages are identified by `item` (their page id).
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS item TEXT`,
  `DROP INDEX IF EXISTS lessons_auto_day`,
  `CREATE UNIQUE INDEX IF NOT EXISTS lessons_auto_once ON lessons
     (student_id, kind, skill, (COALESCE(day, 0)), (COALESCE(item, '')), lesson_date) WHERE source = 'auto'`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS access_code TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ`,
  `UPDATE students SET access_code = upper(substr(md5(random()::text || id::text), 1, 8)) WHERE access_code IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS students_access_code ON students (access_code)`,
  // ELS Reading: photos of each student's notebook translation, per day.
  `CREATE TABLE IF NOT EXISTS els_photos (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 20),
    mime TEXT NOT NULL,
    data BYTEA NOT NULL,
    bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS els_photos_day ON els_photos (day, created_at)`,
  `CREATE INDEX IF NOT EXISTS els_photos_student ON els_photos (student_id, day)`,
  // Profile photo (small square JPEG); avatar_v changes on every update for cache-busting.
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar BYTEA`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_mime TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_v INTEGER`,
  `CREATE INDEX IF NOT EXISTS lessons_student_date ON lessons (student_id, lesson_date)`,
  `CREATE INDEX IF NOT EXISTS lessons_date ON lessons (lesson_date)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Self sign-up (email + password) for the free marathons. Reading Practice is opened
  // per student by the teacher; students added by the teacher before this keep it.
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS self_registered BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS practice_access BOOLEAN NOT NULL DEFAULT true`,
  `CREATE UNIQUE INDEX IF NOT EXISTS students_login_email ON students (lower(email)) WHERE password_hash IS NOT NULL`,
  // Vocabulary flashcards: which cards of each unit a student marked "I know it".
  `CREATE TABLE IF NOT EXISTS vocab_progress (
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    book TEXT NOT NULL,
    unit INTEGER NOT NULL,
    known INTEGER[] NOT NULL DEFAULT '{}',
    total INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, book, unit)
  )`,
  // Every scored try is kept: 1st attempt, 2nd attempt, … (a record keeps the day's best).
  `CREATE TABLE IF NOT EXISTS attempts (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS attempts_lesson ON attempts (lesson_id, created_at)`,
  // One attempt per page visit (sitting): the page sends a random id with its score.
  `ALTER TABLE attempts ADD COLUMN IF NOT EXISTS sitting TEXT`,
  // Scores recorded before attempts existed become each record's first attempt.
  `INSERT INTO attempts (lesson_id, correct, total, created_at)
   SELECT l.id, l.correct, l.total, l.lesson_date::timestamptz + interval '12 hours' FROM lessons l
   WHERE l.correct IS NOT NULL AND l.total IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.lesson_id = l.id)`,
];

// Two fresh instances can start at once (e.g. right after a deploy) and run the
// same schema statements together; Postgres may then reject one with a
// "concurrent update" / "already exists" error even though the end state is fine.
const RACE = /already exists|duplicate key|concurrently|deadlock/i;
const TRANSIENT = /fetch failed|ECONNRESET|socket|timeout|terminating connection|Connection terminated/i;

async function migrate(c) {
  for (const stmt of SCHEMA) {
    try {
      await c.query(stmt, []);
    } catch (err) {
      if (!RACE.test(String(err?.message))) throw err;
      // Let the other instance finish, then make sure this statement holds.
      await new Promise((r) => setTimeout(r, 300));
      try {
        await c.query(stmt, []);
      } catch (again) {
        if (!RACE.test(String(again?.message))) throw again;
      }
    }
  }
}

/** Run a parameterised query and return its rows. Creates the schema on first use. */
export async function query(text, params = []) {
  const c = getClient();
  if (!ready) {
    ready = migrate(c).catch((err) => {
      ready = undefined;
      throw err;
    });
  }
  await ready;
  try {
    return await c.query(text, params);
  } catch (err) {
    // One retry for a dropped connection (e.g. the database waking from sleep).
    if (!TRANSIENT.test(String(err?.message))) throw err;
    await new Promise((r) => setTimeout(r, 400));
    return c.query(text, params);
  }
}
