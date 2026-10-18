import { readingPractice } from '../data/readingPractice.js';

/** Reading Practice progress: passages done out of the total, per passage number. */
export function PracticeSummary({ results = [], compact = false }) {
  const done = new Set(results.map((r) => r.item));
  const scored = results.filter((r) => r.total);
  const avg = scored.length ? Math.round((scored.reduce((t, r) => t + r.correct / r.total, 0) / scored.length) * 100) : null;
  const rows = [1, 2, 3].map((n) => {
    const all = readingPractice.filter((p) => p.passage === n);
    return { n, total: all.length, done: all.filter((p) => done.has(p.id)).length };
  });
  const totalDone = rows.reduce((t, r) => t + r.done, 0);

  return (
    <div className={`psum card-white ${compact ? 'psum--compact' : ''}`}>
      <div className="mgrid__head">
        <span className="mgrid__label">Reading Practice</span>
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
      {avg != null && <p className="muted-sm psum__avg">Average score {avg}%</p>}
    </div>
  );
}
