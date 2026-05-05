import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import KPICard from '../../components/kpi/KPICard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function HODDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats,       setStats]       = useState(null);
  const [pendingKPIs, setPendingKPIs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchStats(),
      fetchPending(),
      fetchTeam(),
    ]).finally(() => setLoading(false));
  }, [profile]);

  async function fetchStats() {
    const { data } = await supabase
      .from('kpis')
      .select('status')
      .eq('division', profile.division);
    if (!data) return;
    const s = { total: data.length, approved: 0, pending: 0, rejected: 0, achieved: 0 };
    data.forEach(k => { if (s[k.status] !== undefined) s[k.status]++; });
    setStats(s);
  }

  async function fetchPending() {
    const { data } = await supabase
      .from('kpis')
      .select('*, owner:profiles!kpis_owner_id_fkey(id, full_name, role)')
      .eq('division', profile.division)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });
    setPendingKPIs(data ?? []);
  }

  async function fetchTeam() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('division', profile.division)
      .eq('is_active', true)
      .neq('id', profile.id);
    setTeamMembers(data ?? []);
  }

  const chartData = stats ? [
    { name: 'Approved', value: stats.approved,  fill: '#27ae60' },
    { name: 'Pending',  value: stats.pending,   fill: '#f39c12' },
    { name: 'Achieved', value: stats.achieved,  fill: '#2980b9' },
    { name: 'Rejected', value: stats.rejected,  fill: '#e74c3c' },
  ] : [];

  return (
    <div className="page">
      <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>
        {profile?.role} · Division Head
      </p>
      <h1 className="page-title">{profile?.full_name}</h1>
      <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>{profile?.division}</p>

      {/* Division KPI chart */}
      {!loading && stats && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>Division KPI Overview</h3>
          <div style={styles.statRow}>
            <div style={styles.statBox}><p style={styles.statNum}>{stats.total}</p><p className="text-xs text-muted">Total</p></div>
            <div style={styles.statBox}><p style={{ ...styles.statNum, color: '#27ae60' }}>{stats.approved}</p><p className="text-xs text-muted">Approved</p></div>
            <div style={styles.statBox}><p style={{ ...styles.statNum, color: '#f39c12' }}>{stats.pending}</p><p className="text-xs text-muted">Pending</p></div>
            <div style={styles.statBox}><p style={{ ...styles.statNum, color: '#e74c3c' }}>{stats.rejected}</p><p className="text-xs text-muted">Rejected</p></div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {chartData.map((entry, i) => (
                  <React.Fragment key={i} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pending approvals */}
      {pendingKPIs.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: '10px' }}>
            🔔 Pending Approvals ({pendingKPIs.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingKPIs.map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} showOwner onPress={() => navigate('/kpis')} />
            ))}
          </div>
        </div>
      )}

      {/* Team members */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '10px' }}>
          Team ({teamMembers.length})
        </h3>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-muted">No team members yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {teamMembers.map(m => (
              <div key={m.id} style={styles.member}>
                <div style={styles.memberAvatar}>{m.full_name[0]}</div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{m.full_name}</p>
                  <p className="text-xs text-muted">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div style={styles.actionRow}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/kpis')}>🎯 All KPIs</button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/activities')}>📋 Activities</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize: '15px', fontWeight: '700' },
  statRow: { display: 'flex', gap: '8px', margin: '12px 0' },
  statBox: { flex: 1, textAlign: 'center', background: 'var(--bg-page)', borderRadius: '8px', padding: '8px 4px' },
  statNum: { fontSize: '22px', fontWeight: '800', color: 'var(--green-800)' },
  actionRow: { display: 'flex', gap: '10px' },
  member: { display: 'flex', alignItems: 'center', gap: '10px' },
  memberAvatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--green-100)', color: 'var(--green-800)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: '700', flexShrink: 0,
  },
};
