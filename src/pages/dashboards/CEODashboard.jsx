import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DIVISIONS, ROLES } from '../../utils/permissions';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = {
  approved:        '#27ae60',
  achieved:        '#2980b9',
  pending_approval:'#f39c12',
  rejected:        '#e74c3c',
  draft:           '#95a5a6',
  not_achieved:    '#c0392b',
};

export default function CEODashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [summary,   setSummary]   = useState({ total: 0, approved: 0, achieved: 0, pending: 0, rejected: 0 });
  const [pieData,   setPieData]   = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [orgStats,  setOrgStats]  = useState({ users: 0, divisions: DIVISIONS.length });
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([fetchSummary(), fetchTrend(), fetchOrgStats()])
      .finally(() => setLoading(false));
  }, [profile]);

  async function fetchSummary() {
    const { data } = await supabase.from('kpis').select('status');
    if (!data) return;
    const s = { total: data.length, approved: 0, achieved: 0, pending: 0, rejected: 0, draft: 0 };
    data.forEach(k => {
      if (k.status === 'approved')          s.approved++;
      else if (k.status === 'achieved')     s.achieved++;
      else if (k.status === 'pending_approval') s.pending++;
      else if (k.status === 'rejected')     s.rejected++;
      else                                  s.draft++;
    });
    setSummary(s);
    setPieData([
      { name: 'Approved',  value: s.approved,  color: STATUS_COLORS.approved },
      { name: 'Achieved',  value: s.achieved,  color: STATUS_COLORS.achieved },
      { name: 'Pending',   value: s.pending,   color: STATUS_COLORS.pending_approval },
      { name: 'Rejected',  value: s.rejected,  color: STATUS_COLORS.rejected },
      { name: 'Draft',     value: s.draft,     color: STATUS_COLORS.draft },
    ].filter(d => d.value > 0));
  }

  async function fetchTrend() {
    const { data } = await supabase
      .from('kpis')
      .select('created_at, status')
      .order('created_at', { ascending: true });
    if (!data) return;

    const byMonth = {};
    data.forEach(k => {
      const m = k.created_at.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { month: m, created: 0, approved: 0 };
      byMonth[m].created++;
      if (k.status === 'approved' || k.status === 'achieved') byMonth[m].approved++;
    });
    setTrendData(Object.values(byMonth).slice(-6));
  }

  async function fetchOrgStats() {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    setOrgStats(prev => ({ ...prev, users: count ?? 0 }));
  }

  const approvalRate = summary.total > 0
    ? Math.round(((summary.approved + summary.achieved) / summary.total) * 100)
    : 0;

  return (
    <div className="page">
      <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>CEO</p>
      <h1 className="page-title">{profile?.full_name}</h1>
      <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>Enterprise KPI Command Centre</p>

      {/* Top stats row */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total KPIs', value: summary.total, color: 'var(--green-800)' },
          { label: 'Approval Rate', value: `${approvalRate}%`, color: approvalRate >= 70 ? '#27ae60' : '#e67e22' },
          { label: 'Active Staff', value: orgStats.users, color: 'var(--green-700)' },
          { label: 'Divisions', value: orgStats.divisions, color: '#2980b9' },
        ].map(s => (
          <div key={s.label} className="card" style={styles.topStat}>
            <p style={{ ...styles.topStatNum, color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* KPI status pie */}
      {!loading && pieData.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>KPI Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend line */}
      {!loading && trendData.length > 1 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: '8px' }}>6-Month KPI Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="created"  stroke="#2980b9" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="approved" stroke="#27ae60" strokeWidth={2} dot={false} name="Approved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pending alert */}
      {summary.pending > 0 && (
        <div className="alert" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffc107', marginBottom: '16px' }}>
          ⚠️ {summary.pending} KPI{summary.pending > 1 ? 's' : ''} awaiting approval across all divisions.
        </div>
      )}

      <div className="card">
        <div style={styles.actionRow}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/kpis')}>🎯 All KPIs</button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/reports')}>📄 Reports</button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/notifications')}>🔔 Alerts</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
  topStat: { textAlign: 'center', padding: '12px 8px' },
  topStatNum: { fontSize: '26px', fontWeight: '800' },
  sectionTitle: { fontSize: '15px', fontWeight: '700' },
  actionRow: { display: 'flex', gap: '10px' },
};
