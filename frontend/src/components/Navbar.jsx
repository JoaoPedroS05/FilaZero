import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [usuario, setUsuario] = useState(JSON.parse(localStorage.getItem('usuario')));

  // Fica de olho nas mudanças de rota para atualizar o estado da barra imediatamente pós-login
  useEffect(() => {
    setToken(localStorage.getItem('token'));
    setUsuario(JSON.parse(localStorage.getItem('usuario')));
  }, [location]);

  const handleSair = () => {
    localStorage.clear();
    setToken(null);
    setUsuario(null);
    navigate('/login');
  };

  const isAuthenticated = !!token;

  return (
    <nav className="bg-white shadow-sm border-b border-slate-100 px-6 py-4 flex justify-between items-center">
      <Link to="/filas" className="text-xl font-black text-blue-600 tracking-tight">
        SemFila
      </Link>
      
      <div className="flex gap-4 text-sm font-semibold items-center">
        {/* Botão Home: Visível apenas para quem está autenticado */}
        {isAuthenticated && (
          <Link to="/filas" className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1">
            🏠 Home
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
            {/* O link do Painel Admin SÓ aparece se a role for estritamente "Admin" */}
            {usuario?.role === 'Admin' && (
              <Link to="/admin" className="text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl transition-colors">
                Painel Admin
              </Link>
            )}
            
            <span className="text-slate-300 font-normal">|</span>
            <span className="text-slate-500 font-normal">Olá, {usuario?.nome?.split(' ')[0]}</span>

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
  );
}