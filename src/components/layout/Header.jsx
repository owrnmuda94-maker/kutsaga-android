import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

export default function Header() {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <span style={styles.logo}>🌿</span>
        <span style={styles.name}>Kutsaga</span>
      </div>
      <div style={styles.right}>
        {unreadCount > 0 && (
          <div style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</div>
        )}
        <div style={styles.avatar}>
          {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{profile?.full_name?.split(' ')[0]}</div>
          <div style={styles.userRole}>{profile?.role}</div>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 'var(--header-h)',
    background: 'var(--green-800)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: { fontSize: '22px' },
  name: { fontSize: '18px', fontWeight: '800', color: '#fff' },
  right: { display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '36px',
    background: '#e74c3c',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '700',
    borderRadius: '10px',
    padding: '2px 5px',
    minWidth: '18px',
    textAlign: 'center',
    zIndex: 1,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
  },
  userInfo: { display: 'flex', flexDirection: 'column', gap: '1px' },
  userName: { fontSize: '13px', fontWeight: '700', color: '#fff', lineHeight: 1 },
  userRole: { fontSize: '10px', color: 'rgba(255,255,255,0.7)', lineHeight: 1 },
};
