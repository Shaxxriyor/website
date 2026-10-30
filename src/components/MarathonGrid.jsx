import { MARATHON_DAYS, formatDate, marathonTitle } from '../lib/format.js';

/** 20 day cells; filled when done, tinted by score, with the best result on hover. */
export function MarathonGrid({ skill, label, tone, results, compact = false }) {
  const byDay = new Map(results.filter((r) => r.skill === skill).map((r) => [r.day, r]));
  const doneCount = byDay.size;
  return (
    <div className={`mgrid card-white tone-${tone} ${compact ? 'mgrid--compact' : ''}`}>
      <div className="mgrid__head">
        <span className="mgrid__label">{label}</span>
        <span className="mgrid__count num">
          {doneCount}
          <small>/{MARATHON_DAYS}</small>
        </span>
      </div>
      <ol className="mgrid__days">
        {Array.from({ length: MARATHON_DAYS }, (_, i) => i + 1).map((day) => {
          const r = byDay.get(day);
          const pct = r?.total ? r.correct / r.total : null;
          const title = marathonTitle(skill, day);
          const score = r?.correct != null ? `${r.correct}/${r.total}, band ${Number(r.band).toFixed(1)}` : 'done';
          const tip = r
            ? `Day ${day}${title ? ` · ${title}` : ''} — ${score} (${formatDate(r.lesson_date, { short: true })})`
            : `Day ${day}${title ? ` · ${title}` : ''} — not done yet`;
          return (
            <li
              key={day}
              className={`mgrid__day ${r ? 'is-done' : ''} ${pct != null && pct >= 0.8 ? 'is-strong' : ''}`}
              title={tip}
              aria-label={tip}
            >
              {day}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
