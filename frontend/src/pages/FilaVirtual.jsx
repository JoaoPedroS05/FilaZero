import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import api from '../services/api';

export default function FilaVirtual() {
  const [filas, setFilas] = useState([]);
  const [meusAtendimentos, setMeusAtendimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertaChamada, setAlertaChamada] = useState(null);
  const [dadosDeslocamento, setDadosDeslocamento] = useState({});

  const carregarDados = async () => {
    try {
      const [resFilas, resMeusAtendimentos] = await Promise.all([
        api.get('/fila/publicas'),
        api.get('/fila/meus-atendimentos')
      ]);
      setFilas(resFilas.data);
      setMeusAtendimentos(resMeusAtendimentos.data);

      // Dispara a análise olhando diretamente as coordenadas que vêm no próprio ticket
      resMeusAtendimentos.data.forEach(ticket => {
        if (ticket.status === 'Aguardando' && ticket.fila) {
          // Pega a latitude e longitude direto do objeto associado ao atendimento
          const lat = ticket.fila.latitude;
          const lng = ticket.fila.longitude;
          
          if (lat && lng) {
            obterAnaliseDeslocamento(ticket.id);
          } else {
            console.warn(`O ticket ${ticket.senha} da fila ${ticket.fila.nome} não possui coordenadas cadastradas no banco.`);
          }
        }
      });
    } catch (err) {
      setError('Erro ao carregar os dados das filas.');
    }
  };

  const obterAnaliseDeslocamento = (atendimentoId) => {
    if (!navigator.geolocation) {
      console.log('Geolocalização não suportada pelo seu navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await api.post('/fila/calcular-deslocamento', {
            atendimentoId,
            latitudeCliente: latitude,
            longitudeCliente: longitude
          });

          setDadosDeslocamento(prev => ({
            ...prev,
            [atendimentoId]: response.data
          }));
        } catch (err) {
          console.error(`Erro ao calcular deslocamento para o ticket ${atendimentoId}:`, err);
        }
      },
      (error) => {
        console.warn('Permissão de localização negada pelo usuário ou indisponível.');
      }
    );
  };

  useEffect(() => {
    carregarDados();

    let componenteAtivo = true;

    const novaConexao = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5033/hub/fila', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    const iniciarConexao = async () => {
      try {
        if (componenteAtivo && novaConexao.state === signalR.HubConnectionState.Disconnected) {
          await novaConexao.start();
          
          if (!componenteAtivo) {
            await novaConexao.stop();
            return;
          }

          console.log('Conectado ao SignalR com sucesso!');

          novaConexao.on('AtualizarFila', () => carregarDados());
          novaConexao.on('FilaCriada', () => carregarDados());
          novaConexao.on('SenhaChamada', (dados) => {
            setAlertaChamada({
              senha: dados.senha,
              guicheNome: dados.guicheNome || 'Guichê Padrão'
            });    
            setTimeout(() => setAlertaChamada(null), 7000);
          });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Erro no SignalR: ', err);
        }
      }
    };

    iniciarConexao();

    return () => {
      componenteAtivo = false;
      if (novaConexao) {
        novaConexao.off('AtualizarFila');
        novaConexao.off('FilaCriada');
        novaConexao.off('SenhaChamada');
        if (novaConexao.state === signalR.HubConnectionState.Connected) {
          novaConexao.stop();
        }
      }
    };
  }, []);

  const entrarFila = async (filaId) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/fila/entrar', { filaId });
      carregarDados();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível entrar na fila.');
    } finally {
      setLoading(false);
    }
  };

  const desistirFila = async (filaId) => {
    if (!window.confirm('Tem certeza que deseja sair desta fila de espera? Seu ticket será cancelado.')) return;
    try {
      await api.post('/fila/sair', { filaId });
      carregarDados();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível sair da fila.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">FilaZero</h1>
          <p className="text-slate-500 text-sm">Acompanhe seus agendamentos ou consulte o tempo de locomoção local</p>
        </div>

        {/* Alerta de Chamada Recorrente do SignalR */}
        {alertaChamada && (
          <div className="bg-amber-500 text-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse border-4 border-amber-400">
            <div className="text-center md:text-left">
              <p className="text-xs font-black uppercase tracking-widest opacity-90 text-amber-100">💥 Sua vez chegou! 💥</p>
              <h2 className="text-6xl font-black mt-1 tracking-tight">{alertaChamada.senha}</h2>
            </div>
            <div className="bg-white text-amber-600 font-extrabold px-6 py-3 rounded-2xl shadow-md text-sm uppercase tracking-wider animate-bounce text-center">
              Dirija-se ao <span className="text-slate-900 block text-lg font-black">{alertaChamada.guicheNome}</span>
            </div>
          </div>
        )}

        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl font-medium border border-red-100 text-sm">{error}</div>}

        {/* 1. SEÇÃO DE TICKETS ATIVOS DO CLIENTE */}
        {meusAtendimentos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Seus Tickets Ativos</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {meusAtendimentos.map((ticket) => {
                const analise = dadosDeslocamento[ticket.id];
                // Pega o tempo estimado correto que vem do objeto
                const tempoEspera = ticket.tempoEstimadoEsperaMinutos ?? ticket.fila?.tempoEstimadoEsperaMinutos ?? 0;

                return (
                  <div 
                    key={ticket.id} 
                    className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${
                      ticket.status === 'Chamado' ? 'border-amber-400 ring-4 ring-amber-500/10 bg-amber-50/10' : 'border-blue-100'
                    }`}
                  >
                    <div className={`absolute top-0 right-0 text-white text-xs px-3 py-1 rounded-bl-xl font-bold uppercase tracking-wider ${
                      ticket.status === 'Chamado' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                    }`}>
                      {ticket.status}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ticket.fila?.nome}</p>
                        {ticket.fila?.ehPublica === false}
                      </div>
                      <h3 className={`text-4xl font-black my-2 ${ticket.status === 'Chamado' ? 'text-amber-500' : 'text-blue-600'}`}>{ticket.senha}</h3>
                    </div>

                    {/* BLOCO DE GEOLOCALIZAÇÃO CONDICIONAL */}
                    {ticket.status === 'Aguardando' && analise && (
                      <div className={`mt-3 p-3.5 rounded-xl border text-xs font-medium space-y-1 ${
                        analise.deveSairAgora 
                          ? 'bg-red-50 border-red-200 text-red-800 animate-pulse' 
                          : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                      }`}>
                        <div className="flex justify-between font-bold">
                          <span>🚗 Distância do Local:</span>
                          <span>{analise.distanciaKm} km</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>⏱️ Tempo de Viagem:</span>
                          <span>~{analise.tempoDeslocamentoMinutos} min</span>
                        </div>
                        <p className="pt-2 border-t border-dashed border-slate-200 font-semibold opacity-90">
                          💡 {analise.recomendacao}
                        </p>
                      </div>
                    )}

                    <div className="mt-4">
                      {ticket.status === 'Aguardando' ? (
                        <button
                          onClick={() => desistirFila(ticket.fila?.id)}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          Sair da Fila de Espera
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await api.post(`/fila/finalizar-ticket`, { atendimentoId: ticket.id });
                              carregarDados();
                            } catch (err) {
                              carregarDados();
                            }
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider shadow-sm text-center block"
                        >
                          ✓ Entendi, Limpar Painel
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Sua Posição</p>
                        <p className="font-bold text-slate-700">
                          {ticket.status === 'Chamado' ? '🚨 NO GUICHÊ' : `${ticket.posicao}º lugar`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Tempo Estimado</p>
                        {/* 🔥 CORREÇÃO DA SINTAXE: Renderiza o valor injetado diretamente em JavaScript */}
                        <p className={`font-bold ${ticket.status === 'Chamado' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {ticket.status === 'Chamado' ? 'Imediato' : `~${tempoEspera} min`}
                        </p>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. SEÇÃO DE FILAS DISPONÍVEIS NA REGIÃO */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Filas de Atendimento Disponíveis</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {filas.map((fila) => (
              <div key={fila.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{fila.nome}</h3>
                    {fila.ehPublica === false}
                  </div>
                  <p className="text-slate-500 text-sm mt-1">{fila.tipoServico}</p>
                  <span className="inline-block mt-3 bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md">
                    Média: {fila.tempoMedioAtendimento} min / pessoa
                  </span>
                </div>

                {fila.ehPublica !== false ? (
                  <button
                    disabled={loading || !fila.ativa}
                    onClick={() => entrarFila(fila.id)}
                    className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-colors text-sm cursor-pointer disabled:opacity-50 uppercase tracking-wider font-bold"
                  >
                    Entrar na Fila
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full mt-6 bg-slate-100 text-slate-400 border border-slate-200 font-medium py-2.5 rounded-xl text-sm cursor-not-allowed uppercase tracking-wider font-bold"
                    title="Acesse este serviço escaneando o QR Code físico no totem local."
                  >
                    🔒 Requer QR Code
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}