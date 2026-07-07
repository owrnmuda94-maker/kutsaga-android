import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useKPIs } from '../../hooks/useKPIs';
import { calcAggregatedScore, getScoreColor, formatStatus } from '../../utils/kpiCalculations';
import KPICard from '../../components/kpi/KPICard';

export default function TODashboard() {
  const { profile } = useAuth();
  const { kpis, loading } = useKPIs({ owner_id: profile?.id });
  const navigate = useNavigate();

  const approved = kpis.filter(k => k.status === 'approved' || k.status === 'achieved');
  const pending  = kpis.filter(k => k.status === 'pending_approval');
  const score    = calcAggregatedScore(kpis.filter(k => k.latest_score));

  return (
    <div className="page">
      <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Welcome back,</p>
      <h1 className="page-title" style={{ marginBottom: '4px' }}>{profile?.full_name}</h1>
      <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>
        {profile?.role} · {profile?.division}
      </p>

      {/* Score card */}
      <div className="card" style={styles.scoreCard}>
        <p style={styles.scoreLabel}>Overall KPI Score</p>
        <p style={{ ...styles.scoreNum, color: getScoreColor(parseFloat(score) * 6 / 100) }}>
          {score}%
        </p>
        <p className="text-xs text-muted">{kpis.length} KPIs total</p>
      </div>

      {/* Quick stats */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="card" style={styles.stat}>
          <p style={styles.statNum}>{approved.length}</p>
          <p className="text-xs text-muted">Approved</p>
        </div>
        <div className="card" style={styles.stat}>
          <p style={{ ...styles.statNum, color: pending.length > 0 ? '#e67e22' : 'inherit' }}>
            {pending.length}
          </p>
          <p className="text-xs text-muted">Awaiting Approval</p>
        </div>
      </div>

      {/* Recent KPIs */}
      <div style={styles.section}>
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <h3 style={styles.sectionTitle}>My KPIs</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/kpis')}>
            View all →
          </button>
        </div>

        {loading ? (
          <div style={styles.skeleton} className="skeleton" />
        ) : kpis.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎯</div>
            <p>No KPIs yet. Create your first one!</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/kpis')}>
              Create KPI
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {kpis.slice(0, 3).map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} onPress={() => navigate('/kpis')} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card" style={styles.actions}>
        <h3 style={styles.sectionTitle}>Quick Actions</h3>
        <div className="grid-2 mt-12">
          <button className="btn btn-primary" onClick={() => navigate('/kpis')}>🎯 Manage KPIs</button>
          <button className="btn btn-secondary" onClick={() => navigate('/activities')}>📋 Log Activity</button>
          <button className="btn btn-secondary" onClick={() => navigate('/expenses')}>💰 Expenses</button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>📄 Reports</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  scoreCard: { textAlign: 'center', marginBottom: '16px', background: 'var(--green-800)', color: '#fff', border: 'none' },
  scoreLabel: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' },
  scoreNum: { fontSize: '42px', fontWeight: '800', color: '#fff' },
  stat: { textAlign: 'center' },
  statNum: { fontSize: '28px', fontWeight: '800', color: 'var(--green-800)' },
  section: { marginBottom: '16px' },
  sectionTitle: { fontSize: '16px', fontWeight: '700' },
  skeleton: { height: '80px', borderRadius: '12px' },
  actions: { marginBottom: '8px' },
  actionRow: { display: 'flex', gap: '10px', marginTop: '12px' },
};
