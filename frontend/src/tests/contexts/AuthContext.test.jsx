// src/tests/contexts/AuthContext.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import React from 'react';
import '../setup.jsx';

// ─── Mock do módulo api ───────────────────────────────────────────────────────
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

import api from '../../services/api';

// ─── Helper: gera JWT falso com payload controlado ────────────────────────────
function makeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const sig = 'fakesig';
  return `${header}.${body}.${sig}`;
}

const CLAIM_ID = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const CLAIM_NAME = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const CLAIM_ROLE = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function makeUserToken(role = 'User', expOffsetMs = 3600 * 1000) {
  return makeJwt({
    [CLAIM_ID]: '42',
    [CLAIM_NAME]: 'Teste User',
    [CLAIM_ROLE]: role,
    exp: Math.floor((Date.now() + expOffsetMs) / 1000),
  });
}

// ─── Componente auxiliar que expõe o contexto via DOM ────────────────────────
function AuthConsumer() {
  const { authenticated, user, login, logout } = useAuth();
  const [err, setErr] = React.useState(null);
  return (
    <div>
      <span data-testid="auth">{authenticated ? 'sim' : 'nao'}</span>
      <span data-testid="role">{user?.role ?? ''}</span>
      <span data-testid="nome">{user?.nome ?? ''}</span>
      <button onClick={async () => {
        try {
          await login('a@b.com', 'pass');
          setErr(null);
        } catch (e) {
          setErr(e?.message ?? String(e));
        }
      }}>entrar</button>
      <span data-testid="error">{err ?? ''}</span>
      <button onClick={logout}>sair</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ── Estado inicial ─────────────────────────────────────────────────────────

  it('inicia não autenticado quando localStorage está vazio', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('nao');
    });
  });

  it('restaura sessão a partir do token salvo no localStorage', async () => {
    localStorage.setItem('token', makeUserToken('Admin'));
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('sim');
      expect(screen.getByTestId('role').textContent).toBe('Admin');
    });
  });

  it('ignora token expirado e inicia não autenticado', async () => {
    // exp no passado
    const expirado = makeJwt({
      [CLAIM_ID]: '1',
      [CLAIM_NAME]: 'Exp',
      [CLAIM_ROLE]: 'User',
      exp: Math.floor((Date.now() - 1000) / 1000),
    });
    localStorage.setItem('token', expirado);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('nao');
    });
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('remove token inválido (malformado) do localStorage', async () => {
    localStorage.setItem('token', 'nao.e.um.jwt.valido');
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('nao');
    });
    expect(localStorage.getItem('token')).toBeNull();
  });

  // ── Login ──────────────────────────────────────────────────────────────────

  it('login com sucesso autentica o usuário', async () => {
    api.post.mockResolvedValue({ data: { token: makeUserToken('User') } });
    renderWithAuth();

    await act(async () => {
      await userEvent.click(screen.getByText('entrar'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('sim');
    });
  });

  it('login salva token no localStorage', async () => {
    const token = makeUserToken('User');
    api.post.mockResolvedValue({ data: { token } });
    renderWithAuth();

    await act(async () => {
      await userEvent.click(screen.getByText('entrar'));
    });

    expect(localStorage.getItem('token')).toBe(token);
  });

  it('login com role Admin retorna "Admin" (capitalizado)', async () => {
    api.post.mockResolvedValue({ data: { token: makeUserToken('Admin') } });
    renderWithAuth();

    await act(async () => {
      await userEvent.click(screen.getByText('entrar'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('Admin');
    });
  });

  it('login com role "admin" (minúsculo) também capitaliza para "Admin"', async () => {
    api.post.mockResolvedValue({ data: { token: makeUserToken('admin') } });
    renderWithAuth();

    await act(async () => {
      await userEvent.click(screen.getByText('entrar'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('Admin');
    });
  });

  it('login sem token na resposta lança erro', async () => {
    api.post.mockResolvedValue({ data: {} }); // sem token
    renderWithAuth();

    await act(async () => {
      await userEvent.click(screen.getByText('entrar'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('');
    });
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  it('logout remove autenticação', async () => {
    localStorage.setItem('token', makeUserToken('User'));
    renderWithAuth();

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('sim'));

    await act(async () => {
      await userEvent.click(screen.getByText('sair'));
    });

    expect(screen.getByTestId('auth').textContent).toBe('nao');
  });

  it('logout remove token do localStorage', async () => {
    localStorage.setItem('token', makeUserToken('User'));
    renderWithAuth();

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('sim'));

    await act(async () => {
      await userEvent.click(screen.getByText('sair'));
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('logout zera dados do usuário', async () => {
    localStorage.setItem('token', makeUserToken('Admin'));
    renderWithAuth();

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('Admin'));

    await act(async () => {
      await userEvent.click(screen.getByText('sair'));
    });

    expect(screen.getByTestId('role').textContent).toBe('');
    expect(screen.getByTestId('nome').textContent).toBe('');
  });
});
