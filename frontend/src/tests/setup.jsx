// src/tests/setup.jsx
// Executado antes de cada arquivo de teste pelo Vitest
import React from 'react';
import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest'; 

// ─── Mock global do localStorage (Seguro para JSDOM) ─────────────────────────
// JSDOM possui localStorage nativo não-configurável. Sobrescrevemos os métodos do protótipo
const storeMock = new Map();

vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => storeMock.get(key) ?? null);
vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation((key, value) => storeMock.set(key, String(value)));
vi.spyOn(window.localStorage.__proto__, 'removeItem').mockImplementation((key) => storeMock.delete(key));
vi.spyOn(window.localStorage.__proto__, 'clear').mockImplementation(() => storeMock.clear());

// ─── Mock global do navigator.geolocation ────────────────────────────────────
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success) =>
      success({ coords: { latitude: -8.05, longitude: -34.88 } })
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
  writable: true,
  configurable: true
});

// ─── Mock do SignalR ──────────────────────────────────────────────────────────
vi.mock('@microsoft/signalr', () => {
  const mockConnection = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    state: 'Disconnected',
  };

  return {
    HubConnectionBuilder: vi.fn(() => ({
      withUrl: vi.fn().mockReturnThis(),
      withAutomaticReconnect: vi.fn().mockReturnThis(),
      build: vi.fn(() => mockConnection),
    })),
    HttpTransportType: { WebSockets: 1 },
    HubConnectionState: { Connected: 'Connected', Disconnected: 'Disconnected' },
  };
});

// ─── Mock de QRCodeSVG (qrcode.react) ────────────────────────────────────────
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }) => React.createElement('svg', { 'data-testid': 'qr-code', 'data-value': value }),
}));

// ─── Mock do Google Maps ──────────────────────────────────────────────────────
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }) => children,
  Map: ({ children, onClick }) => 
    React.createElement('div', { 'data-testid': 'google-map', onClick }, children),
  Marker: ({ position }) => 
    React.createElement('div', { 'data-testid': 'map-marker', 'data-lat': position?.lat, 'data-lng': position?.lng })
}));

// ─── Silencia console.warn e console.error nos testes ────────────────────────
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  storeMock.clear(); 
});