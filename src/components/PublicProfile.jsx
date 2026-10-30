import { api } from '../lib/api.js';
import { CATEGORIES, categoryOf, formatDate, hours, levelName, practiceTitle, relativeDay } from '../lib/format.js';
import { formatBand } from '../lib/band.js';
import { ArrowLeft } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';
import { ActivityChart } from './ActivityChart.jsx';
import { MarathonGrid } from './MarathonGrid.jsx';
import { PracticeSummary } from './PracticeSummary.jsx';
import { VocabSummary } from './VocabSummary.jsx';
import { AttemptsList } from './AttemptsList.jsx';
import { EmptyState, ErrorNote, Skeleton, useLoad } from './admin/ui.jsx';
import { TrophyIcon } from './Icons.jsx';

/** A classmate's page, opened from the Rating: what they did and their scores. */
export function PublicProfile({ id, myId }) {
  const { data, error, loading, reload } = useLoad(() => api.studentPage(id), [id]);

  const back = (
    <a className="back-link" href="#/rating">
      <ArrowLeft size={16} /> Rating
    </a>
  );
  if (error?.status === 401) {
    return (
      <>
        {back}
        <EmptyState icon={TrophyIcon} title="Sign in to see students’ pages">
          Sign in with the code from your teacher on the home page.
        </EmptyState>
      </>
    );
  }
  if (error) return (<>{back}<ErrorNote error={error} onRetry={error.status === 404 ? undefined : reload} /></>);
  if (loading && !data) return (<>{back}<Skeleton rows={4} /></>);

  const { student: s, summary: sum, badges, rank, of, marathon, practice, attempts, recent, activity, vocab } = data;
  const isMe = s.id === myId;

  return (
    <>
      {back}
      <section className="profile-hero">
        <Avatar name={s.full_name} size={72} studentId={s.id} v={s.avatar_v} />
        <div className="profile-hero__main">
          <div className="profile-hero__title">
            <h1 className="profile-hero__name">{s.full_name}</h1>
            {isMe && <span className="rating__you">You</span>}
          </div>
          <div className="profile-hero__meta">
            <span className="pill pill--glass">🏆 #{rank} of {of} · all time</span>
            {s.group_name && <span className="pill pill--glass">{s.group_name}</span>}
            {s.level && (
              <span className="pill pill--glass">
                {s.level} · {levelName(s.level)}
              </span>
            )}
          </div>
          {badges.length > 0 && (
            <div className="rating__badges rating__badges--hero">
              {badges.map((b) => (
                <span key={b.id} className="rating__badge">
                  {b.emoji} {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {sum && (
        <div className="stat-grid">
          <Stat tone="rose" label="Studied" value={hours(sum.minutes)} />
          <Stat tone="lilac" label="Marathon days" value={sum.marathon_days} />
          <Stat tone="peach" label="Practice tests" value={sum.practice_done} />
          <Stat tone="sand" label="Average band" value={formatBand(sum.average_band)} />
        </div>
      )}

      <section aria-labelledby="pp-progress">
        <div className="section-head">
          <h2 id="pp-progress" className="label">Progress</h2>
        </div>
        <div className="marathon-progress">
          <MarathonGrid skill="reading" label="Reading Marathon" tone="lilac" results={marathon} />
          <MarathonGrid skill="listening" label="Listening Marathon" tone="rose" results={marathon} />
          <PracticeSummary skill="reading" results={practice} attempts={attempts} title="Real exam passages" />
          {vocab?.length > 0 && <VocabSummary vocab={vocab} />}
          {practice.some((r) => r.skill === 'listening') && (
            <PracticeSummary skill="listening" results={practice} attempts={attempts} title="Listening tests" />
          )}
          <AttemptsList groups={attempts} title="Attempts — marathons & real exam passages" />
        </div>
      </section>


      <ActivityChart data={activity} series={CATEGORIES} rangeLabel="Last 7 months" title="Study activity" />

      <section aria-labelledby="pp-recent">
        <div className="section-head">
          <h2 id="pp-recent" className="label">Everything they did</h2>
        </div>
        {recent.length === 0 ? (
          <p className="muted-sm">Nothing yet.</p>
        ) : (
          <div className="psum card-white">
            <table className="psum__table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th className="num">Correct</th>
                  <th className="num">Band</th>
                  <th className="num">Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <i className="rating__dot" style={{ background: categoryOf(l).color }} />
                      {categoryOf(l).label} · {practiceTitle(l)}
                    </td>
                    <td className="num">{l.correct != null ? `${l.correct}/${l.total}` : '—'}</td>
                    <td className="num">
                      <strong>{formatBand(l.band)}</strong>
                    </td>
                    <td className="num">{l.duration_minutes} min</td>
                    <td className="muted-sm" title={formatDate(l.lesson_date)}>
                      {relativeDay(l.lesson_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </>
  );
}

function Stat({ tone, label, value }) {
  return (
    <div className={`stat tone-${tone}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
