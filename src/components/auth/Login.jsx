import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const emailRef    = useRef();
  const passwordRef = useRef();
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(emailRef.current.value.trim(), passwordRef.current.value);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.logo}>🌿</div>
        <h1 style={styles.appName}>Kutsaga Field Ops</h1>
        <p style={styles.subtitle}>Agricultural Extension System</p>
      </div>

      <div className="card" style={styles.form}>
        <h2 style={styles.formTitle}>Sign In</h2>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={styles.fields}>
          <div className="field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input"
              ref={emailRef}
              defaultValue=""
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              ref={passwordRef}
              defaultValue=""
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'var(--green-800)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
    color: '#fff',
  },
  logo: { fontSize: '56px', marginBottom: '8px' },
  appName: { fontSize: '26px', fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginTop: '4px' },
  form: { width: '100%', maxWidth: '400px' },
  formTitle: { fontSize: '18px', fontWeight: '700', marginBottom: '16px' },
  fields: { display: 'flex', flexDirection: 'column', gap: '14px' },
  switchText: { textAlign: 'center', fontSize: '14px', marginTop: '16px', color: 'var(--text-secondary)' },
  link: { color: 'var(--green-700)', fontWeight: '600', textDecoration: 'none' },
};
