import { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { AgentContractsPage } from "./pages/agent/AgentContractsPage";
import { AgentPayoutsPage } from "./pages/agent/AgentPayoutsPage";
import { AdminDashboard } from './pages/admin/AdminDashboard';

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-text-secondary">Загрузка...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (profile && !allowedRoles.includes(profile.role)) {
    switch (profile.role) {
      case 'CEO': return <Navigate to="/ceo/dashboard" replace />;
      case 'AGENT': return <Navigate to="/agent/dashboard" replace />;
      case 'ADMIN': return <Navigate to="/admin/dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-text-secondary">Загрузка...</div>
      </div>
    );
  }

  if (user && profile) {
    switch (profile.role) {
      case 'CEO': return <Navigate to="/ceo/dashboard" replace />;
      case 'AGENT': return <Navigate to="/agent/dashboard" replace />;
      case 'ADMIN': return <Navigate to="/admin/dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route path="/agent/dashboard" element={<ProtectedRoute allowedRoles={['AGENT']}><AgentDashboard /></ProtectedRoute>} />
      <Route path="/agent/contracts" element={<ProtectedRoute allowedRoles={['AGENT']}><AgentContractsPage /></ProtectedRoute>} />
      <Route path="/agent/payouts" element={<ProtectedRoute allowedRoles={['AGENT']}><AgentPayoutsPage /></ProtectedRoute>} />
      <Route path="/agent/settings" element={<ProtectedRoute allowedRoles={['AGENT']}><AgentSettings /></ProtectedRoute>} />

      <Route path="/ceo/dashboard" element={<ProtectedRoute allowedRoles={['CEO']}><CEODashboard /></ProtectedRoute>} />
      <Route path="/ceo/settings" element={<ProtectedRoute allowedRoles={['CEO']}><CEOSettings /></ProtectedRoute>} />
      <Route path="/ceo/contracts" element={<ProtectedRoute allowedRoles={['CEO']}><CEOContractsPage /></ProtectedRoute>} />
      <Route path="/ceo/contracts/:id" element={<ProtectedRoute allowedRoles={['CEO']}><CEOContractDetailPage /></ProtectedRoute>} />
      <Route path="/ceo/agents" element={<ProtectedRoute allowedRoles={['CEO']}><CEOAgentsPage /></ProtectedRoute>} />

      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;