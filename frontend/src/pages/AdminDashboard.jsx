import { useState, useEffect } from 'react';
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

// IMPORTS DA API OFICIAL DO GOOGLE MAPS PARA REACT
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

export default function AdminDashboard() {
  const [filas, setFilas] = useState([]);
  const [guiches, setGuiches] = useState([]);
  const [guicheSelecionado, setGuicheSelecionado] = useState('');

  const [nome, setNome] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [tempoMedio, setTempoMedio] = useState('');
  const [ehPublica, setEhPublica] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [senhaChamada, setSenhaChamada] = useState('');

  const [latitude, setLatitude] = useState(null);  
  const [longitude, setLongitude] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [filaSelecionadaQr, setFilaSelecionadaQr] = useState(null);

  const handleMapaClick = (e) => {
    if (e.detail.latLng) {
      setLatitude(e.detail.latLng.lat);
      setLongitude(e.detail.latLng.lng);
    }
  };

  const abrirQrCode = (fila) => {
    setFilaSelecionadaQr(fila);
    setModalAberto(true);
  };

  const inicializarPainel = async () => {
    try {
      const [resFilas, resGuiches] = await Promise.all([
        api.get('/fila'),
        api.get('/fila/guiches') 
      ]);
      setFilas(resFilas.data);
      setGuiches(resGuiches.data);
      
      if (resGuiches.data.length > 0 && !guicheSelecionado) {
        setGuicheSelecionado(resGuiches.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao inicializar dados do painel.');
    }
  };

  useEffect(() => {
    inicializarPainel();

    // Captura a localização atual do Administrador para centrar o mapa
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.warn("Permissão de localização negada ou indisponível. Usando Recife como padrão.");
          // Fallback caso ele negue o GPS
          setLatitude(-8.0542);
          setLongitude(-34.8813);
        }
      );
    } else {
      // Fallback caso o navegador seja muito antigo e não suporte Geolocation
      setLatitude(-8.0542);
      setLongitude(-34.8813);
    }
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
        longitude: longitude ? parseFloat(longitude) : null,
        ehPublica,
      });

      setSuccess('Nova fila configurada com sucesso!');
      setNome('');
      setTipoServico('');
      setTempoMedio('');
      setEhPublica(true);

      const res = await api.get('/fila');
      setFilas(res.data);
    } catch (err) {
      setError('Erro ao criar a fila. Verifique os dados.');
    }
  };

  const chamarProxima = async (filaId) => {
    setError('');
    setSenhaChamada('');

    if (!guicheSelecionado) {
      setError('Você precisa selecionar um guichê operacional antes de chamar uma senha.');
      return;
    }

    try {
      const response = await api.post('/fila/chamar-proxima', {
        filaId,
        guicheId: parseInt(guicheSelecionado),
      });
      setSenhaChamada(response.data.atendimento.senha);
    } catch (err) {
      setError(err.response?.data?.message || 'Ninguém aguardando nesta fila.');
    }
  };

  const handleRemoverFila = async (filaId, nomeFila) => {
    if (
      !window.confirm(
        `AVISO: Deseja mesmo remover a fila "${nomeFila}"? Isso cancelará todos os atendimentos ativos dela.`
      )
    )
      return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/fila/${filaId}`);
      setSuccess(`Fila "${nomeFila}" removida com sucesso!`);

      const res = await api.get('/fila');
      setFilas(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover a fila de atendimento.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-5xl mx-auto grid md:grid-cols-3 gap-8 items-start">

      {/* Coluna 1: Formulário de Criação de Fila */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 md:col-span-1 space-y-4">
        <h2 className="text-xl font-black text-slate-900 mb-4">Nova Fila</h2>
        <form onSubmit={handleCriarFila} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome da Fila</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500"
              placeholder="Ex: Triagem Geral"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Serviço</label>
            <input
              type="text"
              required
              value={tipoServico}
              onChange={(e) => setTipoServico(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500"
              placeholder="Ex: Atendimento Médico"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tempo Médio (min)</label>
            <input
              type="number"
              required
              value={tempoMedio}
              onChange={(e) => setTempoMedio(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-blue-500"
            />
          </div>

          {/* SELETOR DE VISIBILIDADE DA FILA */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Privacidade de Acesso</label>
            <select
              value={ehPublica.toString()}
              onChange={(e) => setEhPublica(e.target.value === 'true')}
              className="w-full px-3 py-2 border rounded-xl text-sm bg-slate-50 focus:outline-blue-500 font-medium text-slate-700"
            >
              <option value="true">Fila Pública (Listagem Geral)</option>
              <option value="false">Fila Privada (Escondida / QR Code)</option>
            </select>
          </div>

          {/* SEÇÃO DO GOOGLE MAPS INTERATIVO */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">📍 Localização no Mapa</p>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                Clique para marcar
              </span>
            </div>

           <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 shadow-inner z-10 relative flex items-center justify-center bg-slate-50">
              {latitude !== null && longitude !== null ? (
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
                  <Map
                    defaultCenter={{ lat: latitude, lng: longitude }}
                    defaultZoom={15}
                    gestureHandling={'cooperative'}
                    disableDefaultUI={true}
                    onClick={handleMapaClick}
                    className="w-full h-full"
                  >
                    <Marker position={{ lat: latitude, lng: longitude }} />
                  </Map>
                </APIProvider>
              ) : (
                // Esqueleto visual de carregamento enquanto o GPS responde
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acessando GPS...</p>
                </div>
              )}
            </div>

            {/* Visualização de Auditoria de Coordenadas */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg border">
              <div>Lat: {latitude.toFixed(4)}</div>
              <div>Lng: {longitude.toFixed(4)}</div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm cursor-pointer hover:bg-blue-700 transition-colors shadow-sm"
          >
            Criar Configuração de Fila
          </button>
        </form>
      </div>

      {/* Coluna 2 e 3: Controle Operacional */}
      <div className="md:col-span-2 space-y-6">

        {/* SELETOR DE GUICHÊ OPERACIONAL */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Posto de Trabalho</h3>
            <p className="text-xs text-slate-400">
              Identifique seu ponto físico de atendimento antes de chamar senhas
            </p>
          </div>
          <select
            value={guicheSelecionado}
            onChange={(e) => setGuicheSelecionado(e.target.value)}
            className="px-4 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 focus:outline-purple-500"
          >
            {guiches.map((g) => (
              <option key={g.id} value={g.id}>
                💼 {g.numeroOuNome}
              </option>
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

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
            {success}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-4">Painel de Chamadas</h2>
          <div className="divide-y divide-slate-100">
            {filas &&
              filas
                .filter((fila) => fila.ativa)
                .map((fila) => (
                  /* CORREÇÃO: Removido o comentário JSX inválido que estava sendo retornado
                     diretamente pelo .map(). O fragmento agora retorna a div corretamente. */
                  <div
                    key={fila.id}
                    className="py-4 flex justify-between items-center first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">{fila.nome}</h3>
                        {fila.ehPublica ? (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                            Pública
                          </span>
                        ) : (
                          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-semibold">
                            Privada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-slate-400 text-xs">{fila.tipoServico}</p>
                        {fila.latitude && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            📍 Localizado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2">
                      {!fila.ehPublica && (
                        <button
                          onClick={() => abrirQrCode(fila)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
                          title="Ver QR Code do Totem"
                        >
                          📷 QR Code
                        </button>
                      )}
                      <button
                        onClick={() => chamarProxima(fila.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs tracking-wide cursor-pointer shadow-sm uppercase transition-colors"
                      >
                        Chamar Próxima
                      </button>
                      <button
                        onClick={() => handleRemoverFila(fila.id, fila.nome)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold p-2.5 rounded-xl text-xs cursor-pointer border border-red-200 transition-colors flex items-center justify-center"
                        title="Remover Fila"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* MODAL FLUTUANTE DE QR CODE */}
      {modalAberto && filaSelecionadaQr && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-4 border border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">{filaSelecionadaQr.nome}</h3>
              <p className="text-xs text-slate-400 mt-1">Totem de Autoatendimento Local</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 flex justify-center items-center mx-auto w-fit">
              <QRCodeSVG
                value={`http://localhost:5173/entrar-fila/${filaSelecionadaQr.codigoAcesso}`}
                size={160}
              />
            </div>

            <div className="space-y-1">
              <span className="block font-mono text-[11px] bg-slate-100 border px-2 py-1 rounded text-slate-600 w-full truncate">
                Token: {filaSelecionadaQr.codigoAcesso}
              </span>
              <p className="text-[10px] text-slate-400">
                Aponte a câmera do celular para realizar o check-in presencial automático.
              </p>
            </div>

            <button
              onClick={() => setModalAberto(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      )}
    </div>
  );
}