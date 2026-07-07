import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useKPIs } from '../hooks/useKPIs';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { supabase } from '../lib/supabase';
import { enqueue } from '../utils/offlineQueue';

const CATEGORIES = [
  'Grower Interactions',
  'Site Visits',
  'Trainings',
  'Trials / Experiments',
  'Demonstrations',
  'Meetings',
  'Administration',
  'Other',
];

const EXPENSE_TYPES = ['Fuel', 'Food & Accommodation', 'Branded Items', 'Inputs/Materials', 'Transport', 'Other'];

export default function Activities() {
  const { profile } = useAuth();
  const { kpis } = useKPIs({ owner_id: profile?.id });
  const { pendingRecords, syncNow } = useOfflineSync(profile?.id, 'activities');

  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const titleRef    = useRef();
  const descRef     = useRef();
  const dateRef     = useRef();
  const expNotesRef = useRef();
  const expQtyRef   = useRef();
  const expAmountRef= useRef();
  const hasGeocodedRef = useRef(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [linkedKpiId, setLinkedKpiId] = useState('');
  const [location, setLocation] = useState('Detecting location…');
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [photos, setPhotos] = useState([]); // [{ id, file, previewUrl }]
  const cameraInputRef = useRef();
  const galleryInputRef = useRef();

  const [expenses, setExpenses] = useState([]); // pending expenses for this activity
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseType, setExpenseType] = useState('Fuel');

  const approvedKPIs = useMemo(
    () => kpis.filter(k => k.status === 'approved' || k.status === 'achieved'),
    [kpis]
  );

  useEffect(() => { fetchActivities(); }, [profile]);

  useEffect(() => {
    if (showForm) detectLocation(false);
  }, [showForm]);

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

  function detectLocation(highAccuracy) {
    if (!navigator.geolocation) {
      setLocation('Geolocation not supported by this browser');
      return;
    }
    if (!highAccuracy && hasGeocodedRef.current) return; // auto-detect only fires once

    setGpsLoading(true);
    setLocation('Getting location…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGps({ lat: latitude, lon: longitude });
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGpsLoading(false);

        const shouldGeocode = highAccuracy || !hasGeocodedRef.current;
        if (shouldGeocode) {
          hasGeocodedRef.current = true;
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: { 'User-Agent': 'KutsagaFieldOps/1.0' },
          })
            .then(res => res.json())
            .then(data => {
              if (data.display_name) {
                const short = data.display_name.split(',').slice(0, 3).join(',').trim();
                setLocation(short);
              }
            })
            .catch(() => {});
        }
      },
      (err) => {
        setGpsLoading(false);
        const msg = err.code === err.PERMISSION_DENIED ? 'Location permission denied'
          : err.code === err.POSITION_UNAVAILABLE ? 'Location unavailable'
          : 'Location request timed out';
        setLocation(msg);
      },
      { enableHighAccuracy: !!highAccuracy, timeout: 10000, maximumAge: highAccuracy ? 0 : 300000 }
    );
  }

  function handlePhotoFiles(e) {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [
      ...prev,
      ...files.map(file => ({ id: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file) })),
    ]);
    e.target.value = '';
  }

  function removePhoto(id) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  }

  function handleAddExpense() {
    const amount = parseFloat(expAmountRef.current.value);
    if (!amount || amount <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }
    setExpenses(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      category: expenseType,
      amount,
      quantity: expenseType === 'Fuel' && expQtyRef.current.value ? parseFloat(expQtyRef.current.value) : null,
      unit: expenseType === 'Fuel' ? 'Litres' : null,
      notes: expNotesRef.current.value.trim() || null,
    }]);
    expAmountRef.current.value = '';
    if (expQtyRef.current) expQtyRef.current.value = '';
    expNotesRef.current.value = '';
    setIsAddingExpense(false);
    setError('');
  }

  function removeExpense(id) {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  function resetForm() {
    photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setExpenses([]);
    setCategory(CATEGORIES[0]);
    setLinkedKpiId('');
    setGps(null);
    setLocation('Detecting location…');
    hasGeocodedRef.current = false;
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const activityFields = {
      user_id:       profile.id,
      category,
      title:         titleRef.current.value.trim(),
      description:   descRef.current.value.trim() || null,
      activity_date: dateRef.current.value || new Date().toISOString().slice(0, 10),
      latitude:      gps?.lat ?? null,
      longitude:     gps?.lon ?? null,
      location_name: location,
      kpi_id:        linkedKpiId || null,
    };

    const expensePayloads = expenses.map(exp => ({
      user_id:      profile.id,
      description:  exp.notes || exp.category,
      amount:       exp.amount,
      category:     exp.category,
      quantity:     exp.quantity,
      unit:         exp.unit,
      expense_date: activityFields.activity_date,
    }));

    const photoFiles = photos.map(p => p.file);

    try {
      if (!navigator.onLine) throw new Error('offline');

      let photo_urls = [];
      if (photoFiles.length) {
        photo_urls = await Promise.all(photoFiles.map(async (file, i) => {
          const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
          const path = `${profile.id}/${Date.now()}-${i}.${ext}`;
          const { error: upErr } = await supabase.storage.from('activity-photos').upload(path, file, { contentType: file.type });
          if (upErr) throw upErr;
          return supabase.storage.from('activity-photos').getPublicUrl(path).data.publicUrl;
        }));
      }

      const { data: inserted, error: insErr } = await supabase
        .from('activities')
        .insert({ ...activityFields, photo_urls })
        .select()
        .single();
      if (insErr) throw insErr;

      if (expensePayloads.length) {
        const rows = expensePayloads.map(exp => ({ ...exp, activity_id: inserted.id }));
        const { error: expErr } = await supabase.from('expenses').insert(rows);
        if (expErr) console.warn('Activity saved but expenses failed to save:', expErr.message);
      }

      setShowForm(false);
      resetForm();
      fetchActivities();
    } catch (networkOrOfflineErr) {
      // No signal (or a transient network failure) — queue locally, sync automatically later.
      await enqueue('activities', { ...activityFields, photo_urls: [], _expenses: expensePayloads }, photoFiles);
      setShowForm(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await supabase.from('activities').delete().eq('id', id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  const combinedList = useMemo(() => {
    const pending = pendingRecords.map(r => ({
      _pending: true,
      localId: r.localId,
      title: r.payload.title,
      description: r.payload.description,
      category: r.payload.category,
      activity_date: r.payload.activity_date,
      location_name: r.payload.location_name,
      photo_urls: [],
      sortKey: r.createdAt,
    }));
    const synced = activities.map(a => ({ ...a, sortKey: new Date(a.activity_date).getTime() }));
    return [...pending, ...synced].sort((a, b) => b.sortKey - a.sortKey);
  }, [pendingRecords, activities]);

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Field Activities</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Log Activity</button>
      </div>

      {pendingRecords.length > 0 && (
        <div className="alert" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffe69c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔌 {pendingRecords.length} item{pendingRecords.length > 1 ? 's' : ''} waiting to sync</span>
          <button className="btn btn-ghost btn-sm" style={{ color: '#856404' }} onClick={syncNow}>Sync now</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '80px' }} className="skeleton" />)}
        </div>
      ) : combinedList.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No activities logged yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>Log your first activity</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {combinedList.map(a => (
            <div key={a.localId || a.id} className="card" style={styles.actCard}>
              <div className="flex-between">
                <div style={{ flex: 1 }}>
                  <div className="flex-between" style={{ marginBottom: '2px' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--green-800)' }}>{a.category}</span>
                    {a._pending && <span className="badge badge-pending">⏳ Pending</span>}
                  </div>
                  <p style={styles.actTitle}>{a.title}</p>
                  {a.description && <p className="text-sm text-muted" style={{ marginTop: '2px' }}>{a.description}</p>}
                  {a.photo_urls?.length > 0 && (
                    <div className="flex gap-8" style={{ marginTop: '6px' }}>
                      {a.photo_urls.map((url, i) => (
                        <img key={i} src={url} alt="" style={styles.photoThumb} />
                      ))}
                    </div>
                  )}
                  <div style={styles.actMeta}>
                    <span className="text-xs text-muted">📅 {a.activity_date}</span>
                    {a.location_name && <span className="text-xs text-muted">📍 {a.location_name}</span>}
                  </div>
                </div>
                {!a._pending && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', padding: '4px 8px' }}
                    onClick={() => handleDelete(a.id)}
                  >✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create activity modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px' }}>Log Activity</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Category *</label>
                <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Title *</label>
                <input type="text" className="input" ref={titleRef} defaultValue="" required placeholder="What did you do?" />
              </div>

              <div className="field">
                <label>Photos ({photos.length})</label>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  {photos.map(p => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <img src={p.previewUrl} alt="" style={styles.photoThumb} />
                      <button type="button" onClick={() => removePhoto(p.id)} style={styles.removePhotoBtn}>✕</button>
                    </div>
                  ))}
                  <div
                    onClick={() => galleryInputRef.current.click()}
                    style={styles.addPhotoBox}
                  >＋</div>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFiles} className="hidden" style={{ display: 'none' }} />
                <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handlePhotoFiles} className="hidden" style={{ display: 'none' }} />
                <div className="flex gap-8" style={{ marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => cameraInputRef.current.click()}>📸 Camera</button>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => galleryInputRef.current.click()}>🖼️ Gallery</button>
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  ref={descRef}
                  defaultValue=""
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Details…"
                />
              </div>

              <div className="field">
                <label>Location</label>
                <div className="card" style={{ background: 'var(--green-50)', padding: '10px' }}>
                  <p className="text-sm font-bold">{gps ? `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}` : 'Detecting…'}</p>
                  <p className="text-xs text-muted">{location}</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => detectLocation(true)} disabled={gpsLoading}>
                  {gpsLoading ? 'Refreshing…' : '📍 Refresh Location'}
                </button>
              </div>

              <div className="field">
                <label>Date</label>
                <input type="date" className="input" ref={dateRef} defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>

              {approvedKPIs.length > 0 && (
                <div className="field">
                  <label>Link to KPI (optional)</label>
                  <select className="input" value={linkedKpiId} onChange={e => setLinkedKpiId(e.target.value)}>
                    <option value="">None</option>
                    {approvedKPIs.map(k => <option key={k.id} value={k.id}>{k.title}</option>)}
                  </select>
                </div>
              )}

              <div className="field">
                <div className="flex-between">
                  <label>Expenses</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddingExpense(!isAddingExpense)}>
                    {isAddingExpense ? 'Cancel' : '+ Add Expense'}
                  </button>
                </div>

                {isAddingExpense && (
                  <div className="card" style={{ background: 'var(--bg-page)', marginTop: '8px' }}>
                    <div className="field" style={{ marginBottom: '8px' }}>
                      <label>Type</label>
                      <select className="input" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                        {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {expenseType === 'Fuel' && (
                      <div className="field" style={{ marginBottom: '8px' }}>
                        <label>Quantity (Litres)</label>
                        <input type="number" step="0.1" className="input" ref={expQtyRef} defaultValue="" placeholder="0" />
                      </div>
                    )}
                    <div className="field" style={{ marginBottom: '8px' }}>
                      <label>Amount (USD)</label>
                      <input type="number" step="0.01" className="input" ref={expAmountRef} defaultValue="" placeholder="0.00" />
                    </div>
                    <div className="field" style={{ marginBottom: '8px' }}>
                      <label>Notes</label>
                      <input type="text" className="input" ref={expNotesRef} defaultValue="" placeholder="Optional" />
                    </div>
                    <button type="button" className="btn btn-primary btn-sm btn-full" onClick={handleAddExpense}>Add Expense</button>
                  </div>
                )}

                {expenses.length > 0 && (
                  <div className="card" style={{ marginTop: '8px' }}>
                    {expenses.map(exp => (
                      <div key={exp.id} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <p className="text-sm font-bold">{exp.category}</p>
                          {exp.quantity && <p className="text-xs text-muted">{exp.quantity} {exp.unit}</p>}
                        </div>
                        <div className="flex gap-8" style={{ alignItems: 'center' }}>
                          <span className="text-sm font-bold">${exp.amount.toFixed(2)}</span>
                          <button type="button" onClick={() => removeExpense(exp.id)} style={{ color: 'var(--danger)', fontSize: '16px' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }} disabled={saving}>Cancel</button>
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
  photoThumb: { width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' },
  addPhotoBox: {
    width: '64px', height: '64px', borderRadius: '8px', border: '2px dashed var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
    color: 'var(--text-muted)', cursor: 'pointer',
  },
  removePhotoBtn: {
    position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px',
    borderRadius: '50%', background: 'var(--danger)', color: '#fff', fontSize: '11px',
    border: 'none', cursor: 'pointer', lineHeight: 1,
  },
};
