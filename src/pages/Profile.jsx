import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ROLE_LEVELS } from '../utils/permissions';

export default function Profile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const fullNameRef = useRef();

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ full_name: fullNameRef.current.value.trim() })
        .eq('id', profile.id);
      if (err) throw err;
      await refreshProfile();
      setSuccess('Profile updated.');
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  const roleLevel = ROLE_LEVELS[profile.role] ?? 0;

  return (
    <div className="page">
      <h1 className="page-title">My Profile</h1>

      {/* Avatar + name */}
      <div className="card" style={styles.avatarCard}>
        <div style={styles.avatar}>{profile.full_name[0].toUpperCase()}</div>
        <p style={styles.name}>{profile.full_name}</p>
        <p className="text-sm text-secondary">{profile.email}</p>
        <div style={styles.rolePill}>
          <span style={styles.roleText}>{profile.role}</span>
          <span style={styles.roleLevel}>Level {roleLevel}</span>
        </div>
        {profile.division && (
          <p className="text-sm text-muted" style={{ marginTop: '4px' }}>{profile.division}</p>
        )}
      </div>

      {/* Edit form */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Account Details</h3>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
          )}
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {editing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="field">
              <label>Full Name</label>
              <input type="text" className="input" ref={fullNameRef} defaultValue={profile.full_name} required />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Full Name', value: profile.full_name },
              { label: 'Email',     value: profile.email },
              { label: 'Role',      value: profile.role },
              { label: 'Division',  value: profile.division ?? 'Organisation-wide' },
            ].map(row => (
              <div key={row.label} style={styles.row}>
                <p className="text-xs text-muted">{row.label}</p>
                <p style={{ fontSize: '14px', fontWeight: '600' }}>{row.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-danger btn-full" onClick={signOut}>Sign Out</button>
    </div>
  );
}

const styles = {
  avatarCard: {
    textAlign: 'center',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'var(--green-800)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '800',
  },
  name: { fontSize: '20px', fontWeight: '800' },
  rolePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--green-100)',
    borderRadius: '20px',
    padding: '4px 14px',
    marginTop: '4px',
  },
  roleText: { fontSize: '13px', fontWeight: '700', color: 'var(--green-800)' },
  roleLevel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' },
  row: { display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' },
};
