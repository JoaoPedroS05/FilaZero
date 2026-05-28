import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import api from '../services/api';

export default function FilaVirtual() {
  const [filas, setFilas] = useState([]);
  const [meusAtendimentos, setMeusAtendimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertaChamada, setAlertaChamada] = useState(null);

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

    const novaConexao = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5033/hub/fila', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    novaConexao.start()
      .then(() => {
        console.log('Conectado ao SignalR com sucesso!');

        novaConexao.on('AtualizarFila', (filaId) => {
          carregarDados();
        });

        novaConexao.on('FilaCriada', () => {
          carregarDados();
        });

        // 1. ESCUTANDO O EVENTO DE SENHA CHAMADA
        novaConexao.on('SenhaChamada', (dados) => {
          // Verifica se a senha chamada pertence aos tickets ativos deste usuário na tela
          const eMinhaSenha = meusAtendimentos.some(ticket => ticket.senha === dados.senha);
          // if (eMinhaSenha) {

          setAlertaChamada(dados.senha);
          
          // Remove o alerta visual da tela após 7 segundos
          setTimeout(() => {
            setAlertaChamada(null);
          }, 7000);

          // }
        });
      })
      .catch(err => console.error('Erro ao conectar ao Hub do SignalR: ', err));

    return () => {
      if (novaConexao) {
        novaConexao.off('AtualizarFila');
        novaConexao.off('FilaCriada');
        novaConexao.off('SenhaChamada');
        novaConexao.stop();
      }
    };
  }, [meusAtendimentos]);

  const entrarFila = async (filaId) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/fila/entrar', { filaId });
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

        {/* 2. ANIMAÇÃO DE SENHA CHAMADA (PISCA EM AMBER) */}
        {alertaChamada && (
          <div className="bg-amber-500 text-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse border-4 border-amber-400">
            <div className="text-center md:text-left">
              <p className="text-xs font-black uppercase tracking-widest opacity-90 text-amber-100">💥 Atenção! Sua vez chegou 💥</p>
              <h2 className="text-6xl font-black mt-1 tracking-tight">{alertaChamada}</h2>
            </div>
            <div className="bg-white text-amber-600 font-extrabold px-6 py-3 rounded-2xl shadow-md text-sm uppercase tracking-wider animate-bounce">
              Compareça ao Guichê de Atendimento
            </div>
          </div>
        )}

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
                <div 
                  key={ticket.id} 
                  className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${
                    ticket.status === 'Chamado' ? 'border-amber-400 ring-4 ring-amber-500/10' : 'border-blue-100'
                  }`}
                >
                  <div className={`absolute top-0 right-0 text-white text-xs px-3 py-1 rounded-bl-xl font-bold uppercase tracking-wider ${
                    ticket.status === 'Chamado' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                  }`}>
                    {ticket.status}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ticket.fila.nome}</p>
                    <h3 className={`text-4xl font-black my-2 transition-colors ${
                      ticket.status === 'Chamado' ? 'text-amber-500' : 'text-blue-600'
                    }`}>{ticket.senha}</h3>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Sua Posição</p>
                      <p className="font-bold text-slate-700">
                        {ticket.status === 'Chamado' ? '🚨 CHAMADO' : `${ticket.posicao}º lugar`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Tempo Estimado</p>
                      <p className={`font-bold ${ticket.status === 'Chamado' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {ticket.status === 'Chamado' ? 'Imediato' : `~${ticket.fila.tempoEstimadoEsperaMinutos} min`}
                      </p>
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
                  disabled={loading || !fila.active && !fila.ativa}
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