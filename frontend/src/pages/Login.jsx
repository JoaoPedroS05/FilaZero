import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log("Disparando tentativa de login para:", email);
      
      // Captura a role retornada pelo Contexto (que já vem higienizada como "Admin" ou "User")
      const userRole = await login(email, senha);
      
      console.log("Login sucedido! Role retornada pelo contexto:", userRole);

      // 🔥 CORREÇÃO DE SEGURANÇA: Normaliza para minúsculo antes de comparar
      if (userRole && userRole.trim().toLowerCase() === 'admin') {
        console.log("Redirecionando para o painel administrativo (/admin)...");
        navigate('/admin');
      } else {
        console.log("Redirecionando para a área de clientes (/filas)...");
        navigate('/filas');
      }
    } catch (err) {
      setLoading(false);
      console.error("ERRO CAPTURADO NO LOGIN:", err);
      setError(err.response?.data?.message || err.message || "Falha na autenticação.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full space-y-6">
        
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acesse sua Conta</h2>
          <p className="text-slate-500 text-sm mt-1">Entre para gerenciar ou emitir seus tickets</p>
        </div>

        {/* Exibição visual do erro na tela */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 whitespace-pre-wrap">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-blue-500 bg-slate-50/50" 
              placeholder="seu-email@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Senha</label>
            <input 
              type="password" 
              required 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-blue-500 bg-slate-50/50" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm cursor-pointer hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Não tem uma conta?{' '}
          <Link to="/registro" className="text-blue-600 font-bold hover:underline">
            Cadastre-se aqui
          </Link>
        </p>

      </div>
    </div>
  );
}