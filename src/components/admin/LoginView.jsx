import { useState } from 'react';
import { api } from '../../lib/api.js';
import { LogoMark, Wordmark } from '../Icons.jsx';

export function LoginView({ onSignedIn, studentName }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login('', password);
      onSignedIn();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login card-white" onSubmit={submit}>
        <span className="login__mark">
          <LogoMark size={44} />
        </span>
        <Wordmark />
        <h1 className="login__title">Teacher sign in</h1>
        <p className="muted-sm">Students and their results are private. Enter the admin password.</p>
        {studentName && (
          <p className="login__note">
            This device is signed in as the student <strong>{studentName}</strong>. That code only saves practice — the
            teacher area needs the teacher login.
          </p>
        )}
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--dark login__btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
