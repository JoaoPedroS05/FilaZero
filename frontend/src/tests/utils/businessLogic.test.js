// src/tests/utils/businessLogic.test.js
import { describe, it, expect } from 'vitest';

/**
 * Testa funções de lógica pura extraídas dos componentes.
 * Nenhuma dependência de DOM ou React — apenas JavaScript puro.
 */

// ─── Formatação do cronômetro regressivo (FilaVirtual) ────────────────────────

function formatarCronometro(totalSegundos) {
  if (totalSegundos === undefined || totalSegundos === null) return 'Calculando...';
  if (totalSegundos <= 0) return 'A qualquer momento... 🚨';
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

describe('formatarCronometro', () => {
  it('retorna "Calculando..." para undefined', () => {
    expect(formatarCronometro(undefined)).toBe('Calculando...');
  });

  it('retorna "Calculando..." para null', () => {
    expect(formatarCronometro(null)).toBe('Calculando...');
  });

  it('retorna alerta de urgência para zero', () => {
    expect(formatarCronometro(0)).toBe('A qualquer momento... 🚨');
  });

  it('retorna alerta de urgência para valores negativos', () => {
    expect(formatarCronometro(-5)).toBe('A qualquer momento... 🚨');
  });

  it('formata 60 segundos como 01:00', () => {
    expect(formatarCronometro(60)).toBe('01:00');
  });

  it('formata 90 segundos como 01:30', () => {
    expect(formatarCronometro(90)).toBe('01:30');
  });

  it('formata 59 segundos como 00:59', () => {
    expect(formatarCronometro(59)).toBe('00:59');
  });

  it('formata 3600 segundos (1h) como 60:00', () => {
    expect(formatarCronometro(3600)).toBe('60:00');
  });

  it('pad com zero para minutos menores que 10', () => {
    expect(formatarCronometro(300)).toBe('05:00');
  });

  it('pad com zero para segundos menores que 10', () => {
    expect(formatarCronometro(65)).toBe('01:05');
  });

  it('formato MM:SS sempre com 2 dígitos em ambos', () => {
    expect(formatarCronometro(1)).toBe('00:01');
  });
});

// ─── Cálculo do tempo restante (ancora em DataHoraEntrada + TempoEspera) ───────

function calcularSegundosRestantes(dataHoraEntrada, tempoEsperaMinutos) {
  const stringUtc = dataHoraEntrada.endsWith('Z')
    ? dataHoraEntrada
    : `${dataHoraEntrada}Z`;
  const horarioEntrada = new Date(stringUtc);
  const horarioAtendimento = new Date(
    horarioEntrada.getTime() + tempoEsperaMinutos * 60 * 1000
  );
  return Math.round((horarioAtendimento.getTime() - Date.now()) / 1000);
}

describe('calcularSegundosRestantes', () => {
  it('retorna valor positivo para entrada recente e espera grande', () => {
    const agora = new Date().toISOString();
    const segundos = calcularSegundosRestantes(agora, 30);
    expect(segundos).toBeGreaterThan(0);
    expect(segundos).toBeLessThanOrEqual(30 * 60);
  });

  it('retorna valor negativo para entrada muito antiga', () => {
    const muitoAntiga = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 2h atrás
    const segundos = calcularSegundosRestantes(muitoAntiga, 10);
    expect(segundos).toBeLessThan(0);
  });

  it('aceita string com ou sem Z no final', () => {
    const semZ = new Date().toISOString().replace('Z', '');
    const comZ = new Date().toISOString();
    const s1 = calcularSegundosRestantes(semZ, 10);
    const s2 = calcularSegundosRestantes(comZ, 10);
    expect(Math.abs(s1 - s2)).toBeLessThan(2); // tolerância de 2 segundos
  });

  it('tempo de espera 0 retorna negativo (já passou)', () => {
    const agora = new Date(Date.now() - 1000).toISOString(); // 1s atrás
    const segundos = calcularSegundosRestantes(agora, 0);
    expect(segundos).toBeLessThanOrEqual(0);
  });
});

// ─── Normalização de role (AuthContext) ───────────────────────────────────────

function formatarRole(roleString) {
  if (!roleString) return 'User';
  const limpa = roleString.trim();
  return limpa.charAt(0).toUpperCase() + limpa.slice(1).toLowerCase();
}

describe('formatarRole', () => {
  it('null retorna "User"', () => expect(formatarRole(null)).toBe('User'));
  it('undefined retorna "User"', () => expect(formatarRole(undefined)).toBe('User'));
  it('"Admin" retorna "Admin"', () => expect(formatarRole('Admin')).toBe('Admin'));
  it('"admin" retorna "Admin"', () => expect(formatarRole('admin')).toBe('Admin'));
  it('"ADMIN" retorna "Admin"', () => expect(formatarRole('ADMIN')).toBe('Admin'));
  it('"  Admin  " (com espaços) retorna "Admin"', () => expect(formatarRole('  Admin  ')).toBe('Admin'));
  it('"user" retorna "User"', () => expect(formatarRole('user')).toBe('User'));
  it('"USER" retorna "User"', () => expect(formatarRole('USER')).toBe('User'));
  it('string vazia retorna "User"', () => expect(formatarRole('')).toBe('User'));
});

// ─── Verificação de Admin (Navbar / AdminRoute) ───────────────────────────────

function isAdmin(user) {
  return !!(user?.role?.trim().toLowerCase() === 'admin');
}

describe('isAdmin', () => {
  it('null retorna false', () => expect(isAdmin(null)).toBe(false));
  it('undefined retorna false', () => expect(isAdmin(undefined)).toBe(false));
  it('user sem role retorna false', () => expect(isAdmin({})).toBe(false));
  it('role "Admin" retorna true', () => expect(isAdmin({ role: 'Admin' })).toBe(true));
  it('role "admin" retorna true', () => expect(isAdmin({ role: 'admin' })).toBe(true));
  it('role "ADMIN" retorna true', () => expect(isAdmin({ role: 'ADMIN' })).toBe(true));
  it('role "  admin  " retorna true', () => expect(isAdmin({ role: '  admin  ' })).toBe(true));
  it('role "User" retorna false', () => expect(isAdmin({ role: 'User' })).toBe(false));
  it('role "Cliente" retorna false', () => expect(isAdmin({ role: 'Cliente' })).toBe(false));
});

// ─── Geração do prefixo de senha (FilaController espelhado no front) ──────────

function gerarPrefixo(nomeFila) {
  return nomeFila.length >= 3
    ? nomeFila.substring(0, 3).toUpperCase()
    : 'FIL';
}

describe('gerarPrefixo da senha', () => {
  it('"Triagem" → "TRI"', () => expect(gerarPrefixo('Triagem')).toBe('TRI'));
  it('"Farmácia" → "FAR"', () => expect(gerarPrefixo('Farmácia')).toBe('FAR'));
  it('"AB" (< 3 chars) → "FIL"', () => expect(gerarPrefixo('AB')).toBe('FIL'));
  it('"Lab" (exatamente 3) → "LAB"', () => expect(gerarPrefixo('Lab')).toBe('LAB'));
  it('minúsculas são convertidas → "FAR"', () => expect(gerarPrefixo('farmácia')).toBe('FAR'));
  it('string vazia → "FIL"', () => expect(gerarPrefixo('')).toBe('FIL'));
});

// ─── Normalização de campos do deslocamento (FilaVirtual) ─────────────────────

function normalizarDeslocamento(data) {
  return {
    distanciaKm:              data.distanciaKm              ?? data.DistanciaKm              ?? '0.0',
    tempoDeslocamentoMinutos: data.tempoDeslocamentoMinutos ?? data.TempoDeslocamentoMinutos ?? '0',
    recomendacao:             data.recomendacao             ?? data.Recomendacao             ?? 'Acompanhe seu trajeto.',
    deveSairAgora:            data.deveSairAgora            ?? data.DeveSairAgora            ?? false,
  };
}

describe('normalizarDeslocamento', () => {
  it('usa campos camelCase quando disponíveis', () => {
    const d = normalizarDeslocamento({
      distanciaKm: 3.5,
      tempoDeslocamentoMinutos: 7,
      recomendacao: 'Fique tranquilo.',
      deveSairAgora: false,
    });
    expect(d.distanciaKm).toBe(3.5);
    expect(d.tempoDeslocamentoMinutos).toBe(7);
    expect(d.recomendacao).toBe('Fique tranquilo.');
    expect(d.deveSairAgora).toBe(false);
  });

  it('usa campos PascalCase como fallback', () => {
    const d = normalizarDeslocamento({
      DistanciaKm: 5.0,
      TempoDeslocamentoMinutos: 10,
      Recomendacao: 'Saia agora!',
      DeveSairAgora: true,
    });
    expect(d.distanciaKm).toBe(5.0);
    expect(d.tempoDeslocamentoMinutos).toBe(10);
    expect(d.recomendacao).toBe('Saia agora!');
    expect(d.deveSairAgora).toBe(true);
  });

  it('usa defaults quando nenhum campo está presente', () => {
    const d = normalizarDeslocamento({});
    expect(d.distanciaKm).toBe('0.0');
    expect(d.tempoDeslocamentoMinutos).toBe('0');
    expect(d.recomendacao).toBe('Acompanhe seu trajeto.');
    expect(d.deveSairAgora).toBe(false);
  });

  it('deveSairAgora false não usa default true', () => {
    const d = normalizarDeslocamento({ deveSairAgora: false });
    expect(d.deveSairAgora).toBe(false);
  });
});
