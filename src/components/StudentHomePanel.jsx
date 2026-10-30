import { useEffect, useRef, useState } from 'react';
import { api, squareImage } from '../lib/api.js';
import { CATEGORIES, categoryOf, hours, levelName, relativeDay, result } from '../lib/format.js';
import { CameraIcon, CheckIcon, LogoMark, LogoutIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';
import { ActivityChart } from './ActivityChart.jsx';
import { MarathonGrid } from './MarathonGrid.jsx';
import { PracticeSummary } from './PracticeSummary.jsx';
import { AttemptsList } from './AttemptsList.jsx';
import { VocabSummary } from './VocabSummary.jsx';

/**
 * Right panel on the home page. Signed out: sign in with the code from the teacher
 * (students are registered by the teacher), or the teacher signs in as admin.
 * Signed in: the student's own progress, saved automatically from the marathon pages.
 */
export function StudentHomePanel({ me, onSignedIn, onAdminSignedIn, onSignOut, onChanged, notify }) {
  if (me === undefined) {
    return <aside className="panel glass" aria-label="Your progress" aria-busy="true" />;
  }
  if (!me) return <SignInPanel onSignedIn={onSignedIn} onAdminSignedIn={onAdminSignedIn} />;

  const { student: s, stats, marathon, practice, recent, activity, attempts, vocab } = me;
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
        {(s.group_name || s.level) && (
          <span className="pill pill--soft">
            {[s.group_name, s.level && `${s.level} ${levelName(s.level)}`].filter(Boolean).join(' · ')}
          </span>
        )}
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
      <PracticeSummary skill="reading" results={practice} compact />
      {practice.some((r) => r.skill === 'listening') && <PracticeSummary skill="listening" results={practice} compact />}
      {vocab?.length > 0 && <VocabSummary vocab={vocab} compact />}
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

const MODES = {
  code: { title: 'Sign in with your code', button: 'Sign in', busy: 'Signing in…' },
  admin: { title: 'Teacher / admin', button: 'Sign in as admin', busy: 'Signing in…' },
};

function SignInPanel({ onSignedIn, onAdminSignedIn }) {
  const [mode, setMode] = useState('code');
  const [form, setForm] = useState({ code: '', admin: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [wanted, setWanted] = useState(null);
  const [pulse, setPulse] = useState(0);
  const formRef = useRef(null);

  // A visitor tapped a locked lesson: bring this panel into view and explain.
  useEffect(() => {
    const onNeed = (e) => {
      setWanted(e.detail || null);
      setPulse((n) => n + 1);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => formRef.current?.querySelector('input')?.focus({ preventScroll: true }), 350);
    };
    window.addEventListener('rcdi:need-signin', onNeed);
    return () => window.removeEventListener('rcdi:need-signin', onNeed);
  }, []);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: key === 'code' ? e.target.value.toUpperCase() : e.target.value }));
    setFields((f) => ({ ...f, [key]: undefined }));
    setError('');
  };

  function switchTo(next) {
    setMode(next);
    setError('');
    setFields({});
  }

  const ready = mode === 'admin' ? form.admin : form.code.trim();

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'admin') {
        await api.login('', form.admin);
        setBusy(false);
        await onAdminSignedIn?.();
        return;
      }
      await api.studentLogin(form.code);
      await onSignedIn();
    } catch (err) {
      setFields(err.fields || {});
      setError(err.fields && Object.keys(err.fields).length ? '' : err.message);
      if (err.status === 409) setError(err.message);
    }
    setBusy(false);
  }

  const m = MODES[mode];
  return (
    <aside className="panel glass panel--signin" aria-label="Sign in">
      <form ref={formRef} className="student-signin" onSubmit={submit} noValidate>
        <span className="brand__mark brand__mark--lg">
          <LogoMark size={44} />
        </span>
        <h2 className="profile__name">{m.title}</h2>
        {wanted && (
          <p key={pulse} className="signin-locked">
            🔒 <b>{wanted.what}</b>{' '}
            {wanted.kind === 'practice'
              ? '— Reading & Listening Practice are for course students. Sign in, then ask your teacher to open them for your account.'
              : '— this is for READING_CDI students. Sign in with the code from your teacher.'}
          </p>
        )}
        {mode === 'code' && (
          <p className="muted-sm">Enter the code from your teacher. Your scores and study time are then saved automatically.</p>
        )}
        {mode === 'admin' && <p className="muted-sm">For the teacher: opens Students, Practice and every material.</p>}

        <div className={`signin-fields ${pulse ? 'is-wanted' : ''}`} key={`f-${pulse}-${mode}`}>
          {mode === 'admin' ? (
            <SignField error={fields.admin}>
              <input
                className="input"
                type="password"
                value={form.admin}
                onChange={set('admin')}
                placeholder="Admin password"
                aria-label="Admin password"
                autoComplete="current-password"
                maxLength={200}
              />
            </SignField>
          ) : (
            <input
              className="input input--code"
              value={form.code}
              onChange={set('code')}
              placeholder="ABCD-EFGH"
              aria-label="Your code"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
            />
          )}
        </div>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--dark student-signin__btn" disabled={busy || !ready}>
          {busy ? m.busy : m.button}
        </button>

        {mode === 'admin' ? (
          <p className="signin-switch muted-sm">
            <button type="button" className="link-btn" onClick={() => switchTo('code')}>
              ← Student sign-in
            </button>
          </p>
        ) : (
          <button type="button" className="btn btn--glass btn--sm signin-admin" onClick={() => switchTo('admin')}>
            Teacher / admin
          </button>
        )}

        <ul className="student-signin__points">
          <li>
            <CheckIcon size={14} /> Marathons, ELS Reading and Vocabulary
          </li>
          <li>
            <CheckIcon size={14} /> Scores and time saved automatically
          </li>
          <li>
            <CheckIcon size={14} /> No code yet? Ask your teacher on Telegram: t.me/READING_CDI
          </li>
        </ul>
      </form>
    </aside>
  );
}

function SignField({ error, children }) {
  return (
    <label className="signin-field">
      {children}
      {error && <span className="field__error">{error}</span>}
    </label>
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
