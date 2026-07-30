import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useKPIs } from '../../hooks/useKPIs';
import { supabase } from '../../lib/supabase';
import { calcAggregatedScore, getScoreColor } from '../../utils/kpiCalculations';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const AT_RISK_THRESHOLD = 3.5;

export default function HODDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { kpis: divisionKPIs, loading: kpisLoading } = useKPIs({ division: profile?.division });
  const [teamMembers, setTeamMembers] = useState([]);
  const [weeklyActivityCount, setWeeklyActivityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([fetchTeam(), fetchWeeklyActivity()]).finally(() => setLoading(false));
  }, [profile]);

  async function fetchTeam() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('division', profile.division)
      .eq('is_active', true)
      .neq('id', profile.id);
    setTeamMembers(data ?? []);
  }

  async function fetchWeeklyActivity() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const { count } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .gte('activity_date', weekStart.toISOString().slice(0, 10));
    setWeeklyActivityCount(count ?? 0);
  }

  const memberScores = useMemo(() => {
    const byOwner = {};
    divisionKPIs.forEach(k => {
      (byOwner[k.owner_id] ??= []).push(k);
    });
    return teamMembers
      .map(m => {
        const memberKPIs = byOwner[m.id] || [];
        const scored = memberKPIs.filter(k => k.latest_score != null);
        return {
          ...m,
          kpiCount: memberKPIs.length,
          score: scored.length ? Number(calcAggregatedScore(scored)) : null,
        };
      })
      .sort((a, b) => (a.score ?? -1) - (b.score ?? -1));
  }, [divisionKPIs, teamMembers]);

  const scoredMembers = memberScores.filter(m => m.score != null);
  const divisionAvg = scoredMembers.length
    ? Math.round(scoredMembers.reduce((s, m) => s + m.score, 0) / scoredMembers.length)
    : null;

  const distribution = useMemo(() => {
    const scored = divisionKPIs.filter(k => k.latest_score != null);
    const onTrack  = scored.filter(k => k.latest_score >= AT_RISK_THRESHOLD).length;
    const atRisk   = scored.filter(k => k.latest_score < AT_RISK_THRESHOLD).length;
    const unscored = divisionKPIs.length - scored.length;
    return { onTrack, atRisk, unscored };
  }, [divisionKPIs]);

  const atRiskKPIs = useMemo(() => (
    divisionKPIs
      .filter(k => k.latest_score != null && k.latest_score < AT_RISK_THRESHOLD)
      .sort((a, b) => a.latest_score - b.latest_score)
      .slice(0, 5)
  ), [divisionKPIs]);

  const chartData = memberScores
    .filter(m => m.score != null)
    .map(m => ({ name: m.full_name.split(' ')[0], score: m.score, fill: getScoreColor(m.score * 6 / 100) }));

  const isLoading = loading || kpisLoading;

  return (
    <div className="page">
      <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>
        {profile?.role} · Division Head
      </p>
      <h1 className="page-title">{profile?.full_name}</h1>
      <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>{profile?.division}</p>

      {/* Division attainment headline */}
      <div className="card" style={styles.scoreCard}>
        <p style={styles.scoreLabel}>Division KPI Attainment</p>
        <p style={styles.scoreNum}>{divisionAvg != null ? `${divisionAvg}%` : '—'}</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Average across {scoredMembers.length} scored team member{scoredMembers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Performance distribution + engagement */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="card" style={styles.statBox}>
          <p style={{ ...styles.statNum, color: '#27ae60' }}>{distribution.onTrack}</p>
          <p className="text-xs text-muted">KPIs On Track</p>
        </div>
        <div className="card" style={styles.statBox}>
          <p style={{ ...styles.statNum, color: '#e74c3c' }}>{distribution.atRisk}</p>
          <p className="text-xs text-muted">KPIs At Risk</p>
        </div>
        <div className="card" style={styles.statBox}>
          <p style={{ ...styles.statNum, color: '#95a5a6' }}>{distribution.unscored}</p>
          <p className="text-xs text-muted">Not Yet Scored</p>
        </div>
        <div className="card" style={styles.statBox}>
          <p style={{ ...styles.statNum, color: 'var(--green-800)' }}>{weeklyActivityCount}</p>
          <p className="text-xs text-muted">Activities This Week</p>
        </div>
      </div>

      {/* Per-member score chart, worst-first */}
      {!isLoading && chartData.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>Team Attainment (lowest first)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* At-risk KPIs shortlist */}
      {atRiskKPIs.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: '10px' }}>⚠️ KPIs Needing Attention</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {atRiskKPIs.map(k => (
              <div
                key={k.id}
                className="card"
                style={{ ...styles.riskRow, cursor: 'pointer' }}
                onClick={() => navigate(`/team/${k.owner_id}`)}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '700' }}>{k.title}</p>
                  <p className="text-xs text-muted">{k.owner?.full_name}</p>
                </div>
                <span style={{ fontWeight: '800', color: getScoreColor(k.latest_score) }}>{k.latest_score}/6</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team members — clickable drill-down */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '10px' }}>
          Team ({teamMembers.length})
        </h3>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-muted">No team members yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {memberScores.map(m => (
              <div key={m.id} style={styles.member} onClick={() => navigate(`/team/${m.id}`)}>
                <div style={styles.memberAvatar}>{m.full_name[0]}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{m.full_name}</p>
                  <p className="text-xs text-muted">{m.role} · {m.kpiCount} KPI{m.kpiCount !== 1 ? 's' : ''}</p>
                </div>
                <span
                  style={{
                    ...styles.scorePill,
                    background: m.score != null ? getScoreColor(m.score * 6 / 100) : '#e0e0e0',
                    color: m.score != null ? '#fff' : '#666',
                  }}
                >
                  {m.score != null ? `${m.score}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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
  scoreCard: { textAlign: 'center', marginBottom: '16px', background: 'var(--green-800)', color: '#fff', border: 'none' },
  scoreLabel: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' },
  scoreNum: { fontSize: '40px', fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: '15px', fontWeight: '700' },
  statBox: { textAlign: 'center', padding: '12px 8px' },
  statNum: { fontSize: '24px', fontWeight: '800' },
  riskRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' },
  member: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' },
  memberAvatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--green-100)', color: 'var(--green-800)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: '700', flexShrink: 0,
  },
  scorePill: {
    fontSize: '12px', fontWeight: '700', borderRadius: '12px', padding: '3px 10px', flexShrink: 0,
  },
};
