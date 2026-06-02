// src/tests/__mocks__/api.js
// Importar nos testes: import api from '../__mocks__/api'
// ou colocar em src/__mocks__/services/api.js para auto-mock do Vitest

import { vi } from 'vitest';

const api = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  put: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

export default api;
