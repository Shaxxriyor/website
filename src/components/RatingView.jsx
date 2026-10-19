import { useState } from 'react';
import { api } from '../lib/api.js';
import { hours, levelName } from '../lib/format.js';
import { formatBand } from '../lib/band.js';
import { ChevronRight, TrophyIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';
import { PrizeBanner } from './PrizeBanner.jsx';
import { EmptyState, ErrorNote, Segmented, Skeleton, useLoad } from './admin/ui.jsx';

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];
const MEDALS = ['🥇', '🥈', '🥉'];
/** Shared rating: every active student's study time, progress and badges. */
export function RatingView({ signedIn, version }) {
  const [period, setPeriod] = useState('month');
  const { data, error, loading, reload } = useLoad(() => api.leaderboard(period), [period, signedIn, version]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="hero-title hero-title--page">Rating</h1>
          <p className="muted-sm">Who studied the most. Tap a student to see everything they did.</p>
        </div>
        <div className="rating__period">
          <Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />
        </div>
      </header>

      <PrizeBanner
        compact
        leader={period === 'month' && data?.students?.[0]?.minutes > 0 ? data.students[0].full_name : null}
      />

      {error?.status === 401 ? (
        <EmptyState icon={TrophyIcon} title="Sign in to see the rating">
          Enter the code from your teacher under “Save your progress”.
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
            const idle = s.records === 0 && s.els_days === 0;
            return (
              <li key={s.id} className={`rating__item card-white ${isMe ? 'is-me' : ''} ${idle ? 'is-idle' : ''}`}>
                <a className="rating__row" href={`#/u/${s.id}`} aria-label={`Open ${s.full_name}'s page`}>
                  <span className="rating__rank num">{!idle && i < 3 ? MEDALS[i] : i + 1}</span>
                  <Avatar name={s.full_name} size={38} studentId={s.id} v={s.avatar_v} />
                  <span className="rating__who">
                    <strong>
                      {s.full_name}
                      {isMe && <span className="rating__you">You</span>}
                      {period === 'month' && i === 0 && !idle && <span className="rating__prize">🏆 Prize leader</span>}
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
                  <span className="rating__chev" aria-hidden="true">
                    <ChevronRight size={16} />
                  </span>
                </a>

                {s.badges.length > 0 && (
                  <div className="rating__badges">
                    {s.badges.map((b) => (
                      <span key={b.id} className="rating__badge" title={b.label}>
                        {b.emoji} {b.label}
                      </span>
                    ))}
                  </div>
                )}

              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
