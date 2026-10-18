import { useMemo, useState } from 'react';
import { readingPractice } from '../data/readingPractice.js';
import { BookIcon, CheckIcon, SearchIcon } from './Icons.jsx';

const href = (id) => `${import.meta.env.BASE_URL}practice/reading/${id}.html`;
const tones = { 1: 'mint', 2: 'peach', 3: 'lilac' };
const FILTERS = [
  { id: 0, label: 'All' },
  { id: 1, label: 'Passage 1' },
  { id: 2, label: 'Passage 2' },
  { id: 3, label: 'Passage 3' },
];

/** Reading Practice: every single-passage test, with the signed-in student's best score. */
export function PracticeLibrary({ results = [], signedIn = false }) {
  const [passage, setPassage] = useState(0);
  const [q, setQ] = useState('');
  const best = useMemo(() => new Map(results.map((r) => [r.item, r])), [results]);
  const done = readingPractice.filter((p) => best.has(p.id)).length;
  const pct = Math.round((done / readingPractice.length) * 100);

  const needle = q.trim().toLowerCase();
  const visible = readingPractice.filter(
    (p) => (!passage || p.passage === passage) && (!needle || p.title.toLowerCase().includes(needle)),
  );
  const count = (n) => readingPractice.filter((p) => p.passage === n).length;

  return (
    <section className="marathon" aria-labelledby="practice-lib-title">
      <header className="marathon__head card-white">
        <span className="marathon__icon">
          <BookIcon size={22} />
        </span>
        <div className="marathon__intro">
          <h2 id="practice-lib-title" className="marathon__title">
            Reading Practice
          </h2>
          <p className="muted-sm">
            {readingPractice.length} real passages in CDI format · Passage 1 ({count(1)}), Passage 2 ({count(2)}), Passage 3 (
            {count(3)})
          </p>
        </div>
        {signedIn && (
          <div className="marathon__progress" aria-label={`${done} of ${readingPractice.length} passages done`}>
            <span className="marathon__count">
              {done}
              <small>/{readingPractice.length} done</small>
            </span>
            <span className="meter">
              <span style={{ width: `${pct}%` }} />
            </span>
          </div>
        )}
      </header>

      <div className="toolbar">
        <label className="search">
          <SearchIcon size={16} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search passages, e.g. coral, history, sleep"
            aria-label="Search passages"
          />
        </label>
        <div className="seg-tabs" role="tablist" aria-label="Passage">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={passage === f.id}
              className={`chip ${passage === f.id ? 'is-active' : ''}`}
              onClick={() => setPassage(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty card-white">
          <span className="empty__icon">
            <SearchIcon size={20} />
          </span>
          <h3 className="empty__title">No passages match “{q}”</h3>
        </div>
      ) : (
        <ul className="plib">
          {visible.map((p) => {
            const r = best.get(p.id);
            return (
              <li key={p.id}>
                <a className={`plib__item tone-${tones[p.passage]} ${r ? 'is-done' : ''}`} href={href(p.id)} target="_blank" rel="noopener">
                  <span className="plib__no">P{p.passage}</span>
                  <span className="plib__text">
                    <strong>{p.title}</strong>
                    <span className="muted-sm">
                      Passage {p.passage}
                      {p.questions ? ` · ${p.questions} questions` : ''}
                    </span>
                  </span>
                  {r ? (
                    <span className="pill pill--glass plib__score">
                      <CheckIcon size={12} /> {r.correct != null ? `${r.correct}/${r.total}` : 'Done'}
                    </span>
                  ) : (
                    <span className="plib__go" aria-hidden="true">
                      →
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {!signedIn && (
        <p className="muted-sm plib__hint">Sign in with your code (right panel) to save your scores on each passage.</p>
      )}
    </section>
  );
}
