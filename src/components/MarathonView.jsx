import { useMemo, useState } from 'react';
import { ReadingDaySheet } from './ReadingDaySheet.jsx';
import { ArrowRight, CheckIcon, LockIcon } from './Icons.jsx';
import { askToSignIn, isFreeDay } from '../lib/access.js';

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

export function MarathonView({ marathon, icon: Icon, skill, results = [], attempts = [], signedIn = false, me = null, admin = null, onChanged }) {
  const [openDay, setOpenDay] = useState(null);
  const elsDone = useMemo(() => new Set((me?.els ?? []).map((e) => e.day)), [me]);
  const twoPart = skill === 'reading';
  const tries = useMemo(() => new Map((attempts ?? []).filter((g) => g.kind === 'marathon' && g.skill === skill).map((g) => [g.day, g.tries])), [attempts, skill]);
  const days = marathon.days;
  const local = useMemo(() => startedDays(days), [days]);
  // Signed-in students: saved results from the server (best attempt per day).
  const saved = useMemo(() => new Map(results.filter((r) => r.skill === skill).map((r) => [r.day, r])), [results, skill]);
  const started = useMemo(() => new Set([...local, ...saved.keys()]), [local, saved]);
  // Reading Marathon: a day is complete only with the test scored AND its ELS translation uploaded.
  const completeCount = twoPart ? [...saved.values()].filter((r) => r.complete).length : started.size;
  const tracked = saved.size > 0 || days.some((d) => d.storagePrefix);
  const pct = days.length ? Math.round((completeCount / days.length) * 100) : 0;

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
              {completeCount}
              <small>/{days.length} {twoPart ? 'complete' : 'days'}</small>
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
            const locked = !signedIn && !isFreeDay(d.day);
            const Link = locked || twoPart ? 'button' : 'a';
            const tested = result?.correct != null;
            const els = elsDone.has(d.day);
            const complete = twoPart ? tested && els : done;
            return (
              <li key={d.day} className={`day-card tone-${tones[i % tones.length]} ${locked ? 'is-locked' : ''}`}>
                <Link
                  className="day-card__link"
                  {...(locked
                    ? { type: 'button', onClick: () => askToSignIn(`${marathon.title} · Day ${d.day}`) }
                    : twoPart
                      ? { type: 'button', onClick: () => setOpenDay(d) }
                      : { href: d.href })}
                >
                  <span className="day-card__top">
                    <span className="day-card__label">Day</span>
                    {locked ? (
                      <span className="pill pill--glass day-card__status">
                        <LockIcon size={12} /> Students
                      </span>
                    ) : !signedIn && isFreeDay(d.day) ? (
                      <span className="pill pill--glass day-card__status">Free</span>
                    ) : null}
                    {complete ? (
                      <span className="pill pill--glass day-card__status">
                        <CheckIcon size={12} /> {result?.correct != null ? `${result.correct}/${result.total} · ${Number(result.band).toFixed(1)}` : result ? 'Done' : 'Started'}
                      </span>
                    ) : twoPart && (tested || els) ? (
                      <span className="pill pill--glass day-card__status day-card__status--half">
                        {tested ? 'Test ✓' : 'Test ○'} · {els ? 'ELS ✓' : 'ELS ○'}
                      </span>
                    ) : !twoPart && done ? (
                      <span className="pill pill--glass day-card__status">
                        <CheckIcon size={12} /> {result ? 'Done' : 'Started'}
                      </span>
                    ) : null}
                  </span>
                  <span className="day-card__num">{String(d.day).padStart(2, '0')}</span>
                  <span className="day-card__meta">
                    <span className="day-card__name">{d.title}</span>
                    {tries.get(d.day)?.length > 1
                      ? tries.get(d.day).map((t) => t.correct).join(' → ') + ` / ${d.questions}`
                      : twoPart
                        ? 'Test + ELS exercise'
                        : `${d.questions} questions`}
                  </span>
                  <span className="day-card__go" aria-hidden="true">
                    {locked ? <LockIcon size={15} /> : <ArrowRight size={16} />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {openDay && (
        <ReadingDaySheet
          day={openDay}
          result={saved.get(openDay.day)}
          elsDone={elsDone.has(openDay.day)}
          me={me}
          admin={admin}
          onClose={() => setOpenDay(null)}
          onChanged={onChanged}
        />
      )}
    </section>
  );
}
