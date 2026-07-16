import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CEODashboard } from './pages/ceo/CEODashboard';
import { CEOSettings } from './pages/ceo/CEOSettings';
import { CEOContractsPage } from './pages/ceo/CEOContractsPage';
import { CEOContractDetailPage } from './pages/ceo/CEOContractDetailPage';
import { CEOAgentsPage } from './pages/ceo/CEOAgentsPage';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentSettings } from './pages/agent/AgentSettings';
import { AdminDashboard } from './pages/admin/AdminDashboard';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
    switch (profile.role) {
      case 'CEO':
        return <Navigate to="/ceo/dashboard" replace />;
      case 'AGENT':
        return <Navigate to="/agent/dashboard" replace />;
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (user && profile) {
    // Redirect to appropriate dashboard
    switch (profile.role) {
      case 'CEO':
        return <Navigate to="/ceo/dashboard" replace />;
      case 'AGENT':
        return <Navigate to="/agent/dashboard" replace />;
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
  path="/agent/contracts"
  element={
    <ProtectedRoute allowedRoles={['AGENT']}>
      <AgentDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/agent/payouts"
  element={
    <ProtectedRoute allowedRoles={['AGENT']}>
      <AgentDashboard />
    </ProtectedRoute>
  }
/>

      {/* CEO routes */}
      <Route
        path="/ceo/dashboard"
        element={
          <ProtectedRoute allowedRoles={['CEO']}>
            <CEODashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/settings"
        element={
          <ProtectedRoute allowedRoles={['CEO']}>
            <CEOSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/contracts"
        element={
          <ProtectedRoute allowedRoles={['CEO']}>
            <CEOContractsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/contracts/:id"
        element={
          <ProtectedRoute allowedRoles={['CEO']}>
            <CEOContractDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/agents"
        element={
          <ProtectedRoute allowedRoles={['CEO']}>
            <CEOAgentsPage />
          </ProtectedRoute>
        }
      />

      {/* Agent routes */}
      <Route
        path="/agent/dashboard"
        element={
          <ProtectedRoute allowedRoles={['AGENT']}>
            <AgentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agent/settings"
        element={
          <ProtectedRoute allowedRoles={['AGENT']}>
            <AgentSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agent/tasks"
        element={
          <ProtectedRoute allowedRoles={['AGENT']}>
            <AgentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contracts"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
