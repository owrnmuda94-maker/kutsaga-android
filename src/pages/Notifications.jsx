import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

const TYPE_ICONS = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  function handleClick(n) {
    if (!n.is_read) markRead(n.id);
    if (n.link_url) navigate(n.link_url);
  }

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Notifications {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
        </h1>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔔</div>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              className="card"
              style={{ ...styles.item, ...(n.is_read ? styles.read : styles.unread), ...(n.link_url ? { cursor: 'pointer' } : {}) }}
              onClick={() => handleClick(n)}
            >
              <div style={styles.iconCol}>{TYPE_ICONS[n.type] ?? 'ℹ️'}</div>
              <div style={{ flex: 1 }}>
                <p style={styles.title}>{n.title}</p>
                <p className="text-sm text-secondary" style={{ marginTop: '2px' }}>{n.message}</p>
                <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && <div style={styles.dot} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  badge: {
    display: 'inline-block',
    background: '#e74c3c',
    color: '#fff',
    fontSize: '12px',
    borderRadius: '10px',
    padding: '1px 7px',
    marginLeft: '6px',
    fontWeight: '700',
  },
  item: { display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' },
  unread: { borderLeft: '3px solid var(--green-700)' },
  read: { opacity: 0.7 },
  iconCol: { fontSize: '20px', flexShrink: 0, marginTop: '1px' },
  title: { fontSize: '14px', fontWeight: '700' },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--green-700)',
    flexShrink: 0,
    marginTop: '6px',
  },
};
