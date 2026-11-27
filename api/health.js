import { json } from '../server/http.js';
import { query } from '../server/db.js';

// Is the database reachable? Shows only the database's own error message (no addresses or
// passwords), so the teacher can see why the site fails, e.g. a used-up monthly quota.
export const GET = async () => {
  const started = Date.now();
  try {
    await query('SELECT 1');
    return json({ ok: true, database: 'connected', ms: Date.now() - started });
  } catch (err) {
    const message = String(err?.message || err)
      .replace(/postgres(ql)?:\/\/\S+/gi, '[database address]')
      .replace(/\b[\w.-]+\.neon\.tech\b/gi, '[database host]')
      .slice(0, 300);
    return json({ ok: false, database: 'failing', error: message, ms: Date.now() - started }, 503);
  }
};
