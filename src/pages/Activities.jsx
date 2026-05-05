import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Activities() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const titleRef = useRef();
  const descRef  = useRef();
  const dateRef  = useRef();
  const locRef   = useRef();

  useEffect(() => { fetchActivities(); }, [profile]);

  async function fetchActivities() {
    if (!profile) return;
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', profile.id)
      .order('activity_date', { ascending: false });
    setActivities(data ?? []);
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { error: err } = await supabase.from('activities').insert({
        user_id:       profile.id,
        title:         titleRef.current.value.trim(),
        description:   descRef.current.value.trim() || null,
        activity_date: dateRef.current.value || new Date().toISOString().slice(0, 10),
        location_name: locRef.current.value.trim() || null,
      });
      if (err) throw err;
      setShowForm(false);
      fetchActivities();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await supabase.from('activities').delete().eq('id', id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Field Activities</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Log Activity</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '80px' }} className="skeleton" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No activities logged yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>Log your first activity</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.map(a => (
            <div key={a.id} className="card" style={styles.actCard}>
              <div className="flex-between">
                <div style={{ flex: 1 }}>
                  <p style={styles.actTitle}>{a.title}</p>
                  {a.description && <p className="text-sm text-muted" style={{ marginTop: '2px' }}>{a.description}</p>}
                  <div style={styles.actMeta}>
                    <span className="text-xs text-muted">📅 {a.activity_date}</span>
                    {a.location_name && <span className="text-xs text-muted">📍 {a.location_name}</span>}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', padding: '4px 8px' }}
                  onClick={() => handleDelete(a.id)}
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create activity modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px' }}>Log Activity</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Title *</label>
                <input type="text" className="input" ref={titleRef} defaultValue="" required placeholder="What did you do?" />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea className="input" ref={descRef} defaultValue="" rows={3} style={{ resize: 'vertical' }} placeholder="Details…" />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Date</label>
                  <input type="date" className="input" ref={dateRef} defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input type="text" className="input" ref={locRef} defaultValue="" placeholder="e.g. Harare North" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Activity'}
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
  actCard: { display: 'flex', flexDirection: 'column', gap: '6px' },
  actTitle: { fontSize: '15px', fontWeight: '700' },
  actMeta: { display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' },
};
