import { useMemo, useState } from 'react';
import { vocabularyBooks } from '../data/vocabulary.js';
import { askToSignIn } from '../lib/access.js';
import { LockIcon, Tick, VocabularyIcon } from './Icons.jsx';
import { Flashcards } from './Flashcards.jsx';

const tones = ['mint', 'peach', 'lilac', 'rose', 'sky'];
const remembered = () => {
  try {
    return localStorage.getItem('rcdi_vocab_book');
  } catch {
    return null;
  }
};

/** Vocabulary: the books as flashcard decks, one deck per unit. Unit 1 of each book is free. */
export function VocabularyView({ me = null, admin = null, signedIn = false, onChanged }) {
  const [bookId, setBookId] = useState(() => vocabularyBooks.find((b) => b.id === remembered())?.id ?? vocabularyBooks[0].id);
  const [open, setOpen] = useState(null);
  const book = vocabularyBooks.find((b) => b.id === bookId);
  const unlocked = signedIn || Boolean(admin);

  // Known cards per unit, from the student's saved progress.
  const progress = useMemo(() => {
    const m = new Map();
    for (const p of me?.vocab ?? []) m.set(`${p.book}:${p.unit}`, p);
    return m;
  }, [me]);
  const knownIn = (b, n) => progress.get(`${b.id}:${n}`)?.known?.length ?? 0;
  const bookKnown = (b) => b.units.reduce((t, u) => t + Math.min(knownIn(b, u.n), u.count), 0);
  const bookTotal = (b) => b.units.reduce((t, u) => t + u.count, 0);

  function pick(id) {
    setBookId(id);
    try {
      localStorage.setItem('rcdi_vocab_book', id);
    } catch {
      /* not remembered */
    }
  }

  return (
    <section className="marathon" aria-labelledby="vocab-title">
      <header className="marathon__head card-white">
        <span className="marathon__icon">
          <VocabularyIcon size={22} />
        </span>
        <div className="marathon__intro">
          <h2 id="vocab-title" className="marathon__title">
            Vocabulary
          </h2>
          <p className="muted-sm">Flashcards from the books: tap a card to flip it, then mark whether you know it.</p>
        </div>
      </header>

      <div className="vbooks">
        {vocabularyBooks.map((b, i) => {
          const total = bookTotal(b);
          const known = bookKnown(b);
          return (
            <button
              key={b.id}
              type="button"
              className={`vbook tone-${b.tone ?? tones[i % tones.length]} ${b.id === bookId ? 'is-active' : ''}`}
              onClick={() => pick(b.id)}
              aria-pressed={b.id === bookId}
            >
              <span className="vbook__title">{b.title}</span>
              <span className="vbook__meta">
                {total.toLocaleString('en')} {b.kind === 'words' ? 'words' : 'collocations'} · {b.units.length} units
              </span>
              <span className="vbook__blurb">{b.blurb}</span>
              {signedIn && (
                <span className="vbook__progress">
                  <span className="meter">
                    <span style={{ width: `${total ? (known / total) * 100 : 0}%` }} />
                  </span>
                  <small>
                    {known}/{total} known
                  </small>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ol className="vunits">
        {book.units.map((u, i) => {
          const locked = !unlocked && u.n !== 1;
          const known = Math.min(knownIn(book, u.n), u.count);
          const done = known >= u.count;
          return (
            <li key={u.n}>
              <button
                type="button"
                className={`vunit tone-${tones[i % tones.length]} ${locked ? 'is-locked' : ''} ${done ? 'is-done' : ''}`}
                onClick={() => (locked ? askToSignIn(`${book.title} · Unit ${u.n}`) : setOpen(u))}
              >
                <span className="vunit__top">
                  <span className="day-card__label">Unit</span>
                  {locked ? (
                    <span className="pill pill--glass day-card__status">
                      <LockIcon size={12} /> Students
                    </span>
                  ) : !unlocked ? (
                    <span className="pill pill--glass day-card__status">Free</span>
                  ) : done ? (
                    <span className="pill pill--glass day-card__status">
                      <Tick size={12} /> All known
                    </span>
                  ) : null}
                </span>
                <span className="vunit__num">{String(u.n).padStart(2, '0')}</span>
                <span className="vunit__title">{u.title}</span>
                <span className="vunit__foot">
                  <span className="meter">
                    <span style={{ width: `${(known / u.count) * 100}%` }} />
                  </span>
                  <small>
                    {known}/{u.count}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {open && (
        <Flashcards
          book={book}
          unit={open}
          saved={progress.get(`${book.id}:${open.n}`)?.known ?? []}
          canSave={Boolean(me)}
          onSaved={onChanged}
          onNext={
            book.units.some((u) => u.n === open.n + 1) && (unlocked || open.n + 1 === 1)
              ? () => setOpen(book.units.find((u) => u.n === open.n + 1))
              : null
          }
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
