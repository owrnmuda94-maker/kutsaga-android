import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div style={styles.root}>
      <Header />
      <main style={styles.main}>
        <Outlet />
      </main>
      <BottomNav />
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
