import { useState } from 'react';
import { useAuth } from '../../context/authContext';

function initialsOf(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function formatDate(value) {
  if (!value) return 'just now';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'just now';
  }
}

function AccountView({ user, onSignOut, onNavigate }) {
  return (
    <div className="auth-user-card">
      <div className="auth-user-top">
        <span className="auth-avatar">{initialsOf(user.name)}</span>
        <div>
          <span className="auth-eyebrow">Signed in</span>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="auth-user-facts">
        <div>
          <span>Member since</span>
          <b>{formatDate(user.createdAt)}</b>
        </div>
        <div>
          <span>Session</span>
          <b>Stored in this browser</b>
        </div>
      </div>

      <p className="auth-hint">
        This is a local demo account. CodeArchi keeps the account in this browser only, so no data
        leaves your machine.
      </p>

      <div className="auth-actions">
        <button type="button" className="key hot" onClick={() => onNavigate('explorer')}>
          Continue to Explorer
        </button>
        <button type="button" className="key" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AuthPage({ onNavigate }) {
  const { user, login, signup, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('The two passwords do not match.');
        }
        await signup({ name, email, password });
      } else {
        await login({ email, password });
      }
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="full-page auth-page">
      <div className="page-banner">
        <span className="tag">
          <span className="led"></span>
          Account
        </span>
        <h1>Sign in to CodeArchi.</h1>
        <p>
          Keep your workspace personal. Create a local account, sign in on this browser, and sign
          out whenever you are done.
        </p>
      </div>

      <div className="auth-shell">
        <div className="auth-card">
          {user ? (
            <AccountView
              user={user}
              onSignOut={logout}
              onNavigate={onNavigate}
            />
          ) : (
            <>
              <div className="auth-tabs" role="tablist" aria-label="Account action">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => switchMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => switchMode('signup')}
                >
                  Create account
                </button>
              </div>

              <div className="auth-form-head">
                <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
                <p>
                  {mode === 'login'
                    ? 'Enter the email and password you used before.'
                    : 'Pick a name, email, and password. Everything stays in this browser.'}
                </p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                {mode === 'signup' && (
                  <div className="auth-field">
                    <label htmlFor="auth-name">Your name</label>
                    <input
                      id="auth-name"
                      className="auth-input"
                      type="text"
                      value={name}
                      autoComplete="name"
                      placeholder="Aarav Sharma"
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    className="auth-input"
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder="you@example.com"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-password">Password</label>
                  <div className="auth-password-wrap">
                    <input
                      id="auth-password"
                      className="auth-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="At least 6 characters"
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="auth-show-btn"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="auth-field">
                    <label htmlFor="auth-confirm">Confirm password</label>
                    <input
                      id="auth-confirm"
                      className="auth-input"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      autoComplete="new-password"
                      placeholder="Type the password again"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </div>
                )}

                {error && (
                  <div className="auth-error" role="alert">
                    {error}
                  </div>
                )}

                <button type="submit" className="key hot auth-submit" disabled={busy}>
                  {busy
                    ? 'Please wait...'
                    : mode === 'login'
                      ? 'Sign In'
                      : 'Create Account'}
                </button>
              </form>

              <p className="auth-hint">
                Local demo authentication. Passwords are salted and hashed before being stored in
                this browser. There is no server account.
              </p>
            </>
          )}
        </div>

        <aside className="auth-side">
          <span className="auth-eyebrow">Why sign in?</span>
          <h2>A calmer place to explore code.</h2>
          <ul>
            <li>Your name stays visible in the header while you work.</li>
            <li>Sign out in one click from the header or this page.</li>
            <li>No server, no tracking, and no data leaves this browser.</li>
          </ul>
          <div className="auth-side-actions">
            <button type="button" className="key" onClick={() => onNavigate('explorer')}>
              Explore without signing in
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
