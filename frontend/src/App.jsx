import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Registro.jsx';
import FilaVirtual from './pages/FilaVirtual.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

// 1. Protetor Geral de Autenticação (Exige apenas Token)
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// 2. Exige Token E Perfil Administrativo
const AdminRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  
  const isAdmin = isAuthenticated && usuario?.role === 'Admin';
  
  if (!isAdmin) {
    // Se não for admin, exibe o alerta e chuta de volta para as filas
    alert('Acesso negado! Esta área é exclusiva para administradores.');
    return <Navigate to="/filas" />;
  }
  
  return children;
};

export default function App() {
  // Recupera o estado de autenticação atual para renderizar os botões certos
  const isAuthenticated = !!localStorage.getItem('token');
  const usuarioLogado = JSON.parse(localStorage.getItem('usuario'));

  const handleSair = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        
        {/* Navbar de Navegação Dinâmica */}
        <nav className="bg-white shadow-sm border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <Link to="/filas" className="text-xl font-black text-blue-600 tracking-tight">
            FilaZero
          </Link>
          
          <div className="flex gap-4 text-sm font-semibold items-center">
            {/* Visível apenas para quem está autenticado */}
            {isAuthenticated && (
              <Link to="/filas" className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1">
                Home
              </Link>
            )}

            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Login
                </Link>
                <Link to="/registro" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Cadastrar
                </Link>
              </>
            ) : (
              <>
                {/* O link do Painel Admin SÓ aparece se a role for "Admin" */}
                {usuarioLogado?.role === 'Admin' && (
                  <Link to="/admin" className="text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl transition-colors">
                    Painel Admin
                  </Link>
                )}
                
                <span className="text-slate-300 font-normal">|</span>
                <span className="text-slate-500 font-normal">Olá, {usuarioLogado?.nome?.split(' ')[0]}</span>

                <button 
                  onClick={handleSair}
                  className="text-red-500 hover:text-red-600 cursor-pointer bg-none border-none font-semibold transition-colors"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Renderização das Rotas da Aplicação */}
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

            {/* Usa a nova AdminRoute */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            {/* Redirecionamento Padrão */}
            <Route path="*" element={<Navigate to="/filas" />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  );
}