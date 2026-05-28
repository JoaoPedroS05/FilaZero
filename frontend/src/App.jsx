import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Registro.jsx';
import FilaVirtual from './pages/FilaVirtual.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

// Componente para proteger rotas (impede acesso se não houver token)
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        
        {/* Navbar de Navegação */}
        <nav className="bg-white shadow-sm border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <Link to="/filas" className="text-xl font-black text-blue-600 tracking-tight">
            FilaZero
          </Link>
          <div className="flex gap-4 text-sm font-semibold">
            <Link to="/login" className="text-slate-600 hover:text-blue-600 transition-colors">
              Login
            </Link>
            <Link to="/registro" className="text-slate-600 hover:text-blue-600 transition-colors">
              Cadastrar
            </Link>
            <Link to="/admin" className="text-purple-600 hover:text-purple-700 transition-colors">
              Painel Admin
            </Link>
            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              className="text-red-500 hover:text-red-600 cursor-pointer bg-none border-none font-semibold"
            >
              Sair
            </button>
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
            <Route path="/admin" element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            } />

            {/* Redirecionamento Padrão */}
            <Route path="*" element={<Navigate to="/filas" />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  );
}