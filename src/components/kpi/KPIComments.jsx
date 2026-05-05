import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function KPIComments({ kpiId }) {
  const { profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const textRef = useRef();

  useEffect(() => {
    fetchComments();
  }, [kpiId]);

  async function fetchComments() {
    const { data } = await supabase
      .from('kpi_comments')
      .select('*, author:profiles!kpi_comments_author_id_fkey(full_name, role)')
      .eq('kpi_id', kpiId)
      .order('created_at', { ascending: true });
    setComments(data ?? []);
    setLoading(false);
  }

  async function addComment(e) {
    e.preventDefault();
    const content = textRef.current.value.trim();
    if (!content) return;
    await supabase.from('kpi_comments').insert({ kpi_id: kpiId, author_id: profile.id, content });
    textRef.current.value = '';
    fetchComments();
  }

  return (
    <div style={styles.root}>
      <h4 style={styles.heading}>Comments</h4>
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet.</p>
      ) : (
        <div style={styles.list}>
          {comments.map(c => (
            <div key={c.id} style={styles.comment}>
              <div style={styles.avatar}>{c.author?.full_name?.[0]?.toUpperCase()}</div>
              <div style={styles.body}>
                <div style={styles.commentMeta}>
                  <span style={styles.authorName}>{c.author?.full_name}</span>
                  <span className="text-xs text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={styles.content}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addComment} style={styles.form}>
        <textarea
          ref={textRef}
          className="input"
          placeholder="Add a comment…"
          rows={2}
          style={styles.textarea}
        />
        <button type="submit" className="btn btn-primary btn-sm">Post</button>
      </form>
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' },
  heading: { fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  comment: { display: 'flex', gap: '8px' },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--green-100)',
    color: 'var(--green-800)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  body: { flex: 1 },
  commentMeta: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' },
  authorName: { fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' },
  content: { fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 },
  form: { display: 'flex', flexDirection: 'column', gap: '8px' },
  textarea: { resize: 'vertical', minHeight: '60px' },
};
