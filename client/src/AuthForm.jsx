import { useState } from 'react';
import { login, signup } from './api';

export default function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = mode === 'login' ? await login(email, password) : await signup(email, password);
      onAuthed(user);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="app">
      <h1>{mode === 'login' ? 'Log In' : 'Sign Up'}</h1>

      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">{mode === 'login' ? 'Log In' : 'Sign Up'}</button>
      </form>

      {error && <p className="error">{error}</p>}

      <p className="switch-mode">
        {mode === 'login' ? (
          <>
            No account?{' '}
            <button type="button" onClick={() => setMode('signup')}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Have an account?{' '}
            <button type="button" onClick={() => setMode('login')}>
              Log in
            </button>
          </>
        )}
      </p>
    </main>
  );
}
