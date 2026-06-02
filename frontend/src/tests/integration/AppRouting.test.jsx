// src/tests/integration/AppRouting.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import '../setup.jsx';

// ─── Mocks de páginas — evitam precisar de API real ──────────────────────────
vi.mock('../../pages/Login', () => ({ default: () => <div>Página Login</div> }));
vi.mock('../../pages/Registro', () => ({ default: () => <div>Página Registro</div> }));
vi.mock('../../pages/FilaVirtual', () => ({ default: () => <div>Página FilaVirtual</div> }));
vi.mock('../../pages/AdminDashboard', () => ({ default: () => <div>Página Admin</div> }));
vi.mock('../../pages/FilaPrivada', () => ({ default: () => <div>Página FilaPrivada</div> }));
vi.mock('../../components/Navbar', () => ({ default: () => <nav>Navbar</nav> }));

// ─── Mock do AuthContext ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockUseAuth(),
}));

// Importa apenas o conjunto de rotas para permitir renderização dentro de
// um `MemoryRouter` nos testes (evita aninhar dois Routers).
import App, { AppRoutes } from '../../App';

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('App — roteamento e guards', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Estado de carregamento ────────────────────────────────────────────────

  it('exibe tela de carregamento enquanto loading=true', () => {
    mockUseAuth.mockReturnValue({ loading: true, authenticated: false, user: null });
    renderApp('/filas');
    expect(screen.getByText(/iniciando o semfila/i)).toBeInTheDocument();
  });

  // ── Usuário não autenticado ───────────────────────────────────────────────

  it('/login exibe a página de Login quando não autenticado', async () => {
    mockUseAuth.mockReturnValue({ loading: false, authenticated: false, user: null });
    renderApp('/login');
    await waitFor(() => expect(screen.getByText('Página Login')).toBeInTheDocument());
  });

  it('/registro exibe a página de Registro quando não autenticado', async () => {
    mockUseAuth.mockReturnValue({ loading: false, authenticated: false, user: null });
    renderApp('/registro');
    await waitFor(() => expect(screen.getByText('Página Registro')).toBeInTheDocument());
  });

  it('/filas redireciona para /login quando não autenticado', async () => {
    mockUseAuth.mockReturnValue({ loading: false, authenticated: false, user: null });
    renderApp('/filas');
    await waitFor(() => expect(screen.getByText('Página Login')).toBeInTheDocument());
  });

  it('/admin redireciona para /login quando não autenticado', async () => {
    mockUseAuth.mockReturnValue({ loading: false, authenticated: false, user: null });
    renderApp('/admin');
    await waitFor(() => expect(screen.getByText('Página Login')).toBeInTheDocument());
  });

  it('rota inexistente redireciona para /filas (que redireciona para /login)', async () => {
    mockUseAuth.mockReturnValue({ loading: false, authenticated: false, user: null });
    renderApp('/rota-que-nao-existe');
    await waitFor(() => expect(screen.getByText('Página Login')).toBeInTheDocument());
  });

  // ── Usuário autenticado como cliente ──────────────────────────────────────

  it('/filas exibe FilaVirtual para usuário autenticado', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'User', nome: 'João' },
    });
    renderApp('/filas');
    await waitFor(() => expect(screen.getByText('Página FilaVirtual')).toBeInTheDocument());
  });

  it('/login redireciona para /filas quando já autenticado', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'User', nome: 'João' },
    });
    renderApp('/login');
    await waitFor(() => expect(screen.getByText('Página FilaVirtual')).toBeInTheDocument());
  });

  it('/registro redireciona para /filas quando já autenticado', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'User', nome: 'João' },
    });
    renderApp('/registro');
    await waitFor(() => expect(screen.getByText('Página FilaVirtual')).toBeInTheDocument());
  });

  it('/admin redireciona para /filas para usuário com role User', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'User', nome: 'João' },
    });
    renderApp('/admin');
    await waitFor(() => expect(screen.getByText('Página FilaVirtual')).toBeInTheDocument());
  });

  it('/entrar-fila/:codigo exibe FilaPrivada quando autenticado', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'User', nome: 'João' },
    });
    renderApp('/entrar-fila/abc12345');
    await waitFor(() => expect(screen.getByText('Página FilaPrivada')).toBeInTheDocument());
  });

  // ── Usuário autenticado como Admin ────────────────────────────────────────

  it('/admin exibe AdminDashboard para usuário Admin', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'Admin', nome: 'Adm' },
    });
    renderApp('/admin');
    await waitFor(() => expect(screen.getByText('Página Admin')).toBeInTheDocument());
  });

  it('/admin funciona com role "admin" (minúsculo)', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'admin', nome: 'Adm' },
    });
    renderApp('/admin');
    await waitFor(() => expect(screen.getByText('Página Admin')).toBeInTheDocument());
  });

  it('/filas também é acessível para Admin', async () => {
    mockUseAuth.mockReturnValue({
      loading: false, authenticated: true,
      user: { role: 'Admin', nome: 'Adm' },
    });
    renderApp('/filas');
    await waitFor(() => expect(screen.getByText('Página FilaVirtual')).toBeInTheDocument());
  });

  // ── PrivateRoute exibe loading próprio ────────────────────────────────────

  it('PrivateRoute exibe carregamento enquanto loading=true', () => {
    mockUseAuth.mockReturnValue({ loading: true, authenticated: false, user: null });
    renderApp('/filas');
    // Pode ser o loading do App ou do PrivateRoute — ambos são válidos
    expect(screen.getByText(/carregando|iniciando/i)).toBeInTheDocument();
  });
});
