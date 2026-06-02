import React from 'react'
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function FilaPrivada() {
  const { codigoAcesso } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fila, setFila] = useState(null);

  useEffect(() => {
    const processarAcessoQrCode = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Valida o código do QR Code com o novo endpoint do backend
        const resFila = await api.get(`/fila/acesso-privado/${codigoAcesso}`);
        setFila(resFila.data);

        // 2. Com a fila validada, coloca o cliente automaticamente nela!
        await api.post('/fila/entrar', { filaId: resFila.data.id });

        // 3. Sucesso! Redireciona o usuário para o painel onde ele vê a senha dele nascendo
        navigate('/filas');
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message || 
          'Não foi possível acessar a fila privada. O QR Code pode estar expirado ou incorreto.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (codigoAcesso) {
      processarAcessoQrCode();
    }
  }, [codigoAcesso, navigate]);

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center space-y-4">
        
        {loading && (
          <div className="space-y-3">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Validando QR Code...</h2>
            <p className="text-slate-500 text-sm">Aguarde enquanto processamos sua entrada na fila local.</p>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-black text-red-600 tracking-tight">Falha no Acesso</h2>
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">
              {error}
            </div>
            <Link 
              to="/filas" 
              className="inline-block bg-slate-900 text-white font-semibold px-6 py-2 rounded-xl text-sm hover:bg-slate-800 transition-colors"
            >
              Voltar para Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}