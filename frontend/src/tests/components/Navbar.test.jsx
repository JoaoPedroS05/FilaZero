// src/tests/components/Navbar.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import '../setup.jsx';

// ─── Mock do AuthContext ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import Navbar from '../../components/Navbar';

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Usuário não autenticado ───────────────────────────────────────────────

  it('exibe link "Entrar" quando não autenticado', () => {
    mockUseAuth.mockReturnValue({ authenticated: false, user: null, logout: vi.fn() });
    renderNavbar();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });

  it('não exibe "Sair" quando não autenticado', () => {
    mockUseAuth.mockReturnValue({ authenticated: false, user: null, logout: vi.fn() });
    renderNavbar();
    expect(screen.queryByText('Sair')).not.toBeInTheDocument();
  });

  it('não exibe "Filas Virtuais" quando não autenticado', () => {
    mockUseAuth.mockReturnValue({ authenticated: false, user: null, logout: vi.fn() });
    renderNavbar();
    expect(screen.queryByText('Filas Virtuais')).not.toBeInTheDocument();
  });

  it('não exibe "Painel Admin" quando não autenticado', () => {
    mockUseAuth.mockReturnValue({ authenticated: false, user: null, logout: vi.fn() });
    renderNavbar();
    expect(screen.queryByText('Painel Admin')).not.toBeInTheDocument();
  });

  // ── Usuário cliente autenticado ───────────────────────────────────────────

  it('exibe "Sair" quando autenticado', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: 'User', nome: 'João' },
      logout: vi.fn(),
    });
    renderNavbar();
    expect(screen.getByText('Sair')).toBeInTheDocument();
  });

  it('exibe "Filas Virtuais" quando autenticado', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: 'User', nome: 'João' },
      logout: vi.fn(),
    });
    renderNavbar();
    expect(screen.getByText('Filas Virtuais')).toBeInTheDocument();
  });

  it('não exibe "Painel Admin" para role User', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: 'User', nome: 'João' },
      logout: vi.fn(),
    });
    renderNavbar();
    expect(screen.queryByText('Painel Admin')).not.toBeInTheDocument();
  });

  it('não exibe "Entrar" quando autenticado', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: 'User', nome: 'João' },
      logout: vi.fn(),
    });
    renderNavbar();
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument();
  });

  // ── Usuário Admin autenticado ─────────────────────────────────────────────

  it('exibe "Painel Admin" para role Admin', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: 'Admin', nome: 'Adm' },
      logout: vi.fn(),
    });
    renderNavbar();
    expect(screen.getByText('Painel Admin')).toBeInTheDocument();
  });

  it('exibe "Painel Admin" mesmo com role em minúsculo (admin)', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: 'admin', nome: 'Adm' },
      logout: vi.fn(),
    });
    renderNavbar();
    expect(screen.getByText('Painel Admin')).toBeInTheDocument();
  });

  it('exibe "Painel Admin" com espaço na role ("  Admin  ")', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: '  Admin  ', nome: 'Adm' },
      logout: vi.fn(),
    });
    renderNavbar();
    expect(screen.getByText('Painel Admin')).toBeInTheDocument();
  });

  // ── Ação de logout ────────────────────────────────────────────────────────

  it('chama logout ao clicar em "Sair"', async () => {
    const logoutMock = vi.fn();
    mockUseAuth.mockReturnValue({
      authenticated: true,
      user: { role: 'User', nome: 'João' },
      logout: logoutMock,
    });
    renderNavbar();

    await userEvent.click(screen.getByText('Sair'));

    expect(logoutMock).toHaveBeenCalledOnce();
  });

  // ── Logo / brand ─────────────────────────────────────────────────────────

  it('exibe o nome do app "SemFila"', () => {
    mockUseAuth.mockReturnValue({ authenticated: false, user: null, logout: vi.fn() });
    renderNavbar();
    expect(screen.getByText('SemFila')).toBeInTheDocument();
  });
});
