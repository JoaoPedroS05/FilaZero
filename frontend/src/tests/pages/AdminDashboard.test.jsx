// src/tests/pages/AdminDashboard.test.jsx
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
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

import api from '../../services/api';
import AdminDashboard from '../../pages/AdminDashboard';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const guiches = [
  { id: 1, numeroOuNome: 'Guichê 01', ativo: true },
  { id: 2, numeroOuNome: 'Guichê 02', ativo: true },
];

const filaPublica = {
  id: 10,
  nome: 'Triagem',
  tipoServico: 'Médico',
  tempoMedioAtendimento: 10,
  ehPublica: true,
  ativa: true,
  latitude: null,
  codigoAcesso: '',
};

const filaPrivada = {
  id: 11,
  nome: 'RX Tórax',
  tipoServico: 'Exame',
  tempoMedioAtendimento: 15,
  ehPublica: false,
  ativa: true,
  latitude: -8.05,
  codigoAcesso: 'abc12345',
};

function mockApiDefault(overrides = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/fila')
      return Promise.resolve({ data: overrides.filas ?? [filaPublica] });
    if (url === '/fila/guiches')
      return Promise.resolve({ data: overrides.guiches ?? guiches });
    return Promise.resolve({ data: [] });
  });
}

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );
}

describe('AdminDashboard — página', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Renderização ──────────────────────────────────────────────────────────

  it('renderiza título "Nova Fila"', async () => {
    mockApiDefault();
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Nova Fila')).toBeInTheDocument());
  });

  it('renderiza título "Painel de Chamadas"', async () => {
    mockApiDefault();
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Painel de Chamadas')).toBeInTheDocument());
  });

  it('renderiza o formulário de nova fila com os campos obrigatórios', async () => {
    mockApiDefault();
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ex: Triagem Geral')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ex: Atendimento Médico')).toBeInTheDocument();
    });
  });

  // ── Listagem de filas ──────────────────────────────────────────────────────

  it('exibe filas ativas no painel de chamadas', async () => {
    mockApiDefault();
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Triagem')).toBeInTheDocument());
  });

  it('exibe badge "Pública" para fila pública', async () => {
    mockApiDefault();
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Pública')).toBeInTheDocument());
  });

  it('exibe badge "Privada" para fila privada', async () => {
    mockApiDefault({ filas: [filaPrivada] });
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Privada')).toBeInTheDocument());
  });

  it('exibe botão "Chamar Próxima" para cada fila ativa', async () => {
    mockApiDefault({ filas: [filaPublica, filaPrivada] });
    renderAdmin();
    await waitFor(() => {
      const botoes = screen.getAllByRole('button', { name: /chamar próxima/i });
      expect(botoes).toHaveLength(2);
    });
  });

  it('exibe botão "QR Code" somente para filas privadas', async () => {
    mockApiDefault({ filas: [filaPublica, filaPrivada] });
    renderAdmin();
    await waitFor(() => {
      const qrBtns = screen.getAllByTitle('Ver QR Code do Totem');
      expect(qrBtns).toHaveLength(1);
    });
  });

  it('NÃO exibe botão QR Code para fila pública', async () => {
    mockApiDefault({ filas: [filaPublica] });
    renderAdmin();
    await waitFor(() => {
      expect(screen.queryByTitle('Ver QR Code do Totem')).not.toBeInTheDocument();
    });
  });

  it('exibe ícone 📍 para filas com localização configurada', async () => {
    mockApiDefault({ filas: [filaPrivada] }); // filaPrivada tem latitude
    renderAdmin();
    await waitFor(() => expect(screen.getByText('📍 Localizado')).toBeInTheDocument());
  });

  // ── Criar fila ────────────────────────────────────────────────────────────

  it('chama POST /fila com dados corretos ao submeter formulário', async () => {
    mockApiDefault();
    api.post.mockResolvedValue({ data: { message: 'Criada!' } });
    renderAdmin();

    await waitFor(() => expect(screen.getByPlaceholderText('Ex: Triagem Geral')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('Ex: Triagem Geral'), 'Nova Fila');
    await userEvent.type(screen.getByPlaceholderText('Ex: Atendimento Médico'), 'Enfermagem');
    await userEvent.type(screen.getByRole('spinbutton'), '7');
    await userEvent.click(screen.getByRole('button', { name: /criar configuração/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/fila',
        expect.objectContaining({ nome: 'Nova Fila', tipoServico: 'Enfermagem' })
      )
    );
  });

  it('exibe mensagem de sucesso após criar fila', async () => {
    mockApiDefault();
    api.post.mockResolvedValue({ data: {} });
    api.get.mockResolvedValue({ data: [] }); // refresh
    renderAdmin();

    await waitFor(() => expect(screen.getByPlaceholderText('Ex: Triagem Geral')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('Ex: Triagem Geral'), 'Fila X');
    await userEvent.type(screen.getByPlaceholderText('Ex: Atendimento Médico'), 'Geral');
    await userEvent.type(screen.getByRole('spinbutton'), '5');
    await userEvent.click(screen.getByRole('button', { name: /criar configuração/i }));

    await waitFor(() =>
      expect(screen.getByText('Nova fila configurada com sucesso!')).toBeInTheDocument()
    );
  });

  it('exibe erro se a criação de fila falhar', async () => {
    mockApiDefault();
    api.post.mockRejectedValue(new Error('Server error'));
    renderAdmin();

    await waitFor(() => expect(screen.getByPlaceholderText('Ex: Triagem Geral')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('Ex: Triagem Geral'), 'Fila Err');
    await userEvent.type(screen.getByPlaceholderText('Ex: Atendimento Médico'), 'Geral');
    await userEvent.type(screen.getByRole('spinbutton'), '5');
    await userEvent.click(screen.getByRole('button', { name: /criar configuração/i }));

    await waitFor(() =>
      expect(screen.getByText('Erro ao criar a fila. Verifique os dados.')).toBeInTheDocument()
    );
  });

  // ── Chamar próxima senha ───────────────────────────────────────────────────

  it('chama POST /fila/chamar-proxima com filaId e guicheId', async () => {
    mockApiDefault();
    api.post.mockResolvedValue({
      data: { atendimento: { senha: 'TRI-001' }, message: 'Chamada!' },
    });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /chamar próxima/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /chamar próxima/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/fila/chamar-proxima', {
        filaId: filaPublica.id,
        guicheId: guiches[0].id,
      })
    );
  });

  it('exibe a senha chamada após chamar próxima', async () => {
    mockApiDefault();
    api.post.mockResolvedValue({
      data: { atendimento: { senha: 'TRI-007' }, message: 'ok' },
    });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /chamar próxima/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /chamar próxima/i }));

    await waitFor(() => expect(screen.getByText('TRI-007')).toBeInTheDocument());
  });

  it('exibe erro quando fila está vazia ao chamar próxima', async () => {
    mockApiDefault();
    api.post.mockRejectedValue({
      response: { data: { message: 'Não há nenhuma senha aguardando nesta fila.' } },
    });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /chamar próxima/i })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: /chamar próxima/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Não há nenhuma senha aguardando nesta fila.')
      ).toBeInTheDocument()
    );
  });

  // ── Remover fila ──────────────────────────────────────────────────────────

  it('chama DELETE /fila/:id ao confirmar remoção', async () => {
    mockApiDefault();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.delete.mockResolvedValue({ data: { message: 'Removida!' } });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByTitle('Remover Fila')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTitle('Remover Fila'));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith(`/fila/${filaPublica.id}`)
    );
  });

  it('NÃO chama DELETE se o usuário cancelar o confirm', async () => {
    mockApiDefault();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByTitle('Remover Fila')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTitle('Remover Fila'));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('exibe sucesso após remover fila', async () => {
    mockApiDefault();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.delete.mockResolvedValue({ data: { message: 'ok' } });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByTitle('Remover Fila')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTitle('Remover Fila'));

    await waitFor(() =>
      expect(screen.getByText(/removida com sucesso/i)).toBeInTheDocument()
    );
  });

  // ── Modal QR Code ──────────────────────────────────────────────────────────

  it('abre modal de QR Code ao clicar no botão "QR Code"', async () => {
    mockApiDefault({ filas: [filaPrivada] });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByTitle('Ver QR Code do Totem')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTitle('Ver QR Code do Totem'));

    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });

  it('modal exibe o nome da fila privada', async () => {
    mockApiDefault({ filas: [filaPrivada] });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByTitle('Ver QR Code do Totem')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTitle('Ver QR Code do Totem'));

    const modal = screen.getByTestId('qr-modal');
    const { getByText: getByTextWithin } = within(modal);
    expect(getByTextWithin('RX Tórax')).toBeInTheDocument();
  });

  it('modal exibe o código de acesso da fila', async () => {
    mockApiDefault({ filas: [filaPrivada] });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByTitle('Ver QR Code do Totem')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTitle('Ver QR Code do Totem'));

    expect(screen.getByText(`Token: ${filaPrivada.codigoAcesso}`)).toBeInTheDocument();
  });

  it('fecha o modal ao clicar em "Fechar Janela"', async () => {
    mockApiDefault({ filas: [filaPrivada] });
    renderAdmin();

    await waitFor(() =>
      expect(screen.getByTitle('Ver QR Code do Totem')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTitle('Ver QR Code do Totem'));
    await userEvent.click(screen.getByRole('button', { name: /fechar janela/i }));

    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  // ── Seletor de guichê ──────────────────────────────────────────────────────

  it('exibe o select de guichê com as opções corretas', async () => {
    mockApiDefault();
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('💼 Guichê 01')).toBeInTheDocument();
      expect(screen.getByText('💼 Guichê 02')).toBeInTheDocument();
    });
  });
});
