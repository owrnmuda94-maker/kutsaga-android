import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useKPIs } from '../hooks/useKPIs';
import { supabase } from '../lib/supabase';
import KPICard from '../components/kpi/KPICard';
import KPIComments from '../components/kpi/KPIComments';
import { canApproveKPI } from '../utils/permissions';
import { calcAggregatedScore, formatStatus } from '../utils/kpiCalculations';

export default function TeamMemberDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { kpis, loading: kpisLoading, approveKPI, rejectKPI } = useKPIs({ owner_id: userId });

  const [member, setMember] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [selectedKPI, setSelectedKPI] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', userId).single()
      .then(({ data }) => setMember(data ?? null));
  }, [userId]);

  useEffect(() => {
    setActivitiesLoading(true);
    supabase.from('activities').select('*').eq('user_id', userId)
      .order('activity_date', { ascending: false }).limit(30)
      .then(({ data }) => { setActivities(data ?? []); setActivitiesLoading(false); });

    supabase.from('expenses').select('amount').eq('user_id', userId)
      .then(({ data }) => setTotalExpenses((data ?? []).reduce((s, e) => s + Number(e.amount), 0)));
  }, [userId]);

  const score = calcAggregatedScore(kpis.filter(k => k.latest_score));
  const canApprove = selectedKPI && canApproveKPI(profile?.role, member?.role);

  async function handleApprove() {
    setActionLoading(true);
    setActionError('');
    try {
      await approveKPI(selectedKPI.id);
      setSelectedKPI(null);
    } catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleReject() {
    if (!rejectComment.trim()) { setActionError('Please provide a rejection reason.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await rejectKPI(selectedKPI.id, rejectComment);
      setSelectedKPI(null);
    } catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  if (!member) return <div className="page"><div className="skeleton" style={{ height: '120px' }} /></div>;

  return (
    <div className="page">
      <div className="flex" style={{ alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={styles.avatar}>{member.full_name[0].toUpperCase()}</div>
        <p style={{ fontSize: '18px', fontWeight: '800', marginTop: '8px' }}>{member.full_name}</p>
        <p className="text-sm text-secondary">{member.role} · {member.division}</p>
      </div>

      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={styles.statNum}>{score}%</p>
          <p className="text-xs text-muted">KPI Attainment</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={styles.statNum}>{kpis.length}</p>
          <p className="text-xs text-muted">KPIs</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={styles.statNum}>{activities.length}</p>
          <p className="text-xs text-muted">Recent Activities</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={styles.statNum}>${totalExpenses.toFixed(0)}</p>
          <p className="text-xs text-muted">Total Expenses</p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={styles.sectionTitle}>KPIs</h3>
        {kpisLoading ? (
          <div className="skeleton" style={{ height: '80px', marginTop: '10px' }} />
        ) : kpis.length === 0 ? (
          <div className="empty-state"><div className="icon">🎯</div><p>No KPIs yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {kpis.map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} onPress={() => { setSelectedKPI(kpi); setActionError(''); setRejectComment(''); }} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={styles.sectionTitle}>Recent Activities</h3>
        {activitiesLoading ? (
          <div className="skeleton" style={{ height: '80px', marginTop: '10px' }} />
        ) : activities.length === 0 ? (
          <div className="empty-state"><div className="icon">📋</div><p>No activities logged yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {activities.map(a => (
              <div key={a.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="flex-between">
                  <span className="text-xs font-bold" style={{ color: 'var(--green-800)' }}>{a.category}</span>
                  <span className="text-xs text-muted">📅 {a.activity_date}</span>
                </div>
                <p style={{ fontSize: '15px', fontWeight: '700' }}>{a.title}</p>
                {a.description && <p className="text-sm text-muted">{a.description}</p>}
                {a.photo_urls?.length > 0 && (
                  <div className="flex gap-8">
                    {a.photo_urls.map((url, i) => (
                      <img key={i} src={url} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px' }} />
                    ))}
                  </div>
                )}
                {a.location_name && <span className="text-xs text-muted">📍 {a.location_name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedKPI && (
        <div className="modal-overlay" onClick={() => setSelectedKPI(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700' }}>{selectedKPI.title}</h3>
              <span className={`badge badge-${selectedKPI.status}`}>{formatStatus(selectedKPI.status)}</span>
            </div>

            {selectedKPI.description && (
              <p className="text-sm text-secondary" style={{ marginBottom: '12px' }}>{selectedKPI.description}</p>
            )}

            <div style={styles.detailGrid}>
              <div><p className="text-xs text-muted">Weight</p><p style={styles.detailVal}>{selectedKPI.weight}%</p></div>
              {selectedKPI.target && <div><p className="text-xs text-muted">Target</p><p style={styles.detailVal}>{selectedKPI.target}</p></div>}
            </div>

            {actionError && <div className="alert alert-error">{actionError}</div>}

            {canApprove && selectedKPI.status === 'pending_approval' && (
              <div style={{ marginBottom: '12px' }}>
                <div className="field" style={{ marginBottom: '8px' }}>
                  <label>Rejection reason (required if rejecting)</label>
                  <input
                    type="text"
                    className="input"
                    value={rejectComment}
                    onChange={e => setRejectComment(e.target.value)}
                    placeholder="Explain why…"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApprove} disabled={actionLoading}>
                    ✅ Approve
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject} disabled={actionLoading}>
                    ❌ Reject
                  </button>
                </div>
              </div>
            )}

            <KPIComments kpiId={selectedKPI.id} />

            <button className="btn btn-secondary btn-full" style={{ marginTop: '12px' }} onClick={() => setSelectedKPI(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  avatar: {
    width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-800)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800',
    margin: '0 auto',
  },
  statNum: { fontSize: '24px', fontWeight: '800', color: 'var(--green-800)' },
  sectionTitle: { fontSize: '16px', fontWeight: '700' },
  detailGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px',
    background: 'var(--bg-page)', borderRadius: '8px', padding: '10px',
  },
  detailVal: { fontSize: '15px', fontWeight: '700', marginTop: '2px' },
};
