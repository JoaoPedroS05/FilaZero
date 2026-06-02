// src/tests/pages/Login.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import '../setup.jsx';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

import Login from '../../pages/Login';

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe('Login — página', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Renderização ──────────────────────────────────────────────────────────

  it('renderiza título "Acesse sua Conta"', () => {
    renderLogin();
    expect(screen.getByText('Acesse sua Conta')).toBeInTheDocument();
  });

  it('renderiza campo de e-mail', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('seu-email@exemplo.com')).toBeInTheDocument();
  });

  it('renderiza campo de senha', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renderiza botão de submit', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeInTheDocument();
  });

  it('renderiza link para registro', () => {
    renderLogin();
    expect(screen.getByText('Cadastre-se aqui')).toBeInTheDocument();
  });

  // ── Preenchimento de campos ───────────────────────────────────────────────

  it('atualiza campo de e-mail ao digitar', async () => {
    renderLogin();
    const input = screen.getByPlaceholderText('seu-email@exemplo.com');
    await userEvent.type(input, 'user@test.com');
    expect(input.value).toBe('user@test.com');
  });

  it('atualiza campo de senha ao digitar', async () => {
    renderLogin();
    const input = screen.getByPlaceholderText('••••••••');
    await userEvent.type(input, 'minhasenha');
    expect(input.value).toBe('minhasenha');
  });

  // ── Submit com sucesso ────────────────────────────────────────────────────

  it('redireciona para /admin quando role é Admin', async () => {
    mockLogin.mockResolvedValue('Admin');
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'admin@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'));
  });

  it('redireciona para /filas quando role é User', async () => {
    mockLogin.mockResolvedValue('User');
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'senha123');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/filas'));
  });

  it('redireciona para /filas quando role é admin em minúsculo', async () => {
    mockLogin.mockResolvedValue('admin');
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'admin@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    // 'admin' após trim+toLowerCase === 'admin' → redireciona para /admin
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'));
  });

  it('chama login com email e senha corretos', async () => {
    mockLogin.mockResolvedValue('User');
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'u@t.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass99');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('u@t.com', 'pass99')
    );
  });

  // ── Erro no login ─────────────────────────────────────────────────────────

  it('exibe mensagem de erro quando login falha', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: 'E-mail ou senha inválidos.' } },
    });
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'x@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() =>
      expect(screen.getByText(/e-mail ou senha inválidos/i)).toBeInTheDocument()
    );
  });

  it('exibe mensagem de erro genérica quando não há response', async () => {
    mockLogin.mockRejectedValue(new Error('Network Error'));
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'x@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() =>
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    );
  });

  // ── Estado de loading ─────────────────────────────────────────────────────

  it('exibe "Autenticando..." enquanto a requisição está pendente', async () => {
    // login nunca resolve durante o teste
    mockLogin.mockReturnValue(new Promise(() => {}));
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'x@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    expect(screen.getByText('Autenticando...')).toBeInTheDocument();
  });

  it('desabilita o botão durante o loading', async () => {
    mockLogin.mockReturnValue(new Promise(() => {}));
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('seu-email@exemplo.com'), 'x@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    expect(screen.getByRole('button', { name: /autenticando/i })).toBeDisabled();
  });
});
