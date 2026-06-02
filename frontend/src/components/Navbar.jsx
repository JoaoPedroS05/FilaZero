import React from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Navbar() {
  const { authenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // Testa se existe o user e remove qualquer erro de maiúsculas/minúsculas
  const isAdmin = authenticated &&
    user?.role &&
    user.role.toString().trim().toLowerCase() === 'admin';

  return (
    <nav className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
      <div
        className="flex items-center gap-2 font-bold text-blue-600 text-lg cursor-pointer"
        onClick={() => navigate('/filas')}
      >
        <span className="tracking-tight">SemFila</span>
      </div>

      <div className="flex items-center gap-6">
        {authenticated && (
          <Link to="/filas" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
            Filas Virtuais
          </Link>
        )}

        {/* EXIBIÇÃO DO BOTÃO DO PAINEL ADMIN */}
        {isAdmin && (
          <Link
            to="/admin"
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Painel Admin
          </Link>
        )}

        {authenticated ? (
          <button
            onClick={logout}
            className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            Sair
          </button>
        ) : (
          <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}