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
        api.get('/fila'),
        api.get('/fila/meus-atendimentos')
      ]);
      setFilas(resFilas.data);
      setMeusAtendimentos(resMeusAtendimentos.data);

      // Só calcula deslocamento se a fila vinculada possuir coordenadas no banco
      resMeusAtendimentos.data.forEach(ticket => {
        if (ticket.status === 'Aguardando' && ticket.fila?.id) {
          // Busca os dados completos da fila correspondente na lista de filas carregadas
          const dadosFilaCompleta = resFilas.data.find(f => f.id === ticket.fila.id);
          
          // Se a fila tiver latitude e longitude configuradas, faz o cálculo preditivo
          if (dadosFilaCompleta?.latitude && dadosFilaCompleta?.longitude) {
            obterAnaliseDeslocamento(ticket.id);
          }
        }
      });
    } catch (err) {
      setError('Erro ao carregar os dados das filas.');
    }
  };

  // Função para capturar a localização atual do navegador e consultar a API .NET
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

          // Armazena o resultado atrelando ao ID do atendimento correspondente
          setDadosDeslocamento(prev => ({
            ...prev,
            [atendimentoId]: response.data
          }));
        } catch (err) {
          console.error(`Erro ao calcular deslocamento para o ticket ${atendimentoId}:`, err);
        }
      },
      (error) => {
        console.warn('Permissão de localização negada pelo usuário.');
      }
    );
  };

  useEffect(() => {
  carregarDados();

  // Flag para rastrear se o componente ainda está ativo na tela
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
      // Só inicia se o componente não tiver sido desmontado pelo Strict Mode
      if (componenteAtivo && novaConexao.state === signalR.HubConnectionState.Disconnected) {
        await novaConexao.start();
        
        // Se após conectar, o Strict Mode já tiver matado o componente, aborta as escutas
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
          // Limpa o banner após 7 segundos
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
    // Sinaliza que este ciclo específico foi encerrado
    componenteAtivo = false;
    
    if (novaConexao) {
      novaConexao.off('AtualizarFila');
      novaConexao.off('FilaCriada');
      novaConexao.off('SenhaChamada');
      // Só para se estiver de fato ativo
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
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">FilaZero</h1>
          <p className="text-slate-500">Pegue sua senha remota e evite aglomerações</p>
        </div>

        {/* ANIMAÇÃO DE SENHA CHAMADA */}
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

        {/* Painel de Senhas Ativas do Usuário */}
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
                    {/* Badge de Status */}
                    <div className={`absolute top-0 right-0 text-white text-xs px-3 py-1 rounded-bl-xl font-bold uppercase tracking-wider ${
                      ticket.status === 'Chamado' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                    }`}>
                      {ticket.status}
                    </div>

                    {/* Informações do Cabeçalho do Card */}
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ticket.fila.nome}</p>
                      <h3 className={`text-4xl font-black my-2 ${ticket.status === 'Chamado' ? 'text-amber-500' : 'text-blue-600'}`}>{ticket.senha}</h3>
                    </div>

                    {/* --- PAINEL DE GEOLOCALIZAÇÃO PREDITIVA --- */}
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
                        <p className="pt-2 border-t border-dashed current-border font-semibold opacity-90">
                          💡 {analise.recomendacao}
                        </p>
                      </div>
                    )}

                    {/* --- ÁREA DE AÇÕES DINÂMICAS DO TICKET --- */}
                    <div className="mt-4">
                      {ticket.status === 'Aguardando' ? (
                        /* Cliente quer sair da fila por erro ou desistência */
                        <button
                          onClick={() => desistirFila(ticket.fila.id)}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          Sair da Fila de Espera
                        </button>
                      ) : (
                        /* Ticket já foi recebido/chamado, cliente limpa ele da tela */
                        <button
                          onClick={async () => {
                            try {
                              // Chamamos um endpoint para mudar o status para "Finalizado"
                              // Se você não tiver o endpoint estrito, simulamos mudando o status localmente ou batendo na API
                              await api.post(`/fila/finalizar-ticket`, { atendimentoId: ticket.id });
                              carregarDados(); // Recarrega para sumir da tela
                            } catch (err) {
                              // Fallback temporário caso queira testar antes de mexer no controller:
                              carregarDados();
                            }
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider shadow-sm text-center block"
                        >
                          ✓ Entendi, Limpar Painel
                        </button>
                      )}
                    </div>

                    {/* Rodapé Informativo */}
                    <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Sua Posição</p>
                        <p className="font-bold text-slate-700">
                          {ticket.status === 'Chamado' ? '🚨 NO GUICHÊ' : `${ticket.posicao}º lugar`}
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
                );
              })}
            </div>
          </div>
        )}

        {/* Listagem de Filas */}
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
                  Entrar na Fila
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}