import { readingPractice } from '../data/readingPractice.js';
import { averageBand, formatBand } from '../lib/band.js';
import { formatDate } from '../lib/format.js';

const byId = new Map(readingPractice.map((p) => [p.id, p]));

/**
 * Reading Practice progress: passages done per passage number, the average band,
 * and (unless compact) every passage the student has done with its result.
 */
export function PracticeSummary({ results = [], attempts = [], compact = false, title = 'Reading Practice' }) {
  const tries = new Map((attempts ?? []).filter((g) => g.item).map((g) => [g.item, g.tries]));
  const done = new Set(results.map((r) => r.item));
  const avg = averageBand(results.map((r) => r.band));
  const rows = [1, 2, 3].map((n) => {
    const all = readingPractice.filter((p) => p.passage === n);
    return { n, total: all.length, done: all.filter((p) => done.has(p.id)).length };
  });
  const totalDone = rows.reduce((t, r) => t + r.done, 0);
  const list = results
    .filter((r) => byId.has(r.item))
    .sort((a, b) => b.lesson_date.localeCompare(a.lesson_date));

  return (
    <div className={`psum card-white ${compact ? 'psum--compact' : ''}`}>
      <div className="mgrid__head">
        <span className="mgrid__label">{title}</span>
        <span className="mgrid__count num">
          {totalDone}
          <small>/{readingPractice.length}</small>
        </span>
      </div>
      <ul className="psum__rows">
        {rows.map((r) => (
          <li key={r.n}>
            <span className="psum__label">Passage {r.n}</span>
            <span className="skill-bars__track">
              <span style={{ width: `${(r.done / r.total) * 100}%`, background: 'var(--chart-vocabulary)' }} />
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
              <th>Passage</th>
              <th className="num">Correct (attempts)</th>
              <th className="num">Best band</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const p = byId.get(r.item);
              return (
                <tr key={r.item}>
                  <td>
                    <span className="psum__p">P{p.passage}</span> {p.title}
                  </td>
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
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
