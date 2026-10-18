import { useState } from 'react';
import { api } from '../lib/api.js';
import { CATEGORIES, categoryOf, hours, levelName, relativeDay, result } from '../lib/format.js';
import { CheckIcon, LogoMark, LogoutIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';
import { ActivityChart } from './ActivityChart.jsx';
import { MarathonGrid } from './MarathonGrid.jsx';
import { PracticeSummary } from './PracticeSummary.jsx';

/**
 * Right panel on the home page. Signed out: enter the code from the teacher.
 * Signed in: the student's own progress, saved automatically from the marathon pages.
 */
export function StudentHomePanel({ me, onSignedIn, onSignOut }) {
  if (me === undefined) {
    return <aside className="panel glass" aria-label="Your progress" aria-busy="true" />;
  }
  if (!me) return <SignInPanel onSignedIn={onSignedIn} />;

  const { student: s, stats, marathon, practice, recent, activity } = me;
  return (
    <aside className="panel glass" aria-label="Your progress">
      <div className="panel__top panel__top--admin">
        <span className="label">My progress</span>
        <button className="icon-btn icon-btn--ghost" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
          <LogoutIcon size={18} />
        </button>
      </div>

      <div className="profile">
        <span className="profile__halo">
          <Avatar name={s.full_name} size={64} />
        </span>
        <h2 className="profile__name">{s.full_name}</h2>
        <span className="pill pill--soft">
          {s.group_name ? `${s.group_name} · ` : ''}
          {s.level} {levelName(s.level)}
        </span>
      </div>

      <div className="friends card-white friends--static">
        <span>
          <strong>{stats.marathon_days}</strong> marathon days
        </span>
        <span>
          <strong>{hours(stats.total_minutes)}</strong> studied
        </span>
      </div>

      <ActivityChart data={activity} series={CATEGORIES} rangeLabel="Last 7 months" title="My activity" />

      <MarathonGrid skill="reading" label="Reading Marathon" tone="lilac" results={marathon} compact />
      <MarathonGrid skill="listening" label="Listening Marathon" tone="rose" results={marathon} compact />
      <PracticeSummary results={practice} compact />

      {recent.length > 0 && (
        <>
          <div className="section-head section-head--panel">
            <h3 className="label">Recent</h3>
          </div>
          <ul className="mini-lessons">
            {recent.slice(0, 5).map((l) => (
              <li key={l.id} className="mini-lesson card-white">
                <span className="mini-lesson__dot" style={{ background: categoryOf(l).color }} />
                <span className="mini-lesson__text">
                  <strong>{l.kind === 'marathon' ? `${categoryOf(l).label} · Day ${l.day}` : l.topic}</strong>
                  <span className="muted-sm">
                    {result(l) ? `${result(l)} · ` : ''}
                    {l.duration_minutes} min
                  </span>
                </span>
                <span className="muted-sm">{relativeDay(l.lesson_date)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

function SignInPanel({ onSignedIn }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.studentLogin(code);
      await onSignedIn();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <aside className="panel glass" aria-label="Sign in to save your progress">
      <form className="student-signin" onSubmit={submit}>
        <span className="brand__mark brand__mark--lg">
          <LogoMark size={44} />
        </span>
        <h2 className="profile__name">Save your progress</h2>
        <p className="muted-sm">Enter the code from your teacher. Every marathon day and practice passage you do is then saved automatically.</p>
        <input
          className="input input--code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError('');
          }}
          placeholder="ABCD-EFGH"
          aria-label="Your code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
        />
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--dark student-signin__btn" disabled={busy || !code.trim()}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <ul className="student-signin__points">
          <li>
            <CheckIcon size={14} /> Time on each day is counted for you
          </li>
          <li>
            <CheckIcon size={14} /> Scores are saved when you check answers
          </li>
          <li>
            <CheckIcon size={14} /> Your teacher sees your progress
          </li>
        </ul>
      </form>
    </aside>
  );
}
