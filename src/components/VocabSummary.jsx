import { vocabularyBooks } from '../data/vocabulary.js';

/** Flashcard progress per book: cards marked "I know it" and units started. */
export function VocabSummary({ vocab = [], compact = false, title = 'Vocabulary' }) {
  const rows = vocabularyBooks.map((b) => {
    const mine = vocab.filter((v) => v.book === b.id);
    const total = b.units.reduce((t, u) => t + u.count, 0);
    const known = mine.reduce((t, v) => t + v.known.length, 0);
    return { b, total, known, units: mine.length };
  });
  return (
    <div className={`psum card-white ${compact ? 'psum--compact' : ''}`}>
      <div className="mgrid__head">
        <span className="mgrid__label">{title}</span>
        <span className="muted-sm">flashcards</span>
      </div>
      <ul className="psum__rows">
        {rows.map((r) => (
          <li key={r.b.id}>
            <span className="psum__label">{r.b.kind === 'words' ? '4000 Words 5' : 'Collocations'}</span>
            <span className="skill-bars__track">
              <span style={{ width: `${(r.known / r.total) * 100}%`, background: 'var(--chart-vocabulary)' }} />
            </span>
            <span className="psum__value num">
              {r.known}/{r.total}
            </span>
          </li>
        ))}
      </ul>
      {!compact && (
        <p className="muted-sm psum__avg">
          {rows.map((r) => `${r.units} of ${r.b.units.length} ${r.b.kind === 'words' ? 'word' : 'collocation'} units started`).join(' · ')}
        </p>
      )}
    </div>
  );
}
