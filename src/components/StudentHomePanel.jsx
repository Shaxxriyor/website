import { useEffect, useRef, useState } from 'react';
import { api, squareImage } from '../lib/api.js';
import { CATEGORIES, categoryOf, hours, levelName, relativeDay, result } from '../lib/format.js';
import { CameraIcon, CheckIcon, LogoMark, LogoutIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';
import { ActivityChart } from './ActivityChart.jsx';
import { MarathonGrid } from './MarathonGrid.jsx';
import { PracticeSummary } from './PracticeSummary.jsx';
import { AttemptsList } from './AttemptsList.jsx';

/**
 * Right panel on the home page. Signed out: enter the code from the teacher.
 * Signed in: the student's own progress, saved automatically from the marathon pages.
 */
export function StudentHomePanel({ me, onSignedIn, onSignOut, onChanged, notify }) {
  if (me === undefined) {
    return <aside className="panel glass" aria-label="Your progress" aria-busy="true" />;
  }
  if (!me) return <SignInPanel onSignedIn={onSignedIn} />;

  const { student: s, stats, marathon, practice, recent, activity, attempts } = me;
  return (
    <aside className="panel glass" aria-label="Your progress">
      <div className="panel__top panel__top--admin">
        <span className="label">My progress</span>
        <button className="icon-btn icon-btn--ghost" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
          <LogoutIcon size={18} />
        </button>
      </div>

      <div className="profile">
        <ProfilePhoto student={s} onChanged={onChanged} notify={notify} />
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
      <AttemptsList groups={attempts} limit={8} compact title="My attempts" />

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
  const [wanted, setWanted] = useState('');
  const [pulse, setPulse] = useState(0);
  const inputRef = useRef(null);

  // A visitor tapped a locked lesson: bring this panel into view and explain.
  useEffect(() => {
    const onNeed = (e) => {
      setWanted(e.detail || '');
      setPulse((n) => n + 1);
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
    };
    window.addEventListener('rcdi:need-signin', onNeed);
    return () => window.removeEventListener('rcdi:need-signin', onNeed);
  }, []);

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
    <aside className="panel glass panel--signin" aria-label="Sign in to save your progress">
      <form className="student-signin" onSubmit={submit}>
        <span className="brand__mark brand__mark--lg">
          <LogoMark size={44} />
        </span>
        <h2 className="profile__name">{wanted ? 'For READING_CDI students' : 'Save your progress'}</h2>
        {wanted && (
          <p key={pulse} className="signin-locked">
            🔒 <b>{wanted}</b> is open to students. Day 1 of each section is free — sign in with your code to open
            everything.
          </p>
        )}
        <p className="muted-sm">Enter the code from your teacher. Every marathon day and practice passage you do is then saved automatically.</p>
        <input
          ref={inputRef}
          key={`code-${pulse}`}
          className={`input input--code ${pulse ? 'is-wanted' : ''}`}
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

/** The student's own avatar with a camera button to set or remove their profile photo. */
function ProfilePhoto({ student, onChanged, notify }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);

  async function choose(file) {
    setBusy(true);
    setMenu(false);
    try {
      await api.setAvatar(await squareImage(file));
      await onChanged?.();
      notify?.('Profile photo updated');
    } catch (err) {
      notify?.(err.message);
    }
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  async function remove() {
    setMenu(false);
    await api.removeAvatar().catch(() => {});
    await onChanged?.();
    notify?.('Profile photo removed');
  }

  return (
    <>
      <span className="profile__halo avatar-edit">
        <Avatar name={student.full_name} size={64} studentId={student.id} v={student.avatar_v} />
        <button
          type="button"
          className="avatar-edit__btn"
          aria-label={student.avatar_v ? 'Change profile photo' : 'Add a profile photo'}
          title={student.avatar_v ? 'Change profile photo' : 'Add a profile photo'}
          disabled={busy}
          onClick={() => (student.avatar_v ? setMenu((m) => !m) : input.current?.click())}
        >
          <CameraIcon size={14} />
        </button>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && choose(e.target.files[0])} />
      </span>
      {busy && <span className="muted-sm">Saving photo…</span>}
      {menu && (
        <span className="avatar-menu">
          <button type="button" className="btn btn--glass btn--sm" onClick={() => input.current?.click()}>
            Change photo
          </button>
          <button type="button" className="btn btn--glass btn--sm" onClick={remove}>
            Remove
          </button>
        </span>
      )}
    </>
  );
}
