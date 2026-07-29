import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ROLES, ROLE_LEVELS, getRoleLevel } from '../utils/permissions';

export default function Profile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const fullNameRef = useRef();

  const [managerProfile, setManagerProfile] = useState(null);
  const [eligibleManagers, setEligibleManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const needsManager = profile && profile.role !== ROLES.CEO;

  useEffect(() => {
    if (!profile?.manager_id) { setManagerProfile(null); return; }
    supabase.from('profiles').select('full_name, role').eq('id', profile.manager_id).single()
      .then(({ data }) => setManagerProfile(data ?? null));
  }, [profile?.manager_id]);

  useEffect(() => {
    if (!editing || !profile || !needsManager) return;
    supabase
      .from('profiles')
      .select('id, full_name, role, division')
      .eq('is_active', true)
      .or(`division.eq.${profile.division},role.eq.Executive Director,role.eq.CEO`)
      .then(({ data }) => {
        const myLevel = getRoleLevel(profile.role);
        const eligible = (data ?? []).filter(p => p.id !== profile.id && getRoleLevel(p.role) > myLevel);
        setEligibleManagers(eligible);
      });
    setSelectedManagerId(profile.manager_id ?? '');
  }, [editing, profile, needsManager]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          full_name: fullNameRef.current.value.trim(),
          ...(needsManager ? { manager_id: selectedManagerId || null } : {}),
        })
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

      {needsManager && !managerProfile && (
        <div className="alert" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffe69c' }}>
          ⚠️ No manager set — your KPIs won't be visible to anyone for approval until you set one below.
        </div>
      )}

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

            {needsManager && (
              <div className="field">
                <label>Manager</label>
                <select className="input" value={selectedManagerId} onChange={e => setSelectedManagerId(e.target.value)}>
                  <option value="">Not set</option>
                  {eligibleManagers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} — {m.role}</option>
                  ))}
                </select>
                {eligibleManagers.length === 0 && (
                  <p className="text-xs text-muted mt-8">
                    No eligible manager found yet in {profile.division}. Ask your HOD/Team Leader to create their account first.
                  </p>
                )}
              </div>
            )}

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
              ...(needsManager ? [{ label: 'Manager', value: managerProfile ? `${managerProfile.full_name} (${managerProfile.role})` : 'Not set' }] : []),
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
