import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={styles.wrap}>
          <p style={styles.icon}>⚠️</p>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.msg}>{this.state.error.message}</p>
          <button
            style={styles.btn}
            onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard'; }}
          >
            Back to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  wrap: { padding: '32px 16px', textAlign: 'center', marginTop: '80px' },
  icon: { fontSize: '40px', marginBottom: '12px' },
  title: { fontSize: '18px', fontWeight: '700', marginBottom: '8px' },
  msg: { fontSize: '13px', color: '#666', marginBottom: '20px', wordBreak: 'break-word', lineHeight: 1.5 },
  btn: { padding: '10px 24px', background: '#1a5c2e', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};
