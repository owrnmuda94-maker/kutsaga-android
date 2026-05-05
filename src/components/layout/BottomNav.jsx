import React from 'react';
import { NavLink } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

const NAV = [
  { to: '/dashboard',     icon: '🏠', label: 'Home' },
  { to: '/kpis',          icon: '🎯', label: 'KPIs' },
  { to: '/activities',    icon: '📋', label: 'Field' },
  { to: '/notifications', icon: '🔔', label: 'Alerts' },
  { to: '/profile',       icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const { unreadCount } = useNotifications();

  return (
    <nav style={styles.nav}>
      {NAV.map(({ to, icon, label }) => (
        <NavLink key={to} to={to} style={({ isActive }) => ({
          ...styles.item,
          ...(isActive ? styles.active : {}),
        })}>
          <div style={styles.iconWrap}>
            <span style={styles.icon}>{icon}</span>
            {to === '/notifications' && unreadCount > 0 && (
              <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>
          <span style={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 'var(--nav-h)',
    background: '#fff',
    display: 'flex',
    borderTop: '1px solid var(--border)',
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  item: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    textDecoration: 'none',
    color: 'var(--text-muted)',
    padding: '6px 0',
    transition: 'color 0.15s',
  },
  active: { color: 'var(--green-800)' },
  iconWrap: { position: 'relative' },
  icon: { fontSize: '22px' },
  label: { fontSize: '10px', fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-6px',
    background: '#e74c3c',
    color: '#fff',
    fontSize: '9px',
    fontWeight: '700',
    borderRadius: '10px',
    padding: '1px 4px',
    minWidth: '16px',
    textAlign: 'center',
  },
};
