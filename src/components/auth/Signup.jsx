import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES, DIVISIONS } from '../../utils/permissions';

const ROLE_OPTIONS = [
  ROLES.TO,
  ROLES.RO,
  ROLES.TEAM_LEADER,
  ROLES.HOD,
  ROLES.EXEC_DIR,
  ROLES.CEO,
];

export default function Signup() {
  const { signUp } = useAuth();
  const fullNameRef = useRef();
  const emailRef    = useRef();
  const passwordRef = useRef();
  const [role,          setRole]          = useState(ROLES.TO);
  const [division,      setDivision]      = useState(DIVISIONS[0]);
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [emailSent,     setEmailSent]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const pw = passwordRef.current.value;
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const result = await signUp({
        email:    emailRef.current.value.trim(),
        password: pw,
        fullName: fullNameRef.current.value.trim(),
        division: role === ROLES.CEO ? null : division,
        role,
      });
      if (result?.emailConfirmationRequired) {
        setEmailSent(true);
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div style={styles.logo}>🌿</div>
          <h1 style={styles.appName}>Kutsaga Field Ops</h1>
        </div>
        <div className="card" style={styles.form}>
          <h2 style={styles.formTitle}>Check Your Email</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            A confirmation link has been sent to <strong>{emailRef.current?.value}</strong>.
            Click it to activate your account, then come back to sign in.
          </p>
          <Link to="/login" style={{ ...styles.link, display: 'block', marginTop: '16px', textAlign: 'center' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.logo}>🌿</div>
        <h1 style={styles.appName}>Kutsaga Field Ops</h1>
      </div>

      <div className="card" style={styles.form}>
        <h2 style={styles.formTitle}>Create Account</h2>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={styles.fields}>
          <div className="field">
            <label>Full Name</label>
            <input
              type="text"
              className="input"
              ref={fullNameRef}
              defaultValue=""
              placeholder="e.g. Tinashe Moyo"
              required
            />
          </div>

          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              className="input"
              ref={emailRef}
              defaultValue=""
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label>Password (min 8 characters)</label>
            <input
              type="password"
              className="input"
              ref={passwordRef}
              defaultValue=""
              autoComplete="new-password"
              required
            />
          </div>

          <div className="field">
            <label>Role</label>
            <select
              className="input"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {role !== ROLES.CEO && (
            <div className="field">
              <label>Division</label>
              <select
                className="input"
                value={division}
                onChange={e => setDivision(e.target.value)}
              >
                {DIVISIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
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
    overflowY: 'auto',
  },
  header: { textAlign: 'center', marginBottom: '20px', color: '#fff' },
  logo: { fontSize: '48px', marginBottom: '6px' },
  appName: { fontSize: '22px', fontWeight: '800', color: '#fff' },
  form: { width: '100%', maxWidth: '400px', marginBottom: '24px' },
  formTitle: { fontSize: '18px', fontWeight: '700', marginBottom: '16px' },
  fields: { display: 'flex', flexDirection: 'column', gap: '14px' },
  switchText: { textAlign: 'center', fontSize: '14px', marginTop: '16px', color: 'var(--text-secondary)' },
  link: { color: 'var(--green-700)', fontWeight: '600', textDecoration: 'none' },
};
