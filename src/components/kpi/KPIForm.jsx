import React, { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function KPIForm({ onSubmit, onCancel, initialValues = {} }) {
  const { profile } = useAuth();
  const titleRef       = useRef();
  const descRef        = useRef();
  const weightRef      = useRef();
  const targetRef      = useRef();
  const periodStartRef = useRef();
  const periodEndRef   = useRef();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const weight = parseFloat(weightRef.current.value);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      setError('Weight must be between 0 and 100.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        title:        titleRef.current.value.trim(),
        description:  descRef.current.value.trim() || null,
        weight,
        target:       targetRef.current.value ? parseFloat(targetRef.current.value) : null,
        period_start: periodStartRef.current.value || null,
        period_end:   periodEndRef.current.value || null,
      });
    } catch (err) {
      setError(err.message || 'Failed to save KPI.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Title *</label>
        <input
          type="text"
          className="input"
          ref={titleRef}
          defaultValue={initialValues.title ?? ''}
          placeholder="e.g. Conduct 10 farmer visits"
          required
        />
      </div>

      <div className="field">
        <label>Description</label>
        <textarea
          className="input"
          ref={descRef}
          defaultValue={initialValues.description ?? ''}
          placeholder="What does achieving this KPI look like?"
          rows={3}
          style={styles.textarea}
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Weight (%) *</label>
          <input
            type="number"
            className="input"
            ref={weightRef}
            defaultValue={initialValues.weight ?? ''}
            placeholder="0–100"
            min="0"
            max="100"
            step="0.01"
            required
          />
        </div>
        <div className="field">
          <label>Target value</label>
          <input
            type="number"
            className="input"
            ref={targetRef}
            defaultValue={initialValues.target ?? ''}
            placeholder="e.g. 10"
            step="any"
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Period start</label>
          <input
            type="date"
            className="input"
            ref={periodStartRef}
            defaultValue={initialValues.period_start ?? ''}
          />
        </div>
        <div className="field">
          <label>Period end</label>
          <input
            type="date"
            className="input"
            ref={periodEndRef}
            defaultValue={initialValues.period_end ?? ''}
          />
        </div>
      </div>

      <div style={styles.actions}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
          {loading ? 'Saving…' : (initialValues.id ? 'Update KPI' : 'Create KPI')}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  textarea: { resize: 'vertical', minHeight: '72px' },
  actions: { display: 'flex', gap: '10px', marginTop: '4px' },
};
