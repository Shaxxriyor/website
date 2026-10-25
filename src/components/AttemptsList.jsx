import { formatDate } from '../lib/format.js';
import { formatBand } from '../lib/band.js';
import { readingPractice } from '../data/readingPractice.js';
import { listeningPractice } from '../data/listeningPractice.js';
import { readingMarathon } from '../data/mock.js';

const practiceTitle = new Map([
  ...readingPractice.map((p) => [p.id, `Passage ${p.passage} · ${p.title}`]),
  ...listeningPractice.map((t) => [t.id, `Listening Practice · Test ${t.no}`]),
]);
const readingDay = new Map(readingMarathon.days.map((d) => [d.day, d.title]));
const ORD = ['1st', '2nd', '3rd'];
const ordinal = (n) => ORD[n - 1] ?? `${n}th`;

export function attemptTitle(g) {
  if (g.kind === 'marathon') {
    const name = g.skill === 'reading' ? readingDay.get(g.day) : 'Sections 2 & 3';
    return `${g.skill === 'reading' ? 'Reading' : 'Listening'} Marathon · Day ${g.day}${name ? ` · ${name}` : ''}`;
  }
  return (g.item && practiceTitle.get(g.item)) || g.topic || 'Practice';
}

/** One line per day/passage: 1st 10/13 → 2nd 13/13, with bands and the change. */
export function AttemptsList({ groups = [], limit = null, compact = false, title = 'Attempts' }) {
  const shown = limit ? groups.slice(0, limit) : groups;
  return (
    <div className={`attempts card-white ${compact ? 'attempts--compact' : ''}`}>
      <div className="mgrid__head">
        <span className="mgrid__label">{title}</span>
        <span className="muted-sm">every try is kept</span>
      </div>
      {shown.length === 0 ? (
        <p className="muted-sm">No scored attempts yet.</p>
      ) : (
        <ul className="attempts__list">
          {shown.map((g) => {
            const first = g.tries[0];
            const last = g.tries.at(-1);
            const diff = g.tries.length > 1 ? last.correct - first.correct : 0;
            return (
              <li key={g.key}>
                <span className="attempts__title">{attemptTitle(g)}</span>
                <span className="attempts__tries">
                  {g.tries.map((t, i) => (
                    <span key={i} className="attempts__try" title={`${formatDate(t.at.slice(0, 10))} · band ${formatBand(t.band)}`}>
                      {i > 0 && <span className="attempts__arrow">→</span>}
                      <small>{ordinal(i + 1)}</small>
                      <b className="num">
                        {t.correct}/{t.total}
                      </b>
                      {!compact && <em>{formatBand(t.band)}</em>}
                    </span>
                  ))}
                  {diff !== 0 && (
                    <span className={`attempts__diff ${diff > 0 ? 'is-up' : 'is-down'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
