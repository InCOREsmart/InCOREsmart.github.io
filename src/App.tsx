import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Layout
import { DashboardLayout } from './components/layouts/DashboardLayout';

// CEO pages
import { CEODashboard } from './pages/ceo/CEODashboard';
import { CEOContractsPage } from './pages/ceo/CEOContractsPage';
import { CEOContractDetailPage } from './pages/ceo/CEOContractDetailPage';
import { CEOAgentsPage } from './pages/ceo/CEOAgentsPage';
import { CEODisputesPage } from './pages/ceo/CEODisputesPage';
import { CEOSettings } from './pages/ceo/CEOSettings';

// Agent pages
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentContractsPage } from './pages/agent/AgentContractsPage';
import { AgentSettings } from './pages/agent/AgentSettings';
import { AgentPayoutsPage } from './pages/agent/AgentPayoutsPage';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: Array<'CEO' | 'AGENT' | 'ADMIN'>;
}> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-[#000052] text-lg font-medium">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppRoutes: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-[#000052] text-lg font-medium">Загрузка...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to={role === 'CEO' ? '/ceo/dashboard' : '/agent/dashboard'} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      {/* CEO routes */}
      <Route
        path="/ceo/dashboard"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
            <CEODashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/contracts"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
            <CEOContractsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/contracts/:id"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
            <CEOContractDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/agents"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
            <CEOAgentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/disputes"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
            <CEODisputesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo/settings"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
            <CEOSettings />
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
        path="/agent/contracts"
        element={
          <ProtectedRoute allowedRoles={['AGENT']}>
            <AgentContractsPage />
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
        path="/agent/payouts"
        element={
          <ProtectedRoute allowedRoles={['AGENT']}>
            <AgentPayoutsPage />
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={role === 'CEO' ? '/ceo/dashboard' : '/agent/dashboard'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;