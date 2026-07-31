import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CEODashboard } from './pages/ceo/CEODashboard';
import { CEOSettings } from './pages/ceo/CEOSettings';
import { CEOContractsPage } from './pages/ceo/CEOContractsPage';
import { CEOContractDetailPage } from './pages/ceo/CEOContractDetailPage';
import { CEODisputesPage } from './pages/ceo/CEODisputesPage';
import { CEOAgentsPage } from './pages/ceo/CEOAgentsPage';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentSettings } from './pages/agent/AgentSettings';
import { AgentContractsPage } from './pages/agent/AgentContractsPage';
import { AgentContractDetailPage } from './pages/agent/AgentContractDetailPage';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-[#000052]">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Маршруты CEO */}
          <Route path="/ceo" element={<ProtectedRoute><CEODashboard /></ProtectedRoute>} />
          <Route path="/ceo/settings" element={<ProtectedRoute><CEOSettings /></ProtectedRoute>} />
          <Route path="/ceo/contracts" element={<ProtectedRoute><CEOContractsPage /></ProtectedRoute>} />
          <Route path="/ceo/contracts/:id" element={<ProtectedRoute><CEOContractDetailPage /></ProtectedRoute>} />
          <Route path="/ceo/disputes" element={<ProtectedRoute><CEODisputesPage /></ProtectedRoute>} />
          <Route path="/ceo/agents" element={<ProtectedRoute><CEOAgentsPage /></ProtectedRoute>} />
          
          {/* Маршруты Агента */}
          <Route path="/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
          <Route path="/agent/settings" element={<ProtectedRoute><AgentSettings /></ProtectedRoute>} />
          <Route path="/agent/contracts" element={<ProtectedRoute><AgentContractsPage /></ProtectedRoute>} />
          <Route path="/agent/contracts/:id" element={<ProtectedRoute><AgentContractDetailPage /></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;