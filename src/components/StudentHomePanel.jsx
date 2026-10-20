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
 * Right panel on the home page. Signed out: create a free account, or sign in with
 * email + password or the code from the teacher.
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

const MODES = {
  signup: { title: 'Join the free marathons', button: 'Create free account', busy: 'Creating…' },
  login: { title: 'Welcome back', button: 'Sign in', busy: 'Signing in…' },
  code: { title: 'Sign in with your code', button: 'Sign in', busy: 'Signing in…' },
};

function SignInPanel({ onSignedIn }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', code: '' });
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

  const ready =
    mode === 'code'
      ? form.code.trim()
      : form.email.trim() && form.password && (mode === 'login' || form.full_name.trim());

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    if (mode === 'signup' && form.password.length < 8) {
      setFields({ password: 'At least 8 characters' });
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') await api.signup({ full_name: form.full_name, email: form.email, password: form.password });
      else if (mode === 'login') await api.emailLogin(form.email, form.password);
      else await api.studentLogin(form.code);
      await onSignedIn(mode === 'signup');
    } catch (err) {
      setFields(err.fields || {});
      setError(err.fields && Object.keys(err.fields).length ? '' : err.message);
      if (err.status === 409) setError(err.message);
    }
    setBusy(false);
  }

  const m = MODES[mode];
  return (
    <aside className="panel glass panel--signin" aria-label="Sign up or sign in">
      <form ref={formRef} className="student-signin" onSubmit={submit} noValidate>
        <span className="brand__mark brand__mark--lg">
          <LogoMark size={44} />
        </span>
        <h2 className="profile__name">{m.title}</h2>
        {wanted && (
          <p key={pulse} className="signin-locked">
            🔒 <b>{wanted.what}</b>{' '}
            {wanted.kind === 'practice'
              ? '— Reading Practice is for course students. Sign in, then ask your teacher to open it for your account.'
              : '— create a free account (or sign in) to open every marathon day.'}
          </p>
        )}
        {mode === 'signup' && (
          <p className="muted-sm">Reading &amp; Listening Marathons and ELS Reading are free. Your scores and time are saved automatically.</p>
        )}
        {mode === 'code' && <p className="muted-sm">Enter the code from your teacher.</p>}

        <div className={`signin-fields ${pulse ? 'is-wanted' : ''}`} key={`f-${pulse}-${mode}`}>
          {mode === 'code' ? (
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
          ) : (
            <>
              {mode === 'signup' && (
                <SignField error={fields.full_name}>
                  <input
                    className="input"
                    value={form.full_name}
                    onChange={set('full_name')}
                    placeholder="Full name (shown in the Rating)"
                    aria-label="Full name"
                    autoComplete="name"
                    maxLength={120}
                  />
                </SignField>
              )}
              <SignField error={fields.email}>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={160}
                />
              </SignField>
              <SignField error={fields.password}>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
                  aria-label="Password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  maxLength={200}
                />
              </SignField>
            </>
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

        <p className="signin-switch muted-sm">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => switchTo('login')}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button type="button" className="link-btn" onClick={() => switchTo('signup')}>
                Create a free account
              </button>
            </>
          )}
        </p>
        <p className="signin-switch muted-sm">
          {mode === 'code' ? (
            <button type="button" className="link-btn" onClick={() => switchTo('login')}>
              Sign in with email instead
            </button>
          ) : (
            <button type="button" className="link-btn" onClick={() => switchTo('code')}>
              I have a code from my teacher
            </button>
          )}
        </p>
        {mode === 'login' && <p className="muted-sm signin-forgot">Forgot your password? Ask your teacher on Telegram for a sign-in code.</p>}

        <ul className="student-signin__points">
          <li>
            <CheckIcon size={14} /> Marathons and ELS Reading — free
          </li>
          <li>
            <CheckIcon size={14} /> Scores and time saved automatically
          </li>
          <li>
            <CheckIcon size={14} /> Reading Practice (137 real exam passages) — for course students
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
