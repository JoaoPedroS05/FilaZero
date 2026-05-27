import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Registro';

export default function App() {
  
  const [telaAtual, setTelaAtual] = useState('registro');

  return (
    <div className="relative">
      {/* Renderização Condicional da Tela */}
      {telaAtual === 'registro' ? <Register /> : <Login />}

      {/* Barra de alternância flutuante para testes */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-3 z-50">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Ambiente de Testes:
        </span>
        <button
          onClick={() => setTelaAtual('registro')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            telaAtual === 'registro'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tela Registro
        </button>
        <button
          onClick={() => setTelaAtual('login')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            telaAtual === 'login'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tela Login
        </button>
      </div>
    </div>
  );
}