import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { categoryOf, relativeDay, timeAgo } from '../lib/format.js';
import { vocabularyBooks } from '../data/vocabulary.js';
import { mockById } from '../lib/mocks.js';
import { Avatar } from './Avatar.jsx';
import { EmptyState, ErrorNote, Skeleton } from './admin/ui.jsx';
import { SparkleIcon } from './Icons.jsx';

const band = (b) => (b == null ? null : Number(b).toFixed(1));
const tashkentDay = (iso) => new Date(new Date(iso).getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);

/** One line of the feed: what was done, and its result. */
function describe(e) {
  if (e.type === 'vocab') {
    const book = vocabularyBooks.find((b) => b.id === e.book);
    return {
      what: `Vocabulary · ${book?.title ?? e.book} · Unit ${e.unit}`,
      result: `${e.known}/${e.total} known`,
      tone: 'sky',
    };
  }
  if (e.type === 'mock') {
    const parts = [e.listening != null && `L ${band(e.listening)}`, e.reading != null && `R ${band(e.reading)}`].filter(Boolean);
    return { what: mockById(e.mock)?.title ?? 'Full mock test', result: parts.join(' · '), tone: 'lemon' };
  }
  const cat = categoryOf(e);
  const what =
    e.kind === 'marathon'
      ? `${cat.label} · Day ${e.day}`
      : `${e.skill === 'listening' ? 'Listening' : 'Reading'} Practice${e.topic ? ` · ${e.topic}` : ''}`;
  const result =
    e.correct != null
      ? `${e.correct}/${e.total}${e.band != null ? ` · Band ${band(e.band)}` : ''}`
      : e.duration_minutes
        ? `${e.duration_minutes} min`
        : '';
  return { what, result, tone: cat.tone, color: cat.color };
}

/** Live activity: every student's actions, newest first, for everyone signed in. */
export function ActivityFeed({ me }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { feed } = await api.activityFeed();
      setItems(feed);
      setMore(feed.length >= 80);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);
  useEffect(() => {
    load();
    // Fresh every minute while the page is open.
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    return () => clearInterval(t);
  }, [load]);

  async function older() {
    setBusy(true);
    try {
      const { feed } = await api.activityFeed(items.at(-1)?.at);
      setItems((x) => [...x, ...feed]);
      setMore(feed.length >= 80);
    } catch (err) {
      setError(err);
    }
    setBusy(false);
  }

  if (error && !items) return <ErrorNote error={error} onRetry={load} />;
  if (!items) return <Skeleton rows={6} />;
  if (!items.length)
    return (
      <EmptyState icon={SparkleIcon} title="No activity yet">
        Every marathon day, practice test, vocabulary unit and mock test appears here as soon as a student does it.
      </EmptyState>
    );

  const days = [];
  for (const e of items) {
    const day = tashkentDay(e.at);
    if (days.at(-1)?.day !== day) days.push({ day, items: [] });
    days.at(-1).items.push(e);
  }

  return (
    <div className="feed">
      {days.map((d) => (
        <section key={d.day} className="feed__day">
          <h3 className="lesson-day__title">{relativeDay(d.day)}</h3>
          <ul className="feed__list card-white">
            {d.items.map((e, i) => {
              const x = describe(e);
              return (
                <li key={`${e.type}-${e.at}-${e.student_id}-${i}`} className={`feed__item ${e.student_id === me ? 'is-me' : ''}`}>
                  <a href={`#/u/${e.student_id}`} className="feed__who" aria-label={`Open ${e.full_name}'s page`}>
                    <Avatar name={e.full_name} size={32} studentId={e.student_id} v={e.avatar_v} />
                  </a>
                  <span className="feed__text">
                    <a href={`#/u/${e.student_id}`} className="feed__name">
                      {e.full_name}
                      {e.student_id === me && <span className="rating__you">You</span>}
                    </a>
                    <span className="feed__what">
                      <i className={`feed__dot tone-${x.tone}`} style={x.color ? { background: x.color } : undefined} />
                      {x.what}
                    </span>
                  </span>
                  {x.result && <span className="feed__result">{x.result}</span>}
                  <time className="feed__time muted-sm" dateTime={e.at} title={new Date(e.at).toLocaleString('en-GB')}>
                    {timeAgo(e.at)}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {more && (
        <button type="button" className="btn btn--glass feed__more" disabled={busy} onClick={older}>
          {busy ? 'Loading…' : 'Show older activity'}
        </button>
      )}
    </div>
  );
}
