import { neon } from '@neondatabase/serverless';

// Production: Neon Postgres via DATABASE_URL (set automatically when the Neon
// integration is connected in Vercel). Local dev and tests: the Vite plugin /
// test runner installs an in-process PGlite instance on globalThis.
let client;
let ready;

function getClient() {
  if (client) return client;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
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
  `CREATE INDEX IF NOT EXISTS lessons_student_date ON lessons (student_id, lesson_date)`,
  `CREATE INDEX IF NOT EXISTS lessons_date ON lessons (lesson_date)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

/** Run a parameterised query and return its rows. Creates the schema on first use. */
export async function query(text, params = []) {
  const c = getClient();
  if (!ready) {
    ready = (async () => {
      for (const stmt of SCHEMA) await c.query(stmt, []);
    })().catch((err) => {
      ready = undefined;
      throw err;
    });
  }
  await ready;
  return c.query(text, params);
}
