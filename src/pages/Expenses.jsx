import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { supabase } from '../lib/supabase';
import { enqueue } from '../utils/offlineQueue';

const EXPENSE_TYPES = ['Fuel', 'Food & Accommodation', 'Branded Items', 'Inputs/Materials', 'Transport', 'Other'];
const PERIODS = ['day', 'week', 'month', 'year'];
const PERIOD_LABEL = { day: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' };

const CATEGORY_COLORS = {
  'Fuel':                  '#2980b9',
  'Food & Accommodation':  '#e67e22',
  'Branded Items':         '#8e44ad',
  'Inputs/Materials':      '#2d9e52',
  'Transport':             '#d4ac0d',
  'Other':                 '#7f8c8d',
};

function inPeriod(dateStr, period) {
  const d = new Date(dateStr);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  switch (period) {
    case 'day':
      return dateStr === todayStr;
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return d >= weekStart && d <= today;
    }
    case 'month':
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    case 'year':
      return d.getFullYear() === today.getFullYear();
    default:
      return true;
  }
}

export default function Expenses() {
  const { profile } = useAuth();
  const { pendingRecords, syncNow } = useOfflineSync(profile?.id, 'expenses');

  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expenseType, setExpenseType] = useState('Fuel');

  const dateRef   = useRef();
  const qtyRef    = useRef();
  const amountRef = useRef();
  const notesRef  = useRef();

  useEffect(() => { fetchExpenses(); }, [profile]);

  async function fetchExpenses() {
    if (!profile) return;
    const { data } = await supabase
      .from('expenses')
      .select('*, activity:activities(category, description)')
      .eq('user_id', profile.id)
      .order('expense_date', { ascending: false });
    setAllExpenses(data ?? []);
    setLoading(false);
  }

  const periodExpenses = useMemo(
    () => allExpenses.filter(e => inPeriod(e.expense_date, period)),
    [allExpenses, period]
  );

  const pendingInPeriod = useMemo(
    () => pendingRecords.filter(r => inPeriod(r.payload.expense_date, period)),
    [pendingRecords, period]
  );

  const total = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = useMemo(() => {
    const acc = {};
    periodExpenses.forEach(e => {
      const cat = e.category || 'Other';
      if (!acc[cat]) acc[cat] = { total: 0, count: 0, items: [] };
      acc[cat].total += Number(e.amount);
      acc[cat].count += 1;
      acc[cat].items.push(e);
    });
    return Object.entries(acc).sort((a, b) => b[1].total - a[1].total);
  }, [periodExpenses]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    const amount = parseFloat(amountRef.current.value);
    if (!amount || amount <= 0) { setError('Please enter a valid amount'); return; }
    setSaving(true);

    const payload = {
      user_id:      profile.id,
      description:  notesRef.current.value.trim() || expenseType,
      amount,
      category:     expenseType,
      quantity:     expenseType === 'Fuel' && qtyRef.current.value ? parseFloat(qtyRef.current.value) : null,
      unit:         expenseType === 'Fuel' ? 'Litres' : null,
      expense_date: dateRef.current.value || new Date().toISOString().slice(0, 10),
    };

    try {
      if (!navigator.onLine) throw new Error('offline');
      const { error: err } = await supabase.from('expenses').insert(payload);
      if (err) throw err;
      setShowForm(false);
      fetchExpenses();
    } catch {
      await enqueue('expenses', payload);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await supabase.from('expenses').delete().eq('id', id);
    setAllExpenses(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '12px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Expenses</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add Expense</button>
      </div>

      {pendingRecords.length > 0 && (
        <div className="alert" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffe69c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔌 {pendingRecords.length} item{pendingRecords.length > 1 ? 's' : ''} waiting to sync</span>
          <button className="btn btn-ghost btn-sm" style={{ color: '#856404' }} onClick={syncNow}>Sync now</button>
        </div>
      )}

      <div style={styles.tabs}>
        {PERIODS.map(p => (
          <button
            key={p}
            style={{ ...styles.tab, ...(period === p ? styles.tabActive : {}) }}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p className="text-sm text-muted">{PERIOD_LABEL[period]} Total</p>
        <p style={styles.totalNum}>${total.toFixed(2)}</p>
        <p className="text-xs text-muted">
          {periodExpenses.length} item{periodExpenses.length !== 1 ? 's' : ''}
          {pendingInPeriod.length > 0 && ` · ${pendingInPeriod.length} pending sync`}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2].map(i => <div key={i} style={{ height: '80px' }} className="skeleton" />)}
        </div>
      ) : byCategory.length === 0 && pendingInPeriod.length === 0 ? (
        <div className="empty-state">
          <div className="icon">💰</div>
          <p>No expenses recorded for {PERIOD_LABEL[period].toLowerCase()}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {byCategory.map(([category, data]) => {
            const pct = total > 0 ? (data.total / total * 100) : 0;
            const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
            return (
              <div key={category} className="card">
                <div className="flex-between" style={{ marginBottom: '6px' }}>
                  <div>
                    <p className="font-bold">{category}</p>
                    <p className="text-xs text-muted">{data.count} item{data.count > 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="font-bold" style={{ color: 'var(--green-800)' }}>${data.total.toFixed(2)}</p>
                    <p className="text-xs text-muted">{pct.toFixed(0)}%</p>
                  </div>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border)' }}>
                  <div style={{ height: '6px', borderRadius: '3px', width: `${pct}%`, background: color }} />
                </div>
                <div className="mt-12" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {data.items.map(item => (
                    <div key={item.id} className="flex-between text-xs" style={{ paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                      <div>
                        <span className="text-secondary">{item.expense_date}</span>
                        {item.quantity && <span className="text-muted"> · {item.quantity} {item.unit}</span>}
                        {item.activity?.category && <div className="text-muted">Linked: {item.activity.category}</div>}
                        {item.description && <div className="text-muted">{item.description}</div>}
                      </div>
                      <div className="flex gap-8" style={{ alignItems: 'center' }}>
                        <span className="font-bold">${Number(item.amount).toFixed(2)}</span>
                        <button onClick={() => handleDelete(item.id)} style={{ color: 'var(--danger)' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {pendingInPeriod.length > 0 && (
            <div className="card" style={{ background: '#fff3cd' }}>
              <p className="font-bold text-sm" style={{ marginBottom: '8px' }}>⏳ Pending Sync</p>
              {pendingInPeriod.map(r => (
                <div key={r.localId} className="flex-between text-xs" style={{ paddingTop: '6px' }}>
                  <span>{r.payload.category} · {r.payload.expense_date}</span>
                  <span className="font-bold">${Number(r.payload.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px' }}>Add Expense</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Type</label>
                <select className="input" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                  {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {expenseType === 'Fuel' && (
                <div className="field">
                  <label>Quantity (Litres)</label>
                  <input type="number" step="0.1" className="input" ref={qtyRef} defaultValue="" placeholder="0" />
                </div>
              )}
              <div className="field">
                <label>Amount (USD) *</label>
                <input type="number" step="0.01" className="input" ref={amountRef} defaultValue="" required placeholder="0.00" />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" className="input" ref={dateRef} defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="field">
                <label>Notes</label>
                <input type="text" className="input" ref={notesRef} defaultValue="" placeholder="Optional" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tabs: { display: 'flex', gap: '6px', marginBottom: '14px' },
  tab: {
    flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1.5px solid var(--border)',
    background: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-secondary)',
  },
  tabActive: { background: 'var(--green-800)', color: '#fff', borderColor: 'var(--green-800)' },
  totalNum: { fontSize: '32px', fontWeight: '800', color: 'var(--green-800)', margin: '4px 0' },
};
