// src/tests/pages/Registro.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import '../setup.jsx';

// ─── Mock da instância axios ──────────────────────────────────────────────────
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

import api from '../../services/api';
import Registro from '../../pages/Registro';

function renderRegistro() {
  return render(
    <MemoryRouter>
      <Registro />
    </MemoryRouter>
  );
}

describe('Registro — página', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Renderização ──────────────────────────────────────────────────────────

  it('renderiza título "Criar Conta"', () => {
    renderRegistro();
    expect(screen.getByText('Criar Conta')).toBeInTheDocument();
  });

  it('renderiza campo Nome', () => {
    renderRegistro();
    expect(screen.getByPlaceholderText('Seu nome')).toBeInTheDocument();
  });

  it('renderiza campo E-mail', () => {
    renderRegistro();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
  });

  it('renderiza campo Senha', () => {
    renderRegistro();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renderiza botão Registrar', () => {
    renderRegistro();
    expect(screen.getByRole('button', { name: /registrar/i })).toBeInTheDocument();
  });

  // ── Preenchimento e submit ────────────────────────────────────────────────

  it('envia nome, email e senha corretos para a API', async () => {
    api.post.mockResolvedValue({ data: { message: 'Usuário cadastrado com sucesso!' } });
    renderRegistro();

    await userEvent.type(screen.getByPlaceholderText('Seu nome'), 'Maria');
    await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'maria@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'senha123');
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/registro', {
        nome: 'Maria',
        email: 'maria@test.com',
        senha: 'senha123',
      })
    );
  });

  it('exibe mensagem de sucesso após registro', async () => {
    api.post.mockResolvedValue({ data: { message: 'Usuário cadastrado com sucesso!' } });
    renderRegistro();

    await userEvent.type(screen.getByPlaceholderText('Seu nome'), 'Pedro');
    await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'pedro@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'senha456');
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() =>
      expect(screen.getByText('Usuário cadastrado com sucesso!')).toBeInTheDocument()
    );
  });

  it('limpa os campos após registro bem-sucedido', async () => {
    api.post.mockResolvedValue({ data: { message: 'OK!' } });
    renderRegistro();

    const nomeInput  = screen.getByPlaceholderText('Seu nome');
    const emailInput = screen.getByPlaceholderText('seu@email.com');
    const senhaInput = screen.getByPlaceholderText('••••••••');

    await userEvent.type(nomeInput,  'Lucas');
    await userEvent.type(emailInput, 'lucas@test.com');
    await userEvent.type(senhaInput, 'pass999');
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => expect(nomeInput.value).toBe(''));
    expect(emailInput.value).toBe('');
    expect(senhaInput.value).toBe('');
  });

  // ── Erro no registro ──────────────────────────────────────────────────────

  it('exibe mensagem de erro quando e-mail já está cadastrado', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Este e-mail já está cadastrado.' } },
    });
    renderRegistro();

    await userEvent.type(screen.getByPlaceholderText('Seu nome'), 'Ana');
    await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'dup@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() =>
      expect(screen.getByText('Este e-mail já está cadastrado.')).toBeInTheDocument()
    );
  });

  it('exibe erro genérico quando não há response da API', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));
    renderRegistro();

    await userEvent.type(screen.getByPlaceholderText('Seu nome'), 'Err');
    await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'err@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Ocorreu um erro ao realizar o cadastro.')
      ).toBeInTheDocument()
    );
  });

  it('não exibe bloco de erro no estado inicial', () => {
    renderRegistro();
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });

  it('não exibe bloco de sucesso no estado inicial', () => {
    renderRegistro();
    expect(screen.queryByText(/sucesso/i)).not.toBeInTheDocument();
  });
});
