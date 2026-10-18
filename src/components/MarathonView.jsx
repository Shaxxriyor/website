import { useMemo } from 'react';
import { ArrowRight, CheckIcon, DownloadIcon } from './Icons.jsx';

const tones = ['rose', 'peach', 'lilac', 'mint'];

// Days whose practice page saves notes under `storagePrefix` on this origin
// count as started once a key with that prefix exists.
function startedDays(days) {
  const started = new Set();
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const d of days) {
      if (d.storagePrefix && keys.some((k) => k.startsWith(d.storagePrefix))) started.add(d.day);
    }
  } catch {
    /* storage unavailable — show every day as not started */
  }
  return started;
}

export function MarathonView({ marathon, icon: Icon, skill, results = [] }) {
  const days = marathon.days;
  const local = useMemo(() => startedDays(days), [days]);
  // Signed-in students: saved results from the server (best attempt per day).
  const saved = useMemo(() => new Map(results.filter((r) => r.skill === skill).map((r) => [r.day, r])), [results, skill]);
  const started = useMemo(() => new Set([...local, ...saved.keys()]), [local, saved]);
  const tracked = saved.size > 0 || days.some((d) => d.storagePrefix);
  const pct = days.length ? Math.round((started.size / days.length) * 100) : 0;

  return (
    <section className="marathon" aria-labelledby="marathon-title">
      <header className="marathon__head card-white">
        <span className="marathon__icon">
          <Icon size={22} />
        </span>
        <div className="marathon__intro">
          <h2 id="marathon-title" className="marathon__title">
            {marathon.title}
          </h2>
          <p className="muted-sm">{marathon.subtitle}</p>
        </div>
        {tracked && (
          <div className="marathon__progress" aria-label={`${started.size} of ${days.length} days done`}>
            <span className="marathon__count">
              {started.size}
              <small>/{days.length} days</small>
            </span>
            <span className="meter">
              <span style={{ width: `${pct}%` }} />
            </span>
          </div>
        )}
      </header>

      {days.length === 0 ? (
        <div className="marathon__empty card-white">
          <span className="marathon__icon">
            <Icon size={22} />
          </span>
          <p>
            <strong>Coming soon.</strong> New days will appear here as they are published.
          </p>
        </div>
      ) : (
        <ol className="day-grid">
          {days.map((d, i) => {
            const done = started.has(d.day);
            const result = saved.get(d.day);
            return (
              <li key={d.day} className={`day-card tone-${tones[i % tones.length]}`}>
                <a className="day-card__link" href={d.href} target="_blank" rel="noopener">
                  <span className="day-card__top">
                    <span className="day-card__label">Day</span>
                    {done && (
                      <span className="pill pill--glass day-card__status">
                        <CheckIcon size={12} /> {result?.correct != null ? `${result.correct}/${result.total}` : result ? 'Done' : 'Started'}
                      </span>
                    )}
                  </span>
                  <span className="day-card__num">{String(d.day).padStart(2, '0')}</span>
                  <span className="day-card__meta">
                    <span className="day-card__name">{d.title}</span>
                    {d.questions} questions
                  </span>
                  <span className="day-card__go" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                </a>
                {d.pdf && (
                  <a
                    className="day-card__pdf"
                    href={d.pdf}
                    download
                    aria-label={`Download Day ${d.day} PDF`}
                    title="Download PDF"
                  >
                    <DownloadIcon size={16} />
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
