import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api.js';
import { askToSignIn } from '../lib/access.js';
import { XIcon } from './Icons.jsx';

const shuffled = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const localKey = (book, unit) => `rcdi_vocab_${book}_${unit}`;
function readLocal(book, unit) {
  try {
    return JSON.parse(localStorage.getItem(localKey(book, unit)) || '[]');
  } catch {
    return [];
  }
}
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* no speech on this device */
  }
}
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** An example sentence in IELTS context (writing or speaking topics). */
function Ielts({ text }) {
  if (!text) return null;
  return (
    <p className="fc-face__ielts">
      <span>IELTS</span> {text}
    </p>
  );
}

/** The words of a collocation that the gap hides, for highlighting on the back. */
function filled(card) {
  const shown = new Set(card.g.toLowerCase().split(' '));
  return card.c.split(' ').map((w, i) => ({ w, hit: !shown.has(w.toLowerCase()), i }));
}

/**
 * One unit as a deck of flashcards. Tap (or Space) flips a card; swipe right or
 * "I know it" (→) and swipe left or "Still learning" (←) move on. Known cards are
 * saved for signed-in students (this browser only for visitors on the free unit).
 */
export function Flashcards({ book, unit, saved = [], canSave = false, onSaved, onNext, onClose }) {
  const words = book.kind === 'words';
  const [cards, setCards] = useState(null);
  const [error, setError] = useState('');
  const [known, setKnown] = useState(() => new Set(canSave ? saved : readLocal(book.id, unit.n)));
  const [queue, setQueue] = useState([]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [round, setRound] = useState({ learning: 0, known: 0 });
  const [reverse, setReverse] = useState(false);
  const [drag, setDrag] = useState(null);
  const saveTimer = useRef(null);
  const knownRef = useRef(known);
  knownRef.current = known;

  // Load the unit's cards (unit 1 is free; the rest need an account).
  useEffect(() => {
    let live = true;
    setCards(null);
    setError('');
    api
      .vocabUnit(book.id, unit.n)
      .then(async (r) => {
        if (r.status === 401) throw Object.assign(new Error('Create a free account to open this unit.'), { status: 401 });
        if (!r.ok) throw new Error('This unit could not be loaded. Check your connection.');
        return r.json();
      })
      .then((d) => {
        if (!live) return;
        setCards(d.cards);
        start(d.cards, 'auto');
      })
      .catch((err) => {
        if (!live) return;
        setError(err.message);
        if (err.status === 401) askToSignIn(`${book.title} · Unit ${unit.n}`);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, unit.n]);

  // Start a round: 'auto' = the cards not known yet (all of them if none are known or all are).
  const start = useCallback((list, which) => {
    const all = list.map((_, i) => i);
    const k = knownRef.current;
    const todo = all.filter((i) => !k.has(i));
    const pickList = which === 'all' || (which === 'auto' && (todo.length === 0 || todo.length === all.length)) ? all : todo;
    setQueue(shuffled(pickList));
    setPos(0);
    setFlipped(false);
    setRound({ learning: 0, known: 0 });
  }, []);

  const persist = useCallback(
    (set) => {
      clearTimeout(saveTimer.current);
      const list = [...set];
      if (!canSave) {
        try {
          localStorage.setItem(localKey(book.id, unit.n), JSON.stringify(list));
        } catch {
          /* private mode: progress lasts for this visit only */
        }
        return;
      }
      saveTimer.current = setTimeout(() => {
        api
          .saveVocab({ book: book.id, unit: unit.n, known: list, total: cards?.length ?? unit.count })
          .then(() => onSaved?.())
          .catch(() => {});
      }, 700);
    },
    [book.id, unit.n, unit.count, canSave, cards, onSaved],
  );

  const answer = useCallback(
    (knowIt) => {
      if (!cards || pos >= queue.length) return;
      const idx = queue[pos];
      const next = new Set(known);
      if (knowIt) next.add(idx);
      else next.delete(idx);
      setKnown(next);
      persist(next);
      setRound((r) => ({ learning: r.learning + (knowIt ? 0 : 1), known: r.known + (knowIt ? 1 : 0) }));
      setFlipped(false);
      setPos((p) => p + 1);
    },
    [cards, pos, queue, known, persist],
  );

  // Keyboard: Space/Enter flip, → know, ← still learning, Esc close.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose();
      if (!cards || pos >= queue.length) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') answer(true);
      else if (e.key === 'ArrowLeft') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards, pos, queue, answer, onClose]);

  // No page scrolling behind the deck; flush a pending save on close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  useEffect(
    () => () => {
      if (saveTimer.current && canSave) {
        clearTimeout(saveTimer.current);
        api
          .saveVocab({ book: book.id, unit: unit.n, known: [...knownRef.current], total: unit.count })
          .then(() => onSaved?.())
          .catch(() => {});
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Swipe: drag the card sideways; a short tap flips it.
  const onPointerDown = (e) => {
    if (e.target.closest('button')) return;
    setDrag({ x0: e.clientX, y0: e.clientY, dx: 0, id: e.pointerId });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => drag && setDrag((d) => ({ ...d, dx: e.clientX - d.x0, dy: e.clientY - d.y0 }));
  const onPointerUp = () => {
    if (!drag) return;
    const { dx = 0, dy = 0 } = drag;
    setDrag(null);
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy)) answer(dx > 0);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) setFlipped((f) => !f);
  };

  const total = cards?.length ?? unit.count;
  const knownCount = useMemo(() => [...known].filter((i) => i < total).length, [known, total]);
  const card = cards && pos < queue.length ? cards[queue[pos]] : null;
  const finished = cards && queue.length > 0 && pos >= queue.length;
  const stillLearning = cards ? total - knownCount : 0;
  const hint = words ? null : `Unit ${unit.n} · ${unit.title}`;

  // Rendered on <body>: the page's animated containers would otherwise trap this
  // fixed layer (and the phone tab bar would sit on top of it).
  return createPortal(
    <div className="fc-backdrop" role="dialog" aria-modal="true" aria-label={`${book.title} · Unit ${unit.n}`}>
      <div className="fc">
        <header className="fc__head">
          <div className="fc__title">
            <strong>Unit {unit.n}</strong>
            <span className="muted-sm">{words ? book.title : unit.title}</span>
          </div>
          <button type="button" className="icon-btn icon-btn--ghost" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </header>

        <div className="fc__bar" aria-label={`${knownCount} of ${total} known`}>
          <span className="meter">
            <span style={{ width: `${(knownCount / total) * 100}%` }} />
          </span>
          <small>
            {knownCount}/{total} known
            {card ? ` · card ${pos + 1} of ${queue.length}` : ''}
          </small>
        </div>

        {error ? (
          <div className="fc__empty">
            <p>{error}</p>
            <button type="button" className="btn btn--dark" onClick={onClose}>
              OK
            </button>
          </div>
        ) : !cards ? (
          <div className="fc__empty">
            <p className="muted-sm">Loading cards…</p>
          </div>
        ) : finished ? (
          <div className="fc__done">
            <span className="fc__done-num">
              {knownCount}
              <small>/{total}</small>
            </span>
            <p>
              {stillLearning === 0
                ? 'You know every card in this unit. Well done!'
                : `This round: ${round.known} known, ${round.learning} still learning.`}
            </p>
            <div className="fc__done-actions">
              {stillLearning > 0 && (
                <button type="button" className="btn btn--dark" onClick={() => start(cards, 'todo')}>
                  Study the {stillLearning} I’m still learning
                </button>
              )}
              <button type="button" className="btn btn--glass" onClick={() => start(cards, 'all')}>
                Go through all {total} again
              </button>
              {onNext && (
                <button type="button" className="btn btn--glass" onClick={onNext}>
                  Next unit →
                </button>
              )}
            </div>
            {!canSave && <p className="muted-sm">Sign in to keep your progress on every device.</p>}
          </div>
        ) : (
          card && (
            <>
              <div
                className={`fc-card ${flipped ? 'is-flipped' : ''} ${drag ? 'is-dragging' : ''}`}
                style={drag ? { transform: `translateX(${drag.dx}px) rotate(${drag.dx / 22}deg)` } : undefined}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDrag(null)}
                role="button"
                tabIndex={0}
                aria-label={flipped ? 'Card back — tap to flip' : 'Card front — tap to flip'}
              >
                {drag && Math.abs(drag.dx) > 40 && (
                  <span className={`fc-card__stamp ${drag.dx > 0 ? 'is-know' : 'is-learn'}`}>
                    {drag.dx > 0 ? 'I know it' : 'Still learning'}
                  </span>
                )}
                <div className="fc-card__inner">
                  <div className="fc-face fc-face--front">
                    {words ? (
                      reverse ? (
                        <>
                          <span className="fc-face__label">What’s the word?</span>
                          <p className="fc-face__def">{card.d}</p>
                          <span className="fc-face__pos">{card.pos}</span>
                        </>
                      ) : (
                        <>
                          <span className="fc-face__label">{card.pos}</span>
                          <span className="fc-face__word">{card.w}</span>
                          {canSpeak && (
                            <button type="button" className="fc-say" onClick={() => speak(card.w)} aria-label="Listen">
                              🔊
                            </button>
                          )}
                        </>
                      )
                    ) : (
                      <>
                        <span className="fc-face__label">Which word goes in the gap?</span>
                        <span className="fc-face__gap">{card.g}</span>
                        <span className="fc-face__hint">{hint}</span>
                      </>
                    )}
                    <span className="fc-face__tap">Tap to flip</span>
                  </div>
                  <div className="fc-face fc-face--back">
                    {words ? (
                      <>
                        <span className="fc-face__word fc-face__word--sm">
                          {card.w} <em>{card.pos}</em>
                          {canSpeak && (
                            <button type="button" className="fc-say" onClick={() => speak(card.w)} aria-label="Listen">
                              🔊
                            </button>
                          )}
                        </span>
                        {card.uz && (
                          <span className="fc-face__uz" lang="uz">
                            {card.uz}
                          </span>
                        )}
                        <span className="fc-face__ru" lang="ru">
                          <b>RU</b> {card.ru}
                        </span>
                        {!reverse && <p className="fc-face__def">{card.d}</p>}
                        <p className="fc-face__ex">{card.e}</p>
                        <Ielts text={card.ielts} />
                      </>
                    ) : (
                      <>
                        <span className="fc-face__coll">
                          {filled(card).map((t) => (
                            <span key={t.i} className={t.hit ? 'is-hit' : ''}>
                              {t.w}{' '}
                            </span>
                          ))}
                          {canSpeak && (
                            <button type="button" className="fc-say" onClick={() => speak(card.c)} aria-label="Listen">
                              🔊
                            </button>
                          )}
                        </span>
                        {card.uz && (
                          <span className="fc-face__uz" lang="uz">
                            {card.uz}
                          </span>
                        )}
                        {card.m && <p className="fc-face__def">= {card.m}</p>}
                        <Ielts text={card.ielts} />
                        {card.e && <p className="fc-face__ex">{card.e}</p>}
                        {card.also && <span className="fc-face__hint">Also in Unit {card.also.join(', ')}</span>}
                        <span className="fc-face__hint">{hint}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="fc__actions">
                <button type="button" className="fc-btn fc-btn--learn" onClick={() => answer(false)}>
                  <span aria-hidden="true">←</span> Still learning
                </button>
                <button type="button" className="fc-btn fc-btn--know" onClick={() => answer(true)}>
                  I know it <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="fc__tools">
                {words && (
                  <button type="button" className="chip" onClick={() => { setReverse((r) => !r); setFlipped(false); }} aria-pressed={reverse}>
                    {reverse ? 'Meaning → word' : 'Word → meaning'}
                  </button>
                )}
                <button type="button" className="chip" onClick={() => start(cards, 'all')}>
                  Shuffle all {total}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>,
    document.body,
  );
}
