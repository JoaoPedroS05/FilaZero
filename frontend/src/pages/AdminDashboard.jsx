import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminDashboard() {
  const [filas, setFilas] = useState([]);
  const [guiches, setGuiches] = useState([]);
  const [guicheSelecionado, setGuicheSelecionado] = useState(''); 

  const [nome, setNome] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [tempoMedio, setTempoMedio] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [senhaChamada, setSenhaChamada] = useState('');

  // Carrega filas e guichês ao montar a tela
  useEffect(() => {
    const inicializarPainel = async () => {
      try {
        const [resFilas, resGuiches] = await Promise.all([
          api.get('/fila'),
          api.get('/fila/guiches') 
        ]);
        setFilas(resFilas.data);
        setGuiches(resGuiches.data);
        
        // Pré-seleciona o primeiro guichê da lista se houver algum
        if (resGuiches.data.length > 0) {
          setGuicheSelecionado(resGuiches.data[0].id);
        }
      } catch (err) {
        console.error('Erro ao inicializar dados do painel.');
      }
    };

    inicializarPainel();
  }, []);

  const handleCriarFila = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/fila', {
        nome,
        tipoServico,
        tempoMedioAtendimento: parseInt(tempoMedio),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      });

      setSuccess('Nova fila criada com localização!');
      setNome(''); setTipoServico(''); setTempoMedio(''); setLatitude(''); setLongitude('');
      // Recarrega apenas as filas
      const res = await api.get('/fila');
      setFilas(res.data);
    } catch (err) {
      setError('Erro ao criar a fila. Verifique os dados.');
    }
  };

  // Função atualizada para enviar o GuicheId selecionado!
  const chamarProxima = async (filaId) => {
    setError('');
    setSenhaChamada('');

    if (!guicheSelecionado) {
      setError('Você precisa selecionar um guichê operacional antes de chamar uma senha.');
      return;
    }

    try {
      // Enviando os dados mapeados para o ChamarSenhaDto do .NET
      const response = await api.post('/fila/chamar-proxima', { 
        filaId,
        guicheId: parseInt(guicheSelecionado) 
      });
      setSenhaChamada(response.data.atendimento.senha);
    } catch (err) {
      setError(err.response?.data?.message || 'Ninguém aguardando nesta fila.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-5xl mx-auto grid md:grid-cols-3 gap-8 items-start">
      
      {/* Coluna 1: Formulário de Criação de Fila */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 md:col-span-1">
        <h2 className="text-xl font-black text-slate-900 mb-4">Nova Fila</h2>
        <form onSubmit={handleCriarFila} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome da Fila</label>
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500" placeholder="Ex: Triagem Geral"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Serviço</label>
            <input type="text" required value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500" placeholder="Ex: Atendimento Médico"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tempo Médio (min)</label>
            <input type="number" required value={tempoMedio} onChange={(e) => setTempoMedio(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500"/>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">📍 Coordenadas</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Latitude</label>
                <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500" placeholder="-8.0542"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Longitude</label>
                <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500" placeholder="-34.8813"/>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
            Criar Fila com Mapa
          </button>
        </form>
      </div>

      {/* Coluna 2 e 3: Controle Operacional */}
      <div className="md:col-span-2 space-y-6">
        
        {/* --- NOVO SELETOR DE GUICHÊ OPERACIONAL --- */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">⚙️ Posto de Trabalho</h3>
            <p className="text-xs text-slate-400">Identifique seu ponto físico de atendimento antes de chamar senhas</p>
          </div>
          <select 
            value={guicheSelecionado} 
            onChange={(e) => setGuicheSelecionado(e.target.value)}
            className="px-4 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 focus:outline-purple-500"
          >
            {guiches.map((g) => (
              <option key={g.id} value={g.id}>💼 {g.numeroOuNome}</option>
            ))}
          </select>
        </div>

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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-slate-400 text-xs">{fila.tipoServico}</p>
                    {fila.latitude && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">📍 Localizado</span>}
                  </div>
                </div>
                <button
                  onClick={() => chamarProxima(fila.id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs tracking-wide cursor-pointer shadow-sm uppercase transition-colors"
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