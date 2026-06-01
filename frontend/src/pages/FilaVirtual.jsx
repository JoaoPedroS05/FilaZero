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
  const [temposRegressivos, setTemposRegressivos] = useState({});

  const carregarDados = async () => {
    try {
      const [resFilas, resMeusAtendimentos] = await Promise.all([
        api.get('/fila/publicas'),
        api.get('/fila/meus-atendimentos')
      ]);
      setFilas(resFilas.data);
      setMeusAtendimentos(resMeusAtendimentos.data);

      // Inicia ou atualiza o timer da FILA com os minutos calculados pelo backend
      resMeusAtendimentos.data.forEach(ticket => {
        if (ticket.status === 'Aguardando') {
          const tempoEsperaMinutos = ticket.tempoEstimadoEsperaMinutos ?? ticket.fila?.tempoEstimadoEsperaMinutos ?? 0;
          
          if (tempoEsperaMinutos > 0) {
            setTemposRegressivos(prev => ({
              ...prev,
              [ticket.id]: Math.round(tempoEsperaMinutos * 60)
            }));
          }
        }
        
        // Mantém a busca do deslocamento em background (sem interferir no timer principal)
        if (ticket.status === 'Aguardando' && ticket.fila?.latitude && ticket.fila?.longitude) {
          obterAnaliseDeslocamento(ticket.id);
        }
      });
    } catch (err) {
      setError('Erro ao carregar os dados das filas.');
    }
  };

  const obterAnaliseDeslocamento = (atendimentoId) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await api.post('/fila/calcular-deslocamento', {
            atendimentoId,
            latitudeCliente: latitude,
            longitudeCliente: longitude
          });

          // Higieniza e normaliza as propriedades para aceitar camelCase ou PascalCase vindo do C#
          const dadosNormalizados = {
            distanciaKm: response.data.distanciaKm ?? response.data.DistanciaKm ?? '0.0',
            tempoDeslocamentoMinutos: response.data.tempoDeslocamentoMinutos ?? response.data.TempoDeslocamentoMinutos ?? '0',
            recomendacao: response.data.recomendacao ?? response.data.Recomendacao ?? 'Acompanhe seu trajeto.',
            deveSairAgora: response.data.deveSairAgora ?? response.data.DeveSairAgora ?? false
          };

          setDadosDeslocamento(prev => ({
            ...prev,
            [atendimentoId]: dadosNormalizados
          }));
        } catch (err) {
          console.error(`Erro ao calcular deslocamento:`, err);
        }
      },
      (error) => console.warn('Localização indisponível.')
    );
  };

  // O CRONÔMETRO REGRESSIVO DA FILA (Roda a cada 1 segundo decrementando a matriz)
  useEffect(() => {
    const existemTimersAtivos = Object.values(temposRegressivos).some(segundos => segundos > 0);
    if (!existemTimersAtivos) return;

    const intervalo = setInterval(() => {
      setTemposRegressivos(prevTimers => {
        const novosTimers = { ...prevTimers };
        Object.keys(novosTimers).forEach(id => {
          if (novosTimers[id] > 0) {
            novosTimers[id] = novosTimers[id] - 1;
          }
        });
        return novosTimers;
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [temposRegressivos]);

  // FORMATADOR DO TIMER EM MM:SS
  const formatarCronometro = (atendimentoId) => {
    const totalSegundos = temposRegressivos[atendimentoId];
    if (totalSegundos === undefined) return "Calculando...";
    if (totalSegundos <= 0) return "Sua vez! 🚨";

    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
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
              <p className="text-xs font-black uppercase tracking-widest opacity-90 text-amber-100">Sua vez chegou!</p>
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

                    {/* TELEMETRIA RODOVIÁRIA (DADOS FIXOS ENVIADOS PELO BACKEND) */}
                    {ticket.status === 'Aguardando' && _typeof(analise) === 'object' && (
                      <div className={`mt-2 p-3 rounded-xl border text-xs font-medium space-y-0.5 ${
                        analise.deveSairAgora 
                          ? 'bg-red-50 border-red-200 text-red-800 animate-pulse' 
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}>
                        <p>📍 <b>Distância:</b> {analise.distanciaKm} km</p>
                        <p>🚘 <b>Tempo de Viagem estimado:</b> ~{analise.tempoDeslocamentoMinutos} min</p>
                        <p className="text-[10px] text-slate-500 pt-1 mt-1 border-t border-dashed border-slate-200">
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

                    {/* Footer do Ticket */}
                    <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between items-center text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Sua Posição</p>
                        <p className="font-bold text-slate-700">
                          {ticket.status === 'Chamado' ? '🚨 NO GUICHÊ' : `${ticket.posicao}º lugar`}
                        </p>
                      </div>
                      
                      {/* ⏳ O TIMER REGRESSIVO VIVO APLICADO À ATENDIMENTO/ESPERA DA FILA */}
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Tempo Estimado de Espera</p>
                        <p className={`font-mono font-bold text-base ${ticket.status === 'Chamado' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {ticket.status === 'Chamado' ? 'Imediato' : formatarCronometro(ticket.id)}
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
                    Requer QR Code
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

// Auxiliar seguro para checagem de objetos nulos/estruturados
function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }