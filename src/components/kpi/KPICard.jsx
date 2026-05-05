import React from 'react';
import { getScoreColor, getProgressPct, formatStatus } from '../../utils/kpiCalculations';

export default function KPICard({ kpi, onPress, showOwner = false }) {
  const score = kpi.latest_score;
  const pct   = score ? getProgressPct(score) : 0;

  return (
    <div className="card" style={styles.card} onClick={onPress}>
      <div style={styles.top}>
        <div style={styles.titleWrap}>
          <p style={styles.title}>{kpi.title}</p>
          {showOwner && kpi.owner && (
            <p style={styles.owner}>{kpi.owner.full_name} · {kpi.owner.division}</p>
          )}
        </div>
        <span className={`badge badge-${kpi.status}`}>{formatStatus(kpi.status)}</span>
      </div>

      <div style={styles.meta}>
        <span style={styles.metaItem}>⚖️ Weight: <b>{kpi.weight}%</b></span>
        {kpi.target && (
          <span style={styles.metaItem}>🎯 Target: <b>{kpi.target}</b></span>
        )}
      </div>

      {score !== null && score !== undefined && (
        <div style={styles.scoreSection}>
          <div style={styles.scoreRow}>
            <span style={styles.scoreLabel}>Latest score</span>
            <span style={{ ...styles.scoreValue, color: getScoreColor(score) }}>
              {score} / 6
            </span>
          </div>
          <div style={styles.barTrack}>
            <div style={{
              ...styles.barFill,
              width: `${pct}%`,
              background: getScoreColor(score),
            }} />
          </div>
        </div>
      )}

      {kpi.description && (
        <p style={styles.desc} className="text-sm text-muted">{kpi.description}</p>
      )}
    </div>
  );
}

const styles = {
  card: { cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' },
  titleWrap: { flex: 1 },
  title: { fontSize: '15px', fontWeight: '700', lineHeight: 1.3 },
  owner: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  meta: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  metaItem: { fontSize: '13px', color: 'var(--text-secondary)' },
  scoreSection: { display: 'flex', flexDirection: 'column', gap: '6px' },
  scoreRow: { display: 'flex', justifyContent: 'space-between' },
  scoreLabel: { fontSize: '12px', color: 'var(--text-muted)' },
  scoreValue: { fontSize: '14px', fontWeight: '700' },
  barTrack: { height: '6px', background: '#e8e8e8', borderRadius: '3px', overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: '3px', transition: 'width 0.4s ease' },
  desc: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
};
