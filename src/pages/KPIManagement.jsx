import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useKPIs } from '../hooks/useKPIs';
import KPICard from '../components/kpi/KPICard';
import KPIForm from '../components/kpi/KPIForm';
import KPIComments from '../components/kpi/KPIComments';
import { canApproveKPI } from '../utils/permissions';
import { formatStatus } from '../utils/kpiCalculations';

const STATUS_FILTERS = ['all', 'draft', 'pending_approval', 'approved', 'rejected', 'achieved'];

export default function KPIManagement() {
  const { profile } = useAuth();
  const { kpis, loading, createKPI, updateKPI, submitForApproval, approveKPI, rejectKPI, reportProgress } = useKPIs();

  const [filter,        setFilter]        = useState('all');
  const [showCreateModal, setShowCreate]  = useState(false);
  const [selectedKPI,   setSelectedKPI]  = useState(null);
  const [scoreInput,    setScoreInput]    = useState('');
  const [scoreNotes,    setScoreNotes]    = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState('');

  const filtered = filter === 'all' ? kpis : kpis.filter(k => k.status === filter);

  async function handleCreate(values) {
    await createKPI(values);
    setShowCreate(false);
  }

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

  async function handleSubmitForApproval() {
    setActionLoading(true);
    setActionError('');
    try {
      await submitForApproval(selectedKPI.id);
      setSelectedKPI(prev => prev ? { ...prev, status: 'pending_approval' } : null);
    } catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleReportScore() {
    const score = parseFloat(scoreInput);
    if (isNaN(score) || score < 1 || score > 6) { setActionError('Score must be between 1 and 6.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await reportProgress(selectedKPI.id, score, scoreNotes);
      setScoreInput('');
      setScoreNotes('');
    } catch (e) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  const isOwner      = selectedKPI?.owner_id === profile?.id;
  const canApprove   = selectedKPI && canApproveKPI(profile?.role, selectedKPI.owner?.role);

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '12px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>KPI Management</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ New KPI</button>
      </div>

      {/* Status filter tabs */}
      <div style={styles.tabs}>
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            style={{ ...styles.tab, ...(filter === s ? styles.tabActive : {}) }}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : formatStatus(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: '100px' }} className="skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎯</div>
          <p>No KPIs found for "{filter === 'all' ? 'all' : formatStatus(filter)}".</p>
          {filter === 'all' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create your first KPI</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(kpi => (
            <KPICard
              key={kpi.id}
              kpi={kpi}
              showOwner={kpi.owner_id !== profile?.id}
              onPress={() => { setSelectedKPI(kpi); setActionError(''); setRejectComment(''); setScoreInput(''); setScoreNotes(''); }}
            />
          ))}
        </div>
      )}

      {/* Create KPI modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={styles.modalTitle}>Create KPI</h3>
            <KPIForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
          </div>
        </div>
      )}

      {/* KPI detail modal */}
      {selectedKPI && (
        <div className="modal-overlay" onClick={() => setSelectedKPI(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <h3 style={styles.modalTitle}>{selectedKPI.title}</h3>
              <span className={`badge badge-${selectedKPI.status}`}>{formatStatus(selectedKPI.status)}</span>
            </div>

            {selectedKPI.description && (
              <p className="text-sm text-secondary" style={{ marginBottom: '12px' }}>{selectedKPI.description}</p>
            )}

            <div style={styles.detailGrid}>
              <div><p className="text-xs text-muted">Weight</p><p style={styles.detailVal}>{selectedKPI.weight}%</p></div>
              {selectedKPI.target && <div><p className="text-xs text-muted">Target</p><p style={styles.detailVal}>{selectedKPI.target}</p></div>}
              {selectedKPI.period_start && <div><p className="text-xs text-muted">Start</p><p style={styles.detailVal}>{selectedKPI.period_start}</p></div>}
              {selectedKPI.period_end && <div><p className="text-xs text-muted">End</p><p style={styles.detailVal}>{selectedKPI.period_end}</p></div>}
            </div>

            {actionError && <div className="alert alert-error">{actionError}</div>}

            {/* Owner actions */}
            {isOwner && selectedKPI.status === 'draft' && (
              <button className="btn btn-primary btn-full" style={{ marginBottom: '8px' }} onClick={handleSubmitForApproval} disabled={actionLoading}>
                {actionLoading ? 'Submitting…' : '📤 Submit for Approval'}
              </button>
            )}

            {/* Progress reporting for approved KPIs */}
            {isOwner && (selectedKPI.status === 'approved' || selectedKPI.status === 'achieved') && (
              <div className="card" style={{ marginBottom: '12px', background: 'var(--green-50)' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Report Progress</p>
                <div className="grid-2" style={{ marginBottom: '8px' }}>
                  <div className="field">
                    <label>Score (1–6)</label>
                    <input
                      type="number"
                      className="input"
                      value={scoreInput}
                      onChange={e => setScoreInput(e.target.value)}
                      min="1" max="6" step="0.1"
                      placeholder="e.g. 4.5"
                    />
                  </div>
                  <div className="field">
                    <label>Notes</label>
                    <input
                      type="text"
                      className="input"
                      value={scoreNotes}
                      onChange={e => setScoreNotes(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm btn-full" onClick={handleReportScore} disabled={actionLoading}>
                  {actionLoading ? 'Saving…' : 'Save Score'}
                </button>
              </div>
            )}

            {/* Manager approve/reject */}
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
  tabs: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '8px',
    marginBottom: '14px',
    scrollbarWidth: 'none',
  },
  tab: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1.5px solid var(--border)',
    background: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
  },
  tabActive: {
    background: 'var(--green-800)',
    color: '#fff',
    borderColor: 'var(--green-800)',
  },
  modalTitle: { fontSize: '17px', fontWeight: '700' },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '14px',
    background: 'var(--bg-page)',
    borderRadius: '8px',
    padding: '10px',
  },
  detailVal: { fontSize: '15px', fontWeight: '700', marginTop: '2px' },
};
