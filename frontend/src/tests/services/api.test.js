// src/tests/services/api.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Testa o módulo src/services/api.js de forma isolada.
 *
 * A instância axios é criada no module-level, então usamos
 * vi.resetModules() entre testes que dependem de localStorage diferente
 * para garantir que o interceptor leia sempre o estado atual.
 */

describe('api.js — configuração do cliente HTTP', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── baseURL ──────────────────────────────────────────────────────────────

  it('usa http://localhost:5033/api como baseURL padrão', async () => {
    const { default: api } = await import('../../services/api');
    expect(api.defaults.baseURL).toBe('http://localhost:5033/api');
  });

  it('Content-Type padrão é application/json', async () => {
    const { default: api } = await import('../../services/api');
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  // ── Interceptor de autenticação ───────────────────────────────────────────

  it('adiciona header Authorization quando há token no localStorage', async () => {
    localStorage.setItem('token', 'meu-jwt-token');
    const { default: api } = await import('../../services/api');

    // Simula o que o interceptor faria ao processar um config de request
    const fakeConfig = { headers: {} };
    const interceptorFn = api.interceptors.request.handlers[0].fulfilled;
    const resultado = interceptorFn(fakeConfig);

    expect(resultado.headers.Authorization).toBe('Bearer meu-jwt-token');
  });

  it('NÃO adiciona Authorization quando localStorage está vazio', async () => {
    const { default: api } = await import('../../services/api');

    const fakeConfig = { headers: {} };
    const interceptorFn = api.interceptors.request.handlers[0].fulfilled;
    const resultado = interceptorFn(fakeConfig);

    expect(resultado.headers.Authorization).toBeUndefined();
  });

  it('interceptor preserva headers existentes na config', async () => {
    localStorage.setItem('token', 'tok');
    const { default: api } = await import('../../services/api');

    const fakeConfig = { headers: { 'X-Custom': 'valor' } };
    const interceptorFn = api.interceptors.request.handlers[0].fulfilled;
    const resultado = interceptorFn(fakeConfig);

    expect(resultado.headers['X-Custom']).toBe('valor');
    expect(resultado.headers.Authorization).toBe('Bearer tok');
  });

  it('interceptor retorna o config modificado', async () => {
    localStorage.setItem('token', 'abc');
    const { default: api } = await import('../../services/api');

    const fakeConfig = { headers: {} };
    const interceptorFn = api.interceptors.request.handlers[0].fulfilled;
    const resultado = interceptorFn(fakeConfig);

    expect(resultado).toBeDefined();
    expect(typeof resultado).toBe('object');
  });
});
