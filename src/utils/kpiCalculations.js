export function calcWeightedScore(rawScore, weight) {
  return ((weight / 100) * rawScore).toFixed(2);
}

export function calcAggregatedScore(kpis) {
  if (!kpis?.length) return 0;
  const totalWeight = kpis.reduce((s, k) => s + Number(k.weight), 0);
  if (totalWeight === 0) return 0;
  const weightedSum = kpis.reduce((s, k) => {
    const score = k.latest_score ?? 0;
    return s + (Number(k.weight) / 100) * score;
  }, 0);
  return ((weightedSum / totalWeight) * 100).toFixed(1);
}

export function getScoreColor(score) {
  if (score >= 5) return '#27ae60';
  if (score >= 3.5) return '#f39c12';
  return '#e74c3c';
}

export function getScoreLabel(score) {
  if (score >= 5.5) return 'Exceptional';
  if (score >= 4.5) return 'Exceeds Expectations';
  if (score >= 3.5) return 'Meets Expectations';
  if (score >= 2.5) return 'Partially Meets';
  if (score >= 1.5) return 'Below Expectations';
  return 'Unsatisfactory';
}

export function getProgressPct(rawScore) {
  return Math.round(((rawScore - 1) / 5) * 100);
}

export function formatStatus(status) {
  const map = {
    draft:           'Draft',
    pending_approval: 'Pending Approval',
    approved:        'Approved',
    rejected:        'Rejected',
    achieved:        'Achieved',
    not_achieved:    'Not Achieved',
  };
  return map[status] ?? status;
}
