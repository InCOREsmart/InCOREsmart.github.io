import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { CEODashboard } from './pages/ceo/CEODashboard';
import { CEOContractsPage } from './pages/ceo/CEOContractsPage';
import { CEOContractDetailPage } from './pages/ceo/CEOContractDetailPage';
import { CEOAgentsPage } from './pages/ceo/CEOAgentsPage';
import { CEODisputesPage } from './pages/ceo/CEODisputesPage';
import { CEOSettings } from './pages/ceo/CEOSettings';
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
        <div className="text-[#000052] text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-[#000052] text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" replace />} />
      
      <Route path="/ceo/dashboard" element={
        <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
          <DashboardLayout><CEODashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/ceo/contracts" element={
        <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
          <DashboardLayout><CEOContractsPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/ceo/contracts/:id" element={
        <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
          <DashboardLayout><CEOContractDetailPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/ceo/agents" element={
        <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
          <DashboardLayout><CEOAgentsPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/ceo/disputes" element={
        <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
          <DashboardLayout><CEODisputesPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/ceo/settings" element={
        <ProtectedRoute allowedRoles={['CEO', 'ADMIN']}>
          <DashboardLayout><CEOSettings /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/agent/dashboard" element={
        <ProtectedRoute allowedRoles={['AGENT']}>
          <DashboardLayout><AgentDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/agent/contracts" element={
        <ProtectedRoute allowedRoles={['AGENT']}>
          <DashboardLayout><AgentContractsPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/agent/settings" element={
        <ProtectedRoute allowedRoles={['AGENT']}>
          <DashboardLayout><AgentSettings /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/agent/payouts" element={
        <ProtectedRoute allowedRoles={['AGENT']}>
          <DashboardLayout><AgentPayoutsPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/" element={
        user ? (
          <Navigate to={role === 'CEO' ? '/ceo/dashboard' : '/agent/dashboard'} replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
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