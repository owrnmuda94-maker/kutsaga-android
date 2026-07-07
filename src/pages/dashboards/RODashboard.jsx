import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useKPIs } from '../../hooks/useKPIs';
import { supabase } from '../../lib/supabase';
import KPICard from '../../components/kpi/KPICard';
import { calcAggregatedScore, getScoreColor } from '../../utils/kpiCalculations';

export default function RODashboard() {
  const { profile } = useAuth();
  const { kpis: myKPIs, loading } = useKPIs({ owner_id: profile?.id });
  const [pendingKPIs, setPendingKPIs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('kpis')
      .select('*, owner:profiles!kpis_owner_id_fkey(id, full_name, role)')
      .eq('status', 'pending_approval')
      .eq('division', profile.division)
      .neq('owner_id', profile.id)
      .then(({ data }) => setPendingKPIs(data ?? []));
  }, [profile]);

  const score = calcAggregatedScore(myKPIs.filter(k => k.latest_score));

  return (
    <div className="page">
      <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Research Officer</p>
      <h1 className="page-title">{profile?.full_name}</h1>
      <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>{profile?.division}</p>

      <div className="card" style={styles.scoreCard}>
        <p style={styles.scoreLabel}>My KPI Score</p>
        <p style={styles.scoreNum}>{score}%</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{myKPIs.length} KPIs</p>
      </div>

      {pendingKPIs.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>🔔 Awaiting Your Review ({pendingKPIs.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {pendingKPIs.map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} showOwner onPress={() => navigate('/kpis')} />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <h3 style={styles.sectionTitle}>My KPIs</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/kpis')}>View all →</button>
        </div>
        {loading ? (
          <div style={{ height: '80px' }} className="skeleton" />
        ) : myKPIs.length === 0 ? (
          <div className="empty-state"><div className="icon">🎯</div><p>No KPIs yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myKPIs.slice(0, 3).map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} onPress={() => navigate('/kpis')} />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="grid-2">
          <button className="btn btn-primary" onClick={() => navigate('/kpis')}>🎯 KPIs</button>
          <button className="btn btn-secondary" onClick={() => navigate('/activities')}>📋 Activities</button>
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
  scoreNum: { fontSize: '40px', fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: '16px', fontWeight: '700' },
  actionRow: { display: 'flex', gap: '10px' },
};
