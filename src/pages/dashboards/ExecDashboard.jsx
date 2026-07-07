import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DIVISIONS } from '../../utils/permissions';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

export default function ExecDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [divisionData, setDivisionData] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([fetchDivisionSummary(), fetchPendingCount()])
      .finally(() => setLoading(false));
  }, [profile]);

  async function fetchDivisionSummary() {
    const { data } = await supabase
      .from('kpis')
      .select('division, status');
    if (!data) return;

    const map = {};
    DIVISIONS.forEach(d => { map[d] = { division: d, approved: 0, pending: 0, achieved: 0, total: 0 }; });
    data.forEach(k => {
      if (!k.division || !map[k.division]) return;
      map[k.division].total++;
      if (k.status === 'approved')         map[k.division].approved++;
      if (k.status === 'pending_approval') map[k.division].pending++;
      if (k.status === 'achieved')         map[k.division].achieved++;
    });
    setDivisionData(Object.values(map));
  }

  async function fetchPendingCount() {
    const { count } = await supabase
      .from('kpis')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_approval');
    setPendingCount(count ?? 0);
  }

  const radarData = divisionData.map(d => ({
    division: d.division.split(' ').slice(0, 2).join(' '),
    approved: d.approved,
    achieved: d.achieved,
  }));

  const totalKPIs    = divisionData.reduce((s, d) => s + d.total, 0);
  const totalApproved = divisionData.reduce((s, d) => s + d.approved, 0);

  return (
    <div className="page">
      <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Executive Director</p>
      <h1 className="page-title">{profile?.full_name}</h1>
      <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>Organisation-wide Overview</p>

      {/* Summary stats */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={styles.bigNum}>{totalKPIs}</p>
          <p className="text-xs text-muted">Total KPIs</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ ...styles.bigNum, color: '#f39c12' }}>{pendingCount}</p>
          <p className="text-xs text-muted">Awaiting Approval</p>
        </div>
      </div>

      {/* Division bar chart */}
      {!loading && divisionData.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>KPIs by Division</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={divisionData} margin={{ top: 8, right: 8, left: -24, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="division" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v, name) => [v, name]} labelFormatter={l => l} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="approved" name="Approved" fill="#27ae60" radius={[3,3,0,0]} />
              <Bar dataKey="pending"  name="Pending"  fill="#f39c12" radius={[3,3,0,0]} />
              <Bar dataKey="achieved" name="Achieved" fill="#2980b9" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Radar overview */}
      {!loading && radarData.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: '8px' }}>Division Performance Radar</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="division" tick={{ fontSize: 9 }} />
              <Radar name="Approved" dataKey="approved" stroke="#27ae60" fill="#27ae60" fillOpacity={0.3} />
              <Radar name="Achieved" dataKey="achieved" stroke="#2980b9" fill="#2980b9" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="grid-2">
          <button className="btn btn-primary" onClick={() => navigate('/kpis')}>🎯 All KPIs</button>
          <button className="btn btn-secondary" onClick={() => navigate('/activities')}>📋 Activities</button>
          <button className="btn btn-secondary" onClick={() => navigate('/expenses')}>💰 Expenses</button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>📄 Reports</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bigNum: { fontSize: '32px', fontWeight: '800', color: 'var(--green-800)' },
  sectionTitle: { fontSize: '15px', fontWeight: '700', marginBottom: '4px' },
  actionRow: { display: 'flex', gap: '10px' },
};
