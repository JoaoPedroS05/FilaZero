// src/tests/pages/FilaVirtual.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import '../setup.jsx';

// ─── Mock da API ──────────────────────────────────────────────────────────────
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

import api from '../../services/api';
import FilaVirtual from '../../pages/FilaVirtual';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const filaPublica = {
  id: 1,
  nome: 'Triagem Geral',
  tipoServico: 'Atendimento Médico',
  tempoMedioAtendimento: 10,
  ehPublica: true,
  ativa: true,
};

const filaPrivada = {
  id: 2,
  nome: 'Raio-X',
  tipoServico: 'Exame',
  tempoMedioAtendimento: 15,
  ehPublica: false,
  ativa: true,
};

const ticketAguardando = {
  id: 10,
  senha: 'TRI-001',
  posicao: 1,
  status: 'Aguardando',
  dataHoraEntrada: new Date(Date.now() - 60_000).toISOString(), // 1 min atrás
  fila: {
    id: 1,
    nome: 'Triagem Geral',
    tipoServico: 'Atendimento Médico',
    ehPublica: true,
    latitude: -8.05,
    longitude: -34.88,
    tempoEstimadoEsperaMinutos: 10,
  },
};

const ticketChamado = {
  ...ticketAguardando,
  id: 11,
  senha: 'TRI-002',
  status: 'Chamado',
};

function mockApiDefault(overrides = {}) {
  // Garante que haja um token no localStorage para que o componente
  // carregue os dados em `carregarDados()` (o código aborta se não houver).
  localStorage.setItem('token', 'fake-token');

  api.get.mockImplementation((url) => {
    if (url === '/fila/publicas')
      return Promise.resolve({ data: overrides.filas ?? [filaPublica] });
    if (url === '/fila/meus-atendimentos')
      return Promise.resolve({ data: overrides.atendimentos ?? [] });
    return Promise.resolve({ data: [] });
  });
}

function renderFilaVirtual() {
  return render(
    <MemoryRouter>
      <FilaVirtual />
    </MemoryRouter>
  );
}

describe('FilaVirtual — página', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Renderização inicial ───────────────────────────────────────────────────

  it('renderiza título "SemFila"', async () => {
    mockApiDefault();
    renderFilaVirtual();
    await waitFor(() => expect(screen.getByText('SemFila')).toBeInTheDocument());
  });

  it('renderiza seção "Filas de Atendimento Disponíveis"', async () => {
    mockApiDefault();
    renderFilaVirtual();
    await waitFor(() =>
      expect(screen.getByText('Filas de Atendimento Disponíveis')).toBeInTheDocument()
    );
  });

  // ── Listagem de filas ──────────────────────────────────────────────────────

  it('exibe o nome de cada fila pública', async () => {
    mockApiDefault({ filas: [filaPublica, { ...filaPublica, id: 3, nome: 'Farmácia' }] });
    renderFilaVirtual();

    await waitFor(() => expect(screen.getByText('Triagem Geral')).toBeInTheDocument());
    expect(screen.getByText('Farmácia')).toBeInTheDocument();
  });

  it('exibe o tempo médio de cada fila', async () => {
    mockApiDefault();
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByText(/média: 10 min/i)).toBeInTheDocument()
    );
  });

  it('exibe botão "Entrar na Fila" para filas públicas', async () => {
    mockApiDefault();
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /entrar na fila/i })).toBeInTheDocument()
    );
  });

  it('exibe botão desabilitado "Requer QR Code" para filas privadas', async () => {
    mockApiDefault({ filas: [filaPrivada] });
    renderFilaVirtual();

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /requer qr code/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });

  it('lista vazia não exibe cards de fila', async () => {
    mockApiDefault({ filas: [] });
    renderFilaVirtual();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /entrar na fila/i })).not.toBeInTheDocument();
    });
  });

  // ── Entrar na fila ─────────────────────────────────────────────────────────

  it('chama POST /fila/entrar com o id correto ao clicar', async () => {
    mockApiDefault();
    api.post.mockResolvedValue({ data: { message: 'Entrou!', atendimento: ticketAguardando } });
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /entrar na fila/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /entrar na fila/i }));

    expect(api.post).toHaveBeenCalledWith('/fila/entrar', { filaId: 1 });
  });

  it('exibe mensagem de erro se entrar na fila falhar', async () => {
    mockApiDefault();
    api.post.mockRejectedValue({
      response: { data: { message: 'Você já possui uma senha ativa nesta fila.' } },
    });
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /entrar na fila/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /entrar na fila/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Você já possui uma senha ativa nesta fila.')
      ).toBeInTheDocument()
    );
  });

  // ── Tickets ativos ─────────────────────────────────────────────────────────

  it('exibe seção "Seus Tickets Ativos" quando há atendimentos', async () => {
    mockApiDefault({ atendimentos: [ticketAguardando] });
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByText('Seus Tickets Ativos')).toBeInTheDocument()
    );
  });

  it('exibe a senha do ticket ativo', async () => {
    mockApiDefault({ atendimentos: [ticketAguardando] });
    renderFilaVirtual();

    await waitFor(() => expect(screen.getByText('TRI-001')).toBeInTheDocument());
  });

  it('exibe posição do ticket aguardando', async () => {
    mockApiDefault({ atendimentos: [ticketAguardando] });
    renderFilaVirtual();

    await waitFor(() => expect(screen.getByText('1º lugar')).toBeInTheDocument());
  });

  it('exibe badge "AGUARDANDO" no ticket', async () => {
    mockApiDefault({ atendimentos: [ticketAguardando] });
    renderFilaVirtual();

    await waitFor(() => expect(screen.getByText('Aguardando')).toBeInTheDocument());
  });

  it('exibe badge "CHAMADO" quando ticket foi chamado', async () => {
    mockApiDefault({ atendimentos: [ticketChamado] });
    renderFilaVirtual();

    await waitFor(() => expect(screen.getByText('Chamado')).toBeInTheDocument());
  });

  it('não exibe seção de tickets quando não há atendimentos ativos', async () => {
    mockApiDefault({ atendimentos: [] });
    renderFilaVirtual();

    await waitFor(() => {
      expect(screen.queryByText('Seus Tickets Ativos')).not.toBeInTheDocument();
    });
  });

  // ── Sair da fila ──────────────────────────────────────────────────────────

  it('chama POST /fila/sair ao confirmar desistência', async () => {
    mockApiDefault({ atendimentos: [ticketAguardando] });
    api.post.mockResolvedValue({ data: { message: 'Saiu!' } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sair da fila/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /sair da fila/i }));

    expect(api.post).toHaveBeenCalledWith('/fila/sair', { filaId: 1 });
  });

  it('NÃO chama /fila/sair se o usuário cancelar o confirm', async () => {
    mockApiDefault({ atendimentos: [ticketAguardando] });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sair da fila/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /sair da fila/i }));

    expect(api.post).not.toHaveBeenCalledWith('/fila/sair', expect.anything());
  });

  // ── Finalizar ticket chamado ───────────────────────────────────────────────

  it('exibe botão "Limpar Painel" para ticket com status Chamado', async () => {
    mockApiDefault({ atendimentos: [ticketChamado] });
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /limpar painel/i })).toBeInTheDocument()
    );
  });

  it('chama POST /fila/finalizar-ticket ao limpar painel', async () => {
    mockApiDefault({ atendimentos: [ticketChamado] });
    api.post.mockResolvedValue({ data: { message: 'Finalizado!' } });
    renderFilaVirtual();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /limpar painel/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /limpar painel/i }));

    expect(api.post).toHaveBeenCalledWith('/fila/finalizar-ticket', {
      atendimentoId: ticketChamado.id,
    });
  });

  // ── Alerta SignalR ─────────────────────────────────────────────────────────

  it('não exibe alerta de chamada no estado inicial', async () => {
    mockApiDefault();
    renderFilaVirtual();
    // O alerta só aparece após evento SignalR; não deve estar presente no mount
    await waitFor(() =>
      expect(screen.queryByText(/sua vez chegou/i)).not.toBeInTheDocument()
    );
  });
});
