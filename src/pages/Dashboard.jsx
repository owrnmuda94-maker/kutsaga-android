import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import TODashboard   from './dashboards/TODashboard';
import RODashboard   from './dashboards/RODashboard';
import HODDashboard  from './dashboards/HODDashboard';
import ExecDashboard from './dashboards/ExecDashboard';
import CEODashboard  from './dashboards/CEODashboard';
import { ROLES } from '../utils/permissions';

const DASHBOARD_MAP = {
  [ROLES.CEO]:         CEODashboard,
  [ROLES.EXEC_DIR]:    ExecDashboard,
  [ROLES.HOD]:         HODDashboard,
  [ROLES.TEAM_LEADER]: HODDashboard,
  [ROLES.RO]:          RODashboard,
  [ROLES.TO]:          TODashboard,
};

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return <div className="splash"><div className="spinner" /></div>;
  }

  const DashboardComponent = DASHBOARD_MAP[profile.role] ?? TODashboard;
  return <DashboardComponent />;
}
