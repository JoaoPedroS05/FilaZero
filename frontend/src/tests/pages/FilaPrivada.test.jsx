// src/tests/pages/FilaPrivada.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import '../setup.jsx';

// ─── Mock da API ──────────────────────────────────────────────────────────────
vi.mock('../../services/api', () => ({
  default: {
    get:  vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

import api from '../../services/api';
import FilaPrivada from '../../pages/FilaPrivada';

function renderFilaPrivada(codigo = 'abc12345') {
  return render(
    <MemoryRouter initialEntries={[`/entrar-fila/${codigo}`]}>
      <Routes>
        <Route path="/entrar-fila/:codigoAcesso" element={<FilaPrivada />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('FilaPrivada — página', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Estado de carregamento ────────────────────────────────────────────────

  it('exibe "Validando QR Code..." enquanto processa', () => {
    // GET nunca resolve durante este teste
    api.get.mockReturnValue(new Promise(() => {}));
    renderFilaPrivada();
    expect(screen.getByText('Validando QR Code...')).toBeInTheDocument();
  });

  it('exibe spinner de carregamento', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderFilaPrivada();
    // O spinner é um div com animate-spin; verifica pela mensagem de contexto
    expect(screen.getByText(/aguarde enquanto processamos/i)).toBeInTheDocument();
  });

  // ── Sucesso: entra na fila e redireciona ──────────────────────────────────

  it('redireciona para /filas após entrar com sucesso', async () => {
    api.get.mockResolvedValue({ data: { id: 5, nome: 'Raio-X', ativa: true } });
    api.post.mockResolvedValue({ data: { message: 'Entrou!' } });

    renderFilaPrivada('abc12345');

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/filas')
    );
  });

  it('chama GET /fila/acesso-privado/:codigo', async () => {
    api.get.mockResolvedValue({ data: { id: 5, nome: 'Lab', ativa: true } });
    api.post.mockResolvedValue({ data: {} });

    renderFilaPrivada('xyzabc99');

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/fila/acesso-privado/xyzabc99')
    );
  });

  it('chama POST /fila/entrar com o id da fila retornada', async () => {
    api.get.mockResolvedValue({ data: { id: 42, nome: 'Eco', ativa: true } });
    api.post.mockResolvedValue({ data: {} });

    renderFilaPrivada('eco00001');

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/fila/entrar', { filaId: 42 })
    );
  });

  // ── Erro: código inválido ─────────────────────────────────────────────────

  it('exibe "Falha no Acesso" quando código é inválido', async () => {
    api.get.mockRejectedValue({
      response: { data: { message: 'Fila privada não encontrada ou desativada.' } },
    });

    renderFilaPrivada('invalido');

    await waitFor(() =>
      expect(screen.getByText('Falha no Acesso')).toBeInTheDocument()
    );
  });

  it('exibe a mensagem de erro retornada pela API', async () => {
    api.get.mockRejectedValue({
      response: { data: { message: 'Fila privada não encontrada ou desativada.' } },
    });

    renderFilaPrivada('invalido');

    await waitFor(() =>
      expect(
        screen.getByText('Fila privada não encontrada ou desativada.')
      ).toBeInTheDocument()
    );
  });

  it('exibe mensagem genérica quando não há response de erro', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));

    renderFilaPrivada('semnet');

    await waitFor(() =>
      expect(
        screen.getByText(
          'Não foi possível acessar a fila privada. O QR Code pode estar expirado ou incorreto.'
        )
      ).toBeInTheDocument()
    );
  });

  it('exibe link "Voltar para Home" após erro', async () => {
    api.get.mockRejectedValue({ response: { data: { message: 'Erro.' } } });
    renderFilaPrivada('x');

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /voltar para home/i })).toBeInTheDocument()
    );
  });

  it('NÃO exibe mensagem de erro durante carregamento', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderFilaPrivada('loading');

    expect(screen.queryByText('Falha no Acesso')).not.toBeInTheDocument();
  });

  // ── Erro no POST de entrar ────────────────────────────────────────────────

  it('exibe erro se /fila/entrar falhar após validar o código', async () => {
    api.get.mockResolvedValue({ data: { id: 7, nome: 'Eco', ativa: true } });
    api.post.mockRejectedValue({
      response: { data: { message: 'Você já possui uma senha ativa nesta fila.' } },
    });

    renderFilaPrivada('abc99');

    await waitFor(() =>
      expect(screen.getByText('Falha no Acesso')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Você já possui uma senha ativa nesta fila.')
    ).toBeInTheDocument();
  });
});
