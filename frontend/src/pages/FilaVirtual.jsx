import { useState, useEffect } from 'react';
import api from '../services/api';

export default function FilaVirtual() {
  const [filas, setFilas] = useState([]);
  const [meusAtendimentos, setMeusAtendimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Carrega as filas disponíveis e os atendimentos atuais do usuário
  const carregarDados = async () => {
    try {
      const [resFilas, resMeusAtendimentos] = await Promise.all([
        api.get('/fila'),
        api.get('/fila/meus-atendimentos')
      ]);
      setFilas(resFilas.data);
      setMeusAtendimentos(resMeusAtendimentos.data);
    } catch (err) {
      setError('Erro ao carregar os dados das filas.');
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Função para entrar em uma fila específica
  const entrarFila = async (filaId) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/fila/entrar', { filaId });
      await carregarDados();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível entrar na fila.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">FilaZero</h1>
            <p className="text-slate-500">Pegue sua senha remota e evite aglomerações</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl font-medium border border-red-100 text-sm">
            {error}
          </div>
        )}

        {/* Painel de Senhas Ativas do Usuário */}
        {meusAtendimentos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Seus Tickets Ativos</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {meusAtendimentos.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-xl font-bold">
                    {ticket.status}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ticket.fila.nome}</p>
                    <h3 className="text-4xl font-black text-blue-600 my-2">{ticket.senha}</h3>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Sua Posição</p>
                      <p className="font-bold text-slate-700">{ticket.posicao}º lugar</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Tempo Estimado</p>
                      <p className="font-bold text-emerald-600">~{ticket.fila.tempoEstimadoEsperaMinutos} min</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listagem de Filas Disponíveis */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Filas de Atendimento Disponíveis</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {filas.map((fila) => (
              <div key={fila.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{fila.nome}</h3>
                  <p className="text-slate-500 text-sm mt-1">{fila.tipoServico}</p>
                  <span className="inline-block mt-3 bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md">
                    Média: {fila.tempoMedioAtendimento} min / pessoa
                  </span>
                </div>
                
                <button
                  disabled={loading || !fila.ativa}
                  onClick={() => entrarFila(fila.id)}
                  className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-colors text-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Entrar na Fila'}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}