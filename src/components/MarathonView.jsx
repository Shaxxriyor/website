import { useMemo } from 'react';
import { ArrowRight, CheckIcon, DownloadIcon } from './Icons.jsx';

const tones = ['rose', 'peach', 'lilac', 'mint'];

// The practice pages save notes under `lm_day{N}_…` on this origin,
// so a saved key means the student has opened and worked on that day.
function startedDays() {
  const started = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = /^lm_day(\d+)_/.exec(localStorage.key(i));
      if (m) started.add(Number(m[1]));
    }
  } catch {
    /* storage unavailable — show every day as not started */
  }
  return started;
}

export function MarathonView({ marathon, icon: Icon }) {
  const started = useMemo(startedDays, []);
  const days = marathon.days;
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
        {days.length > 0 && (
          <div className="marathon__progress" aria-label={`${started.size} of ${days.length} days started`}>
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
            return (
              <li key={d.day} className={`day-card tone-${tones[i % tones.length]}`}>
                <a className="day-card__link" href={d.href} target="_blank" rel="noopener">
                  <span className="day-card__top">
                    <span className="day-card__label">Day</span>
                    {done && (
                      <span className="pill pill--glass day-card__status">
                        <CheckIcon size={12} /> Started
                      </span>
                    )}
                  </span>
                  <span className="day-card__num">{String(d.day).padStart(2, '0')}</span>
                  <span className="day-card__meta">
                    {d.title}
                    <br />
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
