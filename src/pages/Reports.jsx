import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useKPIs } from '../hooks/useKPIs';
import { supabase } from '../lib/supabase';
import { formatStatus } from '../utils/kpiCalculations';

const GREEN = [26, 92, 46];   // matches --green-800
const BLUE  = [41, 128, 185]; // matches --info
const DARK  = [26, 46, 30];   // matches --text-primary

const REPORT_TYPES = [
  { key: 'weekly',    label: 'Weekly Report',    icon: '📅', color: '#2980b9' },
  { key: 'monthly',   label: 'Monthly Report',   icon: '📊', color: '#1a5c2e' },
  { key: 'quarterly', label: 'Quarterly Report', icon: '📈', color: '#7c3aed' },
  { key: 'annual',    label: 'Annual Report',    icon: '📋', color: '#ea580c' },
];

function getPeriodRange(type) {
  const now = new Date();
  let start, label;

  if (type === 'weekly') {
    start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    label = `Week of ${start.toLocaleDateString()}`;
  } else if (type === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    label = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  } else if (type === 'quarterly') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    label = `Q${q + 1} ${now.getFullYear()}`;
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    label = `${now.getFullYear()}`;
  }

  return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10), label };
}

export default function Reports() {
  const { profile } = useAuth();
  const { kpis } = useKPIs({ owner_id: profile?.id });
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState('');

  const approvedKPIs = kpis.filter(k => k.status === 'approved' || k.status === 'achieved');

  async function generateReport(type) {
    setGenerating(type);
    setError('');
    try {
      const { start, end, label } = getPeriodRange(type);

      const [{ data: activities }, { data: expenses }] = await Promise.all([
        supabase.from('activities').select('*').eq('user_id', profile.id).gte('activity_date', start).lte('activity_date', end).order('activity_date'),
        supabase.from('expenses').select('*').eq('user_id', profile.id).gte('expense_date', start).lte('expense_date', end).order('expense_date'),
      ]);

      buildPDF({ type, label, activities: activities ?? [], expenses: expenses ?? [], approvedKPIs, profile });
    } catch (e) {
      setError(e.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Reports</h1>
      <p className="text-sm text-muted" style={{ marginTop: '-12px', marginBottom: '16px' }}>Generate professional PDF reports instantly</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {REPORT_TYPES.map(rt => (
          <div key={rt.key} className="card">
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div>
                <p className="font-bold">{rt.icon} {rt.label}</p>
                <p className="text-xs text-muted">{getPeriodRange(rt.key).label}</p>
              </div>
            </div>
            <button
              className="btn btn-full"
              style={{ background: rt.color, color: '#fff' }}
              disabled={generating !== null}
              onClick={() => generateReport(rt.key)}
            >
              {generating === rt.key ? 'Generating…' : '📤 Generate PDF Report'}
            </button>
          </div>
        ))}
      </div>

      <div className="card mt-16" style={{ background: 'var(--green-50)' }}>
        <p className="font-bold text-sm" style={{ marginBottom: '8px' }}>✨ Report Contents</p>
        <ul className="text-xs text-secondary" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>✓ Executive summary of the period</li>
          <li>✓ Activity breakdown by category</li>
          <li>✓ Full activity log with locations</li>
          <li>✓ Expense breakdown and totals</li>
          <li>✓ Current approved KPI scores</li>
        </ul>
      </div>
    </div>
  );
}

function buildPDF({ type, label, activities, expenses, approvedKPIs, profile }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  function addHeader() {
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('KUTSAGA RESEARCH STATION', pageWidth / 2, 10, { align: 'center' });
  }

  function addFootersToAllPages() {
    const count = doc.internal.getNumberOfPages();
    for (let i = 1; i <= count; i++) {
      doc.setPage(i);
      doc.setFillColor(...GREEN);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Page ${i} of ${count}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      doc.setFontSize(7);
      doc.text('For Productivity. For Sustainability', pageWidth - margin, pageHeight - 5, { align: 'right' });
    }
  }

  function ensureSpace(y, needed = 20) {
    if (y > pageHeight - needed) {
      doc.addPage();
      addHeader();
      return 25;
    }
    return y;
  }

  function writeParagraph(text, y, fontSize = 10) {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
      y = ensureSpace(y);
      doc.text(line, margin, y);
      y += fontSize * 0.5;
    });
    return y;
  }

  // ── Title page ──
  addHeader();
  let y = 30;
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.text('KUTSAGA', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...DARK);
  doc.text('For Productivity. For Sustainability', pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setDrawColor(...GREEN);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  const title = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' }[type] + ' Field Operations Report';
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFillColor(...GREEN);
  doc.roundedRect(margin, y, maxWidth, 22, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Reporting Period: ${label}`, pageWidth / 2, y + 9, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y + 17, { align: 'center' });
  y += 32;

  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.text(`Officer: ${profile?.full_name ?? ''}`, margin, y); y += 6;
  doc.text(`Role: ${profile?.role ?? ''}`, margin, y); y += 6;
  if (profile?.division) { doc.text(`Division: ${profile.division}`, margin, y); y += 6; }

  // ── Aggregation ──
  const categoryCounts = activities.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {});
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const expensesByCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + Number(e.amount); return acc; }, {});

  doc.addPage();
  addHeader();
  y = 25;

  // 1. Executive Summary
  y = sectionHeading(doc, '1.0 EXECUTIVE SUMMARY', y, margin, pageWidth);
  y = writeParagraph(
    `During ${label}, ${profile?.full_name ?? 'the officer'} logged ${activities.length} field ` +
    `activit${activities.length === 1 ? 'y' : 'ies'} across ${Object.keys(categoryCounts).length} categor${Object.keys(categoryCounts).length === 1 ? 'y' : 'ies'}. ` +
    `Total operational expenses for the period amounted to USD ${totalExpenses.toFixed(2)}.`,
    y
  );
  y += 8;

  // 2. Activity Breakdown
  y = ensureSpace(y);
  y = sectionHeading(doc, '2.0 ACTIVITY BREAKDOWN BY CATEGORY', y, margin, pageWidth);
  if (Object.keys(categoryCounts).length === 0) {
    y = writeParagraph('No activities logged during this period.', y);
  } else {
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      y = writeParagraph(`• ${cat}: ${count} activit${count === 1 ? 'y' : 'ies'}`, y);
    });
  }
  y += 8;

  // 3. Detailed Activity Log
  y = ensureSpace(y, 40);
  y = sectionHeading(doc, '3.0 DETAILED ACTIVITY LOG', y, margin, pageWidth);
  if (activities.length === 0) {
    y = writeParagraph('No activities to display.', y);
  } else {
    activities.forEach((a, idx) => {
      y = ensureSpace(y, 35);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text(`3.${idx + 1} ${a.category} — ${a.title}`, margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(`Date: ${a.activity_date}${a.location_name ? '  ·  Location: ' + a.location_name : ''}`, margin + 4, y);
      y += 5;
      if (a.description) {
        y = writeParagraph(a.description, y, 9);
      }
      y += 5;
    });
  }
  y += 4;

  // 4. Financial Summary
  y = ensureSpace(y, 40);
  y = sectionHeading(doc, '4.0 FINANCIAL SUMMARY', y, margin, pageWidth);
  y = writeParagraph(`Total Expenditure: USD ${totalExpenses.toFixed(2)}`, y);
  y += 3;
  if (Object.keys(expensesByCategory).length === 0) {
    y = writeParagraph('No expenses recorded.', y);
  } else {
    Object.entries(expensesByCategory).forEach(([cat, amt]) => {
      const pct = totalExpenses > 0 ? (amt / totalExpenses * 100).toFixed(1) : '0';
      y = writeParagraph(`• ${cat}: USD ${amt.toFixed(2)} (${pct}%)`, y);
    });
  }
  y += 8;

  // 5. KPI Snapshot
  y = ensureSpace(y, 30);
  y = sectionHeading(doc, '5.0 KPI SNAPSHOT', y, margin, pageWidth);
  if (approvedKPIs.length === 0) {
    y = writeParagraph('No approved KPIs on record.', y);
  } else {
    approvedKPIs.forEach(k => {
      const score = k.latest_score != null ? `${k.latest_score}/6` : 'Not yet scored';
      y = writeParagraph(`• ${k.title} (${formatStatus(k.status)}) — Weight ${k.weight}% — Latest score: ${score}`, y);
    });
  }
  y += 8;

  // 6. Recommendations
  y = ensureSpace(y, 30);
  y = sectionHeading(doc, '6.0 RECOMMENDATIONS', y, margin, pageWidth);
  y = writeParagraph(
    '1. Continue regular grower engagement to strengthen extension services.\n' +
    '2. Maintain current activity levels across all program areas.\n' +
    '3. Monitor budget utilization to ensure alignment with institutional targets.\n' +
    '4. Document all outcomes and impacts for future reporting cycles.',
    y
  );

  addFootersToAllPages();
  doc.save(`Kutsaga_${type}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function sectionHeading(doc, text, y, margin, pageWidth) {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.text(text, margin, y);
  y += 6;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  return y + 8;
}
