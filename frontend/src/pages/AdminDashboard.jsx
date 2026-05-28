import { useState } from 'react';
import api from '../services/api';

export default function AdminDashboard() {
  const [nome, setNome] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [tempoMedio, setTempoMedio] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCriarFila = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/fila', {
        nome,
        tipoServico,
        tempoMedioAtendimento: parseInt(tempoMedio)
      });

      setSuccess('Nova fila de atendimento configurada com sucesso!');
      setNome('');
      setTipoServico('');
      setTempoMedio('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar a fila.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-900">Painel Administrativo</h2>
          <p className="text-slate-500 text-sm mt-1">Configuração e abertura de novos serviços de atendimento</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">{success}</div>}

        <form onSubmit={handleCriarFila} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome da Fila</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: Atendimento Geral, Caixa Geral"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Serviço</label>
            <input
              type="text"
              required
              value={tipoServico}
              onChange={(e) => setTipoServico(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: Emissão de Documentos, Pagamentos"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tempo Médio por Pessoa (Minutos)</label>
            <input
              type="number"
              required
              min={1}
              value={tempoMedio}
              onChange={(e) => setTempoMedio(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: 10"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm cursor-pointer shadow-md transition-colors"
          >
            Criar Fila
          </button>
        </form>
      </div>
    </div>
  );
}