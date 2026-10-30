import { useMemo, useState } from 'react';
import { readingPractice } from '../data/readingPractice.js';
import { listeningPractice } from '../data/listeningPractice.js';
import { BookIcon, ListeningIcon, LockIcon, SearchIcon, Tick } from './Icons.jsx';
import { askToSignIn, isFreePractice } from '../lib/access.js';
import { PracticeSummary } from './PracticeSummary.jsx';

const tones = { 1: 'mint', 2: 'peach', 3: 'lilac', 4: 'rose' };
const count = (list, n) => list.filter((p) => p.group === n).length;

// Reading: single passages grouped by passage number. Listening: full tests in blocks of 25.
const LIBRARIES = {
  reading: {
    title: 'Reading Practice',
    icon: BookIcon,
    unit: 'passages',
    items: readingPractice.map((p) => ({ ...p, group: p.passage, badge: `P${p.passage}`, meta: `Passage ${p.passage}` })),
    filters: [1, 2, 3].map((n) => ({ id: n, label: `Passage ${n}` })),
    subtitle: (items) =>
      `${items.length} real passages in CDI format · Passage 1 (${count(items, 1)}), Passage 2 (${count(items, 2)}), Passage 3 (${count(items, 3)})`,
    search: 'Search passages, e.g. coral, history, sleep',
  },
  listening: {
    title: 'Listening Practice',
    icon: ListeningIcon,
    unit: 'tests',
    items: listeningPractice.map((t) => ({
      ...t,
      group: Math.min(4, Math.ceil(t.no / 25)),
      badge: String(t.no),
      meta: '4 parts · audio included',
    })),
    filters: [1, 2, 3, 4].map((n) => ({ id: n, label: n < 4 ? `${(n - 1) * 25 + 1}–${n * 25}` : '76+' })),
    subtitle: (items) => `${items.length} full IELTS Listening tests · 4 parts, 40 questions each, with audio and transcripts`,
    search: 'Find a test by number, e.g. 25',
  },
};

/** Reading or Listening Practice: every test, with the signed-in student's best score. */
export function PracticeLibrary({ skill = 'reading', results = [], attempts = [], signedIn = false, unlocked = signedIn }) {
  const lib = LIBRARIES[skill];
  const all = lib.items;
  const Icon = lib.icon;
  const href = (id) => `${import.meta.env.BASE_URL}practice/${skill}/${id}.html`;
  const FILTERS = [{ id: 0, label: 'All' }, ...lib.filters];
  const [passage, setPassage] = useState(0);
  const [q, setQ] = useState('');
  // Signed in, but Reading Practice isn't opened for this account yet.
  const [gate, setGate] = useState(0);
  const gated = signedIn && !unlocked;
  const askForPractice = (title) => {
    if (!gated) return askToSignIn(title, 'practice');
    setGate((n) => n + 1);
    setTimeout(() => document.querySelector('.practice-gate')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };
  const best = useMemo(() => new Map(results.map((r) => [r.item, r])), [results]);
  const mine = useMemo(() => results.filter((r) => all.some((p) => p.id === r.item)), [results, all]);
  const done = all.filter((p) => best.has(p.id)).length;
  const pct = Math.round((done / all.length) * 100);

  const needle = q.trim().toLowerCase();
  const visible = all.filter(
    (p) =>
      (!passage || p.group === passage) &&
      (!needle || p.title.toLowerCase().includes(needle) || (skill === 'listening' && String(p.no) === needle)),
  );

  return (
    <section className="marathon" aria-labelledby="practice-lib-title">
      <header className="marathon__head card-white">
        <span className="marathon__icon">
          <Icon size={22} />
        </span>
        <div className="marathon__intro">
          <h2 id="practice-lib-title" className="marathon__title">
            {lib.title}
          </h2>
          <p className="muted-sm">{lib.subtitle(all)}</p>
        </div>
        {signedIn && (
          <div className="marathon__progress" aria-label={`${done} of ${all.length} ${lib.unit} done`}>
            <span className="marathon__count">
              {done}
              <small>/{all.length} done</small>
            </span>
            <span className="meter">
              <span style={{ width: `${pct}%` }} />
            </span>
          </div>
        )}
      </header>

      {gated && (
        <div className="practice-gate" key={gate} role="status">
          <p>
            <LockIcon size={16} /> <b>{lib.title} is for course students.</b>{' '}
            {skill === 'reading' ? 'The first passage of each part is free.' : 'Test 1 is free.'} Ask your teacher to open
            all {all.length} {lib.unit} for your account.
          </p>
          <a className="btn btn--dark btn--sm" href="https://t.me/READING_CDI" target="_blank" rel="noopener">
            Ask on Telegram
          </a>
        </div>
      )}

      {signedIn && mine.length > 0 && <PracticeSummary skill={skill} results={mine} attempts={attempts} title="My results" />}

      <div className="toolbar">
        <label className="search">
          <SearchIcon size={16} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lib.search}
            aria-label={`Search ${lib.unit}`}
          />
        </label>
        <div className="seg-tabs" role="tablist" aria-label="Group">
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
          <h3 className="empty__title">No {lib.unit} match “{q}”</h3>
        </div>
      ) : (
        <ul className="plib">
          {visible.map((p) => {
            const r = best.get(p.id);
            const locked = !unlocked && !isFreePractice(p.id);
            const Item = locked ? 'button' : 'a';
            return (
              <li key={p.id}>
                <Item
                  className={`plib__item tone-${tones[p.group]} ${r ? 'is-done' : ''} ${locked ? 'is-locked' : ''}`}
                  {...(locked ? { type: 'button', onClick: () => askForPractice(p.title) } : { href: href(p.id) })}
                >
                  <span className="plib__no">{p.badge}</span>
                  <span className="plib__text">
                    <strong>{p.title}</strong>
                    <span className="muted-sm">
                      {p.meta}
                      {p.questions ? ` · ${p.questions} questions` : ''}
                    </span>
                  </span>
                  {locked ? (
                    <span className="plib__go" aria-label="For course students">
                      <LockIcon size={15} />
                    </span>
                  ) : !unlocked ? (
                    <span className="pill pill--glass plib__score">Free</span>
                  ) : r ? (
                    <span className="pill pill--glass plib__score">
                      <Tick size={12} /> {r.correct != null ? `${r.correct}/${r.total} · Band ${Number(r.band).toFixed(1)}` : 'Done'}
                    </span>
                  ) : (
                    <span className="plib__go" aria-hidden="true">
                      →
                    </span>
                  )}
                </Item>
              </li>
            );
          })}
        </ul>
      )}
      {!signedIn && (
        <p className="muted-sm plib__hint">Sign in with your code to save your scores. All {lib.unit} open for course students.</p>
      )}
    </section>
  );
}
