import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import KPIManagement from './pages/KPIManagement';
import Activities from './pages/Activities';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import TeamMemberDetail from './pages/TeamMemberDetail';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="kpis"          element={<KPIManagement />} />
        <Route path="activities"    element={<Activities />} />
        <Route path="expenses"      element={<Expenses />} />
        <Route path="reports"       element={<Reports />} />
        <Route path="team/:userId"  element={<TeamMemberDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile"       element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}
