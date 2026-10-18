import { useState } from 'react';
import { api, photoUrl } from '../lib/api.js';
import { categoryOf, formatDate, hours, levelName } from '../lib/format.js';
import { formatBand } from '../lib/band.js';
import { readingPractice } from '../data/readingPractice.js';
import { els } from '../data/els.js';
import { PhotoViewer } from './ElsView.jsx';
import { ChevronDown, TrophyIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';
import { EmptyState, ErrorNote, Segmented, Skeleton, useLoad } from './admin/ui.jsx';

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];
const MEDALS = ['🥇', '🥈', '🥉'];
const practiceTitle = new Map(readingPractice.map((p) => [p.id, `P${p.passage} · ${p.title}`]));

function doneTitle(r) {
  if (r.kind === 'marathon') return `${categoryOf(r).label} · Day ${r.day}`;
  return (r.item && practiceTitle.get(r.item)) || r.topic || 'Practice';
}

/** Shared rating: every active student's study time, progress and badges. */
export function RatingView({ signedIn, version }) {
  const [period, setPeriod] = useState('week');
  const [open, setOpen] = useState(null);
  const [viewing, setViewing] = useState(null);
  const { data, error, loading, reload } = useLoad(() => api.leaderboard(period), [period, signedIn, version]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="hero-title hero-title--page">Rating</h1>
          <p className="muted-sm">Who studied the most — time, marathon days, passages, ELS translations and bands.</p>
        </div>
        <div className="rating__period">
          <Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />
        </div>
      </header>

      {error?.status === 401 ? (
        <EmptyState icon={TrophyIcon} title="Sign in to see the rating">
          Enter the code from your teacher under “Save your progress” on the right.
        </EmptyState>
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton rows={5} />
      ) : !data.students.length ? (
        <EmptyState icon={TrophyIcon} title="No students yet" />
      ) : (
        <ol className="rating">
          {data.students.map((s, i) => {
            const isMe = s.id === data.me;
            const expanded = open === s.id;
            const idle = s.records === 0 && s.els_days === 0;
            return (
              <li key={s.id} className={`rating__item card-white ${isMe ? 'is-me' : ''} ${idle ? 'is-idle' : ''}`}>
                <button
                  type="button"
                  className="rating__row"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : s.id)}
                >
                  <span className="rating__rank num">{!idle && i < 3 ? MEDALS[i] : i + 1}</span>
                  <Avatar name={s.full_name} size={38} studentId={s.id} v={s.avatar_v} />
                  <span className="rating__who">
                    <strong>
                      {s.full_name}
                      {isMe && <span className="rating__you">You</span>}
                    </strong>
                    <span className="muted-sm">
                      {s.group_name ? `${s.group_name} · ` : ''}
                      {s.level} {levelName(s.level)}
                    </span>
                  </span>
                  <span className="rating__stats">
                    <span className="rating__stat">
                      <b className="num">{s.minutes ? hours(s.minutes) : '0'}</b>
                      <small>studied</small>
                    </span>
                    <span className="rating__stat">
                      <b className="num">{s.marathon_reading + s.marathon_listening}</b>
                      <small>{s.marathon_reading + s.marathon_listening === 1 ? 'marathon day' : 'marathon days'}</small>
                    </span>
                    <span className="rating__stat">
                      <b className="num">{s.practice_done}</b>
                      <small>{s.practice_done === 1 ? 'passage' : 'passages'}</small>
                    </span>
                    <span className="rating__stat">
                      <b className="num">{s.els_days}</b>
                      <small>{s.els_days === 1 ? 'translation' : 'translations'}</small>
                    </span>
                    <span className="rating__stat">
                      <b className="num">{formatBand(s.average_band)}</b>
                      <small>avg band</small>
                    </span>
                  </span>
                  <span className={`rating__chev ${expanded ? 'is-open' : ''}`} aria-hidden="true">
                    <ChevronDown size={16} />
                  </span>
                </button>

                {s.badges.length > 0 && (
                  <div className="rating__badges">
                    {s.badges.map((b) => (
                      <span key={b.id} className="rating__badge" title={b.label}>
                        {b.emoji} {b.label}
                      </span>
                    ))}
                  </div>
                )}

                {expanded && (
                  <div className="rating__done">
                    {s.els.length > 0 && (
                      <div className="rating__els">
                        {s.els.map((e) => (
                          <div key={e.day}>
                            <p className="rating__els-day">
                              ELS Day {e.day} · {els.days[e.day - 1]?.title}
                            </p>
                            <div className="els-photos">
                              {e.photos.map((id) => (
                                <figure key={id} className="els-photo">
                                  <button type="button" onClick={() => setViewing(id)} aria-label="Open photo">
                                    <img src={photoUrl(id)} alt={`${s.full_name}'s ELS Day ${e.day} translation`} loading="lazy" />
                                  </button>
                                </figure>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {s.done.length === 0 && s.els.length === 0 ? (
                      <p className="muted-sm">Nothing done in this period yet.</p>
                    ) : s.done.length === 0 ? null : (
                      <table className="psum__table">
                        <thead>
                          <tr>
                            <th>Done</th>
                            <th className="num">Correct</th>
                            <th className="num">Band</th>
                            <th className="num">Time</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.done.map((r, j) => (
                            <tr key={j}>
                              <td>
                                <i className="rating__dot" style={{ background: categoryOf(r).color }} />
                                {doneTitle(r)}
                              </td>
                              <td className="num">{r.correct != null ? `${r.correct}/${r.total}` : '—'}</td>
                              <td className="num">
                                <strong>{formatBand(r.band)}</strong>
                              </td>
                              <td className="num">{r.duration_minutes} min</td>
                              <td className="muted-sm">{formatDate(r.lesson_date, { short: true })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {viewing && <PhotoViewer id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
