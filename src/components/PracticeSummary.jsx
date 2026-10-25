import { readingPractice } from '../data/readingPractice.js';
import { listeningPractice } from '../data/listeningPractice.js';
import { averageBand, formatBand } from '../lib/band.js';
import { formatDate } from '../lib/format.js';

// Reading passages are grouped by passage number; listening tests in blocks of 25.
const SKILLS = {
  reading: {
    title: 'Reading Practice',
    head: 'Passage',
    all: readingPractice,
    groups: [1, 2, 3].map((n) => ({ label: `Passage ${n}`, items: readingPractice.filter((p) => p.passage === n) })),
    name: (p) => (
      <>
        <span className="psum__p">P{p.passage}</span> {p.title}
      </>
    ),
  },
  listening: {
    title: 'Listening Practice',
    head: 'Test',
    all: listeningPractice,
    groups: [1, 2, 3, 4].map((n) => ({
      label: n < 4 ? `Tests ${(n - 1) * 25 + 1}–${n * 25}` : 'Tests 76+',
      items: listeningPractice.filter((t) => Math.min(4, Math.ceil(t.no / 25)) === n),
    })),
    name: (t) => t.title,
  },
};

/**
 * Reading or Listening Practice progress: tests done per group, the average band,
 * and (unless compact) every test the student has done with its result.
 */
export function PracticeSummary({ skill = 'reading', results = [], attempts = [], compact = false, title }) {
  const cfg = SKILLS[skill];
  const byId = new Map(cfg.all.map((p) => [p.id, p]));
  const mine = results.filter((r) => byId.has(r.item));
  const tries = new Map((attempts ?? []).filter((g) => g.item).map((g) => [g.item, g.tries]));
  const done = new Set(mine.map((r) => r.item));
  const avg = averageBand(mine.map((r) => r.band));
  const rows = cfg.groups.map((g) => ({ label: g.label, total: g.items.length, done: g.items.filter((p) => done.has(p.id)).length }));
  const list = [...mine].sort((a, b) => b.lesson_date.localeCompare(a.lesson_date));

  return (
    <div className={`psum card-white ${compact ? 'psum--compact' : ''}`}>
      <div className="mgrid__head">
        <span className="mgrid__label">{title ?? cfg.title}</span>
        <span className="mgrid__count num">
          {done.size}
          <small>/{cfg.all.length}</small>
        </span>
      </div>
      <ul className="psum__rows">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="psum__label">{r.label}</span>
            <span className="skill-bars__track">
              <span
                style={{
                  width: `${r.total ? (r.done / r.total) * 100 : 0}%`,
                  background: skill === 'reading' ? 'var(--chart-vocabulary)' : 'var(--chart-listening)',
                }}
              />
            </span>
            <span className="psum__value num">
              {r.done}/{r.total}
            </span>
          </li>
        ))}
      </ul>
      {avg != null && <p className="muted-sm psum__avg">Average band {formatBand(avg)}</p>}

      {!compact && list.length > 0 && (
        <table className="psum__table">
          <thead>
            <tr>
              <th>{cfg.head}</th>
              <th className="num">Correct (attempts)</th>
              <th className="num">Best band</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.item}>
                <td>{cfg.name(byId.get(r.item))}</td>
                <td className="num">
                  {tries.get(r.item)?.length > 1
                    ? `${tries.get(r.item).map((t) => t.correct).join(' → ')} / ${r.total}`
                    : r.correct != null
                      ? `${r.correct}/${r.total}`
                      : '—'}
                </td>
                <td className="num">
                  <strong>{formatBand(r.band)}</strong>
                </td>
                <td className="muted-sm">{formatDate(r.lesson_date, { short: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
