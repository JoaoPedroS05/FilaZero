import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Registro.jsx';
import FilaVirtual from './pages/FilaVirtual.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Navbar from './components/Navbar.jsx';
import FilaPrivada from './pages/FilaPrivada.jsx';

// Protetor Geral de Autenticação (Exige apenas Token)
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Protetor de Admin: Exige Token E Perfil Administrativo
const AdminRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  
  const isAdmin = isAuthenticated && usuario?.role === 'Admin';
  
  if (!isAdmin) {
    alert('Acesso negado! Esta área é exclusiva para administradores.');
    return <Navigate to="/filas" />;
  }
  
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <div className="flex-1">
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />

            {/* Rotas Protegidas por Token */}
            <Route path="/filas" element={
              <PrivateRoute>
                <FilaVirtual />
              </PrivateRoute>
            } />

            {/* ROTA DO QR CODE: */}
            <Route path="/entrar-fila/:codigoAcesso" element={
              <PrivateRoute>
                <FilaPrivada />
              </PrivateRoute>
            } />

            {/* Rota Administrativa Blindada */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            <Route path="*" element={<Navigate to="/filas" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}