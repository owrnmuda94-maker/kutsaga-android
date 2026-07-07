import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useNotifications } from '../../hooks/useNotifications';

export default function Layout() {
  const { unreadCount } = useNotifications();

  return (
    <div style={styles.root}>
      <Header unreadCount={unreadCount} />
      <main style={styles.main}>
        <Outlet />
      </main>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh' },
  main: {
    flex: 1,
    marginTop: 'var(--header-h)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    minHeight: 0,
  },
};
