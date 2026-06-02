import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Registro.jsx';
import FilaVirtual from './pages/FilaVirtual.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Navbar from './components/Navbar.jsx';
import FilaPrivada from './pages/FilaPrivada.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

// Protetor Geral de Autenticação
const PrivateRoute = ({ children }) => {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600 font-medium">
        Carregando contexto de autenticação...
      </div>
    );
  }

  return authenticated ? children : <Navigate to="/login" replace />;
};

// 🛡️ Protetor de Admin Tolerante a Estado Assíncrono
const AdminRoute = ({ children }) => {
  const { authenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600 font-medium">
        Carregando painel administrativo...
      </div>
    );
  }

  // Mesma validação resiliente que limpa espaços e aceita "admin" ou "Admin"
  const isAdmin = authenticated && user?.role?.trim().toLowerCase() === 'admin';

  if (!isAdmin) {
    console.warn("🚫 [AdminRoute] Bloqueado. Dados do usuário no estado:", user);
    return <Navigate to="/filas" replace />;
  }

  return children;
};

// Maestro de Rotas Unificado
function AppRoutes() {
  const { loading, authenticated } = useAuth();

  // 🔥 SOLUÇÃO DA TRAVA: Se o React ainda estiver lendo o localStorage/JWT, 
  // nós seguramos a renderização para evitar falsos redirecionamentos do "*"
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600 font-medium">
        Iniciando o SemFila...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1">
        <Routes>
          {/* Rotas Públicas (Se já estiver logado, redireciona direto para as filas) */}
          <Route path="/login" element={authenticated ? <Navigate to="/filas" replace /> : <Login />} />
          <Route path="/registro" element={authenticated ? <Navigate to="/filas" replace /> : <Register />} />

          {/* Rotas Privadas / Clientes */}
          <Route path="/filas" element={
            <PrivateRoute>
              <FilaVirtual />
            </PrivateRoute>
          } />

          {/* Rota do QR Code */}
          <Route path="/entrar-fila/:codigoAcesso" element={
            <PrivateRoute>
              <FilaPrivada />
            </PrivateRoute>
          } />

          {/* Rota Administrativa */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />

          {/* Fallback de rotas inexistentes */}
          <Route path="*" element={<Navigate to="/filas" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}