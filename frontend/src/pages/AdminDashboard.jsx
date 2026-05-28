import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminDashboard() {
  const [filas, setFilas] = useState([]);
  const [nome, setNome] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [tempoMedio, setTempoMedio] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [senhaChamada, setSenhaChamada] = useState('');

  const carregarFilas = async () => {
    try {
      const response = await api.get('/fila');
      setFilas(response.data);
    } catch (err) {
      console.error('Erro ao buscar filas.');
    }
  };

  useEffect(() => {
    carregarFilas();
  }, []);

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
      setSuccess('Nova fila criada!');
      setNome(''); setTipoServico(''); setTempoMedio('');
      carregarFilas();
    } catch (err) {
      setError('Erro ao criar a fila.');
    }
  };

  // Função para o operador chamar o próximo cliente da fila
  const chamarProxima = async (filaId) => {
    setError('');
    setSenhaChamada('');
    try {
      const response = await api.post('/fila/chamar-proxima', { filaId });
      setSenhaChamada(response.data.atendimento.senha);
    } catch (err) {
      setError(err.response?.data?.message || 'Ninguém aguardando nesta fila.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-5xl mx-auto grid md:grid-cols-3 gap-8 items-start">
      
      {/* Coluna 1: Formulário de Criação */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 md:col-span-1">
        <h2 className="text-xl font-black text-slate-900 mb-4">Nova Fila</h2>
        <form onSubmit={handleCriarFila} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome</label>
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="Ex: Triagem"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Serviço</label>
            <input type="text" required value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="Ex: Geral"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tempo (min)</label>
            <input type="number" required value={tempoMedio} onChange={(e) => setTempoMedio(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm"/>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2 rounded-xl text-sm cursor-pointer hover:bg-blue-700">Criar Fila</button>
        </form>
      </div>

      {/* Coluna 2 e 3: Controle Operacional */}
      <div className="md:col-span-2 space-y-6">
        {/* Painel de Alerta de Última Senha Chamada por este Operador */}
        {senhaChamada && (
          <div className="bg-amber-500 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between animate-bounce">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Última Senha Chamada</p>
              <h3 className="text-5xl font-black">{senhaChamada}</h3>
            </div>
            <span className="text-sm font-bold bg-white/20 px-4 py-2 rounded-xl">Dirija-se ao Guichê</span>
          </div>
        )}

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">{error}</div>}
        {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">{success}</div>}

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-4">Painel de Chamadas</h2>
          <div className="divide-y divide-slate-100">
            {filas.map((fila) => (
              <div key={fila.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                <div>
                  <h3 className="font-bold text-slate-800">{fila.nome}</h3>
                  <p className="text-slate-400 text-xs">{fila.tipoServico}</p>
                </div>
                <button
                  onClick={() => chamarProxima(fila.id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs tracking-wide cursor-pointer shadow-sm uppercase"
                >
                  Chamar Próxima
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}